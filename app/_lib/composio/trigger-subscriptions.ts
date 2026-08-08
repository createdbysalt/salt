import "server-only";

import { createAdminClient } from "@/app/_lib/supabase/admin";
import { adapterForToolkit } from "@/app/_features/capture/adapters/registry";
import { applyScopeToSpecs, readCaptureScope } from "./capture-scope";
import { getComposioClient } from "./client";

/**
 * Trigger-subscription lifecycle (scalable-connectors Phase 2).
 *
 * Trigger instances are created when the user flips capture ON for a
 * connection and deleted when they flip it OFF — never at connect. That
 * keeps "connected" and "feeding my memory" separate consents. Instance ids
 * are remembered in workspace_integrations.config.captureTriggerIds so
 * disable can delete exactly what enable created.
 *
 * Trigger slugs now come from connector_trigger_types.enabled_for_capture
 * in the database, replacing the hardcoded triggerSlugs in adapters.
 */

interface TriggersApi {
  create(
    userId: string,
    slug: string,
    options: { connectedAccountId?: string; triggerConfig?: Record<string, unknown> }
  ): Promise<{ triggerId: string }>;
  delete(triggerId: string): Promise<unknown>;
  listActive(query?: { limit?: number; cursor?: string }): Promise<{
    items?: Array<{
      id?: string;
      connectedAccountId?: string;
      triggerName?: string;
    }>;
    nextCursor?: string | null;
  }>;
}

function triggersApi(): TriggersApi {
  return getComposioClient().triggers as unknown as TriggersApi;
}

function configWith(
  config: Record<string, unknown> | null,
  captureTriggerIds: string[] | null
): Record<string, unknown> {
  const base = config && typeof config === "object" ? { ...config } : {};
  if (captureTriggerIds === null) {
    delete base.captureTriggerIds;
  } else {
    base.captureTriggerIds = captureTriggerIds;
  }
  return base;
}

/**
 * A trigger slug plus the Salt-curated Composio triggerConfig to subscribe
 * with (capture-pipeline repair, Phase 6). The config carries upstream
 * filters (Gmail category query, Slack bot filter) so noise events never
 * fire a webhook at all. Sourced from
 * connector_trigger_types.capture_trigger_config — NULL means no filters.
 */
export interface CaptureTriggerSpec {
  slug: string;
  config: Record<string, unknown> | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function adapterFallbackSpecs(toolkitSlug: string): Promise<CaptureTriggerSpec[]> {
  const adapter = await adapterForToolkit(toolkitSlug);
  return (adapter?.triggerSlugs ?? []).map((slug) => ({ slug, config: null }));
}

/**
 * Get trigger specs (slug + upstream filter config) enabled for capture from
 * the database. Falls back to adapter.triggerSlugs (no filters) if the DB
 * lookup fails (backward compat).
 */
export async function getCaptureTriggerSpecs(toolkitSlug: string): Promise<CaptureTriggerSpec[]> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("connector_trigger_types")
      .select("trigger_slug, capture_trigger_config")
      .eq("toolkit_slug", toolkitSlug)
      .eq("enabled_for_capture", true)
      .eq("sync_status", "active");

    if (error) {
      console.error("[trigger-subscriptions] DB lookup failed for %s:", toolkitSlug, error.message);
      return adapterFallbackSpecs(toolkitSlug);
    }

    if (data && data.length > 0) {
      return data.map((row) => ({
        slug: row.trigger_slug,
        config: isRecord(row.capture_trigger_config) ? row.capture_trigger_config : null,
      }));
    }

    // If DB returns empty but migration hasn't run, fall back to adapter
    return adapterFallbackSpecs(toolkitSlug);
  } catch (error) {
    console.error(
      "[trigger-subscriptions] getCaptureTriggerSpecs threw for %s:",
      toolkitSlug,
      error
    );
    return adapterFallbackSpecs(toolkitSlug);
  }
}

/**
 * Get trigger slugs enabled for capture from the database.
 * Falls back to adapter.triggerSlugs if DB lookup fails (backward compat).
 *
 * Exported so trigger reconciliation computes coverage from the same
 * source of truth the enable path subscribes with.
 */
export async function getCaptureTriggerSlugs(toolkitSlug: string): Promise<readonly string[]> {
  const specs = await getCaptureTriggerSpecs(toolkitSlug);
  return specs.map((spec) => spec.slug);
}

export interface CaptureTriggerResult {
  ok: boolean;
  created?: string[];
  error?: string;
}

/**
 * Alert when a subscription falls to the bare rung despite having a filter
 * config (Sources plan 3.2): an unfiltered subscription is a billing leak —
 * every upstream event fires a (billed) webhook delivery. Surfaced as a
 * connector_sync_events row so it shows up next to webhook outcomes and
 * trigger-disabled drift. Throttled to one row per workspace+slug per day;
 * fire-safe, never breaks subscribe.
 */
async function alertTriggerFilterDropped(workspaceId: string, slug: string): Promise<void> {
  try {
    const admin = createAdminClient();
    const throttleCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: recent } = await admin
      .from("connector_sync_events")
      .select("id")
      .eq("kind", "sync_failed")
      .eq("subject_slug", slug)
      .eq("detail->>stage", "trigger_filter_dropped")
      .eq("detail->>workspaceId", workspaceId)
      .gte("created_at", throttleCutoff)
      .limit(1);
    if (recent && recent.length > 0) return;

    await admin.from("connector_sync_events").insert({
      kind: "sync_failed",
      subject_slug: slug,
      detail: {
        stage: "trigger_filter_dropped",
        workspaceId,
        note: "Subscribed UNFILTERED — Composio rejected the capture_trigger_config; every upstream event now bills a delivery",
      } as never,
    });
  } catch (error) {
    console.warn("[capture-triggers] failed to record filter-dropped alert", {
      slug,
      error,
    });
  }
}

/**
 * True only for the Stainless APIError 400 the upsert returns when it
 * rejects the triggerConfig. Composio's own typed errors carry `statusCode`,
 * not `status`, so a dead slug (ComposioTriggerTypeNotFoundError) or
 * client-side ValidationError never matches this.
 */
function isTriggerConfigRejection(error: unknown): boolean {
  return (
    typeof error === "object" && error !== null && (error as { status?: unknown }).status === 400
  );
}

/**
 * Create one trigger instance with the spec's upstream filter config.
 *
 * Fallback ladder (config schemas vary per trigger and Composio rejects
 * unknown keys with a 400):
 *   1. { interval: 1, ...config } — polling triggers on Salt's own OAuth
 *      client support 1-minute intervals
 *   2. { ...config } — keep the filters, drop the interval
 *   3. bare — last resort; an unfiltered subscription beats none, but the
 *      drop from step 1/2 is logged so a silently-lost filter is visible
 *
 * Only a 400 from the upsert (config rejection) advances the ladder
 * (post-0.14 review, plan 3.7): the SDK now pre-flights every create with a
 * getType lookup and throws typed ComposioTriggerTypeNotFoundError /
 * ValidationError, and auth/5xx/network failures would fail every rung
 * identically — climbing on those would triple the API calls and could land
 * a degraded unfiltered subscription on a transient blip. Non-400s throw.
 *
 * Shared by enableCaptureTriggers and trigger reconciliation so both paths
 * create identical subscriptions.
 */
export async function createCaptureTriggerInstance(
  workspaceId: string,
  spec: CaptureTriggerSpec,
  connectedAccountId: string
): Promise<{ triggerId: string }> {
  const triggers = triggersApi();
  const config = spec.config ?? {};

  try {
    return await triggers.create(workspaceId, spec.slug, {
      connectedAccountId,
      triggerConfig: { interval: 1, ...config },
    });
  } catch (error) {
    if (!isTriggerConfigRejection(error)) throw error;
  }

  if (Object.keys(config).length > 0) {
    try {
      return await triggers.create(workspaceId, spec.slug, {
        connectedAccountId,
        triggerConfig: config,
      });
    } catch (error) {
      if (!isTriggerConfigRejection(error)) throw error;
      console.warn(
        "[capture-triggers] trigger config rejected; subscribing unfiltered:",
        spec.slug
      );
      // A silently unfiltered subscription is a billing leak — alert.
      await alertTriggerFilterDropped(workspaceId, spec.slug);
    }
  }

  return triggers.create(workspaceId, spec.slug, { connectedAccountId });
}

/**
 * Create trigger instances for a connection. Idempotent-ish:
 * Composio upserts trigger instances per (account, slug), and our envelope
 * dedupe makes double-delivery harmless anyway.
 *
 * Trigger slugs come from connector_trigger_types.enabled_for_capture in DB,
 * falling back to adapter.triggerSlugs for backward compatibility.
 */
export async function enableCaptureTriggers(
  workspaceId: string,
  provider: string
): Promise<CaptureTriggerResult> {
  // Check if we have an adapter for this provider's category
  const adapter = await adapterForToolkit(provider);
  if (!adapter) {
    // Action-only connector: capture toggle shouldn't be reachable, but a
    // missing adapter is not an error worth failing the toggle for.
    return { ok: true, created: [] };
  }

  // Get enabled triggers from DB (falls back to adapter.triggerSlugs)
  const globalSpecs = await getCaptureTriggerSpecs(provider);
  if (globalSpecs.length === 0) {
    // No triggers configured — backfill-only connector
    return { ok: true, created: [] };
  }

  const admin = createAdminClient();
  const { data: integration } = await admin
    .from("workspace_integrations")
    .select("id, composio_connection_id, config")
    .eq("workspace_id", workspaceId)
    .eq("provider", provider)
    .maybeSingle();

  if (!integration?.composio_connection_id) {
    return { ok: false, error: "Connection not found" };
  }

  // 4.5: a scoped connection re-subscribes scoped — disable→enable must not
  // silently widen the user back to unfiltered delivery.
  const triggerSpecs = applyScopeToSpecs(
    provider,
    globalSpecs,
    readCaptureScope(integration.config),
  );

  const triggers = triggersApi();
  const created: string[] = [];
  for (const spec of triggerSpecs) {
    try {
      const result = await createCaptureTriggerInstance(
        workspaceId,
        spec,
        integration.composio_connection_id
      );
      created.push(result.triggerId);
    } catch (error) {
      console.error(
        "[capture-triggers] create failed for slug/provider:",
        spec.slug,
        provider,
        error
      );
      // Roll back anything we created so enable is all-or-nothing.
      for (const triggerId of created) {
        try {
          await triggers.delete(triggerId);
        } catch {
          // best effort
        }
      }
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Trigger creation failed",
      };
    }
  }

  await admin
    .from("workspace_integrations")
    .update({
      config: configWith(integration.config as Record<string, unknown> | null, created) as never,
    })
    .eq("id", integration.id);

  return { ok: true, created };
}

/** Delete the trigger instances enable created (best effort, always clears state). */
export async function disableCaptureTriggers(
  workspaceId: string,
  provider: string
): Promise<CaptureTriggerResult> {
  const admin = createAdminClient();
  const { data: integration } = await admin
    .from("workspace_integrations")
    .select("id, config")
    .eq("workspace_id", workspaceId)
    .eq("provider", provider)
    .maybeSingle();

  if (!integration) {
    return { ok: true };
  }

  const config = integration.config as Record<string, unknown> | null;
  const triggerIds = Array.isArray(config?.captureTriggerIds)
    ? (config.captureTriggerIds as unknown[]).filter((id): id is string => typeof id === "string")
    : [];

  const triggers = triggersApi();
  for (const triggerId of triggerIds) {
    try {
      await triggers.delete(triggerId);
    } catch (error) {
      // The webhook ingress also refuses capture_disabled connections, so a
      // lingering instance cannot ingest — deletion is cleanup, not safety.
      console.warn(`[capture-triggers] delete failed for ${triggerId}:`, error);
    }
  }

  await admin
    .from("workspace_integrations")
    .update({ config: configWith(config, null) as never })
    .eq("id", integration.id);

  return { ok: true };
}

// ============================================================================
// Trigger-config updates (Sources plan 4.2)
// ============================================================================

const LIST_PAGE_LIMIT = 100;
const LIST_MAX_PAGES = 50;

/**
 * Live instances for one (connection, slug) pair. Stored captureTriggerIds
 * is a flat array with no slug mapping, so the only way to know which
 * instance belongs to a slug is to ask Composio.
 */
async function listLiveInstancesForSlug(
  connectedAccountId: string,
  slug: string
): Promise<string[]> {
  const triggers = triggersApi();
  const ids: string[] = [];
  let cursor: string | undefined;

  for (let page = 0; page < LIST_MAX_PAGES; page++) {
    const response = await triggers.listActive({
      limit: LIST_PAGE_LIMIT,
      ...(cursor ? { cursor } : {}),
    });
    for (const item of response.items ?? []) {
      if (
        item.id &&
        item.connectedAccountId === connectedAccountId &&
        item.triggerName?.toUpperCase() === slug.toUpperCase()
      ) {
        ids.push(item.id);
      }
    }
    cursor = response.nextCursor ?? undefined;
    if (!cursor) break;
  }

  return ids;
}

export interface UpsertTriggerConfigResult {
  ok: boolean;
  /** The instance id the upsert returned — always the one now stored. */
  triggerId?: string;
  /** Stale same-slug instances deleted after the upsert (id rotation, dupes). */
  removedStaleIds: string[];
  error?: string;
}

/**
 * Apply a (possibly changed) trigger config to a live subscription WITHOUT
 * delete+recreate. `triggers.create` upserts per (account, slug), so the new
 * config applies in place with no delivery gap.
 *
 * Safety contract:
 * - Re-stores the returned trigger_id every time — the upsert may rotate it.
 * - Deletes any OTHER live instance for the same slug on this account
 *   (rotated-out predecessor or out-of-band duplicate would double-deliver).
 * - Reconciles config.captureTriggerIds: drops successfully-deleted stale
 *   ids, adopts the fresh id, leaves other slugs' ids untouched. Ids whose
 *   delete failed stay stored so disable/reconciliation can retry them.
 *
 * Filter evolution path: update connector_trigger_types.capture_trigger_config
 * (global) or build a scoped spec (4.5 per-connector UI), then call this.
 */
export async function upsertCaptureTriggerConfig(
  workspaceId: string,
  provider: string,
  spec: CaptureTriggerSpec
): Promise<UpsertTriggerConfigResult> {
  const admin = createAdminClient();
  const { data: integration } = await admin
    .from("workspace_integrations")
    .select("id, composio_connection_id, config")
    .eq("workspace_id", workspaceId)
    .eq("provider", provider)
    .maybeSingle();

  if (!integration?.composio_connection_id) {
    return { ok: false, removedStaleIds: [], error: "Connection not found" };
  }

  let triggerId: string;
  try {
    const created = await createCaptureTriggerInstance(
      workspaceId,
      spec,
      integration.composio_connection_id
    );
    triggerId = created.triggerId;
  } catch (error) {
    return {
      ok: false,
      removedStaleIds: [],
      error: error instanceof Error ? error.message : "Trigger upsert failed",
    };
  }

  // Stale-instance cleanup is best effort: if listing fails, the upsert
  // still landed — skip deletion and keep every stored id so nothing live
  // becomes untracked.
  let liveIds: string[] = [];
  try {
    liveIds = await listLiveInstancesForSlug(integration.composio_connection_id, spec.slug);
  } catch (error) {
    console.warn(
      `[capture-triggers] listActive failed during upsert reconcile for ${spec.slug}:`,
      error
    );
  }

  const triggers = triggersApi();
  const removedStaleIds: string[] = [];
  for (const staleId of liveIds.filter((id) => id !== triggerId)) {
    try {
      await triggers.delete(staleId);
      removedStaleIds.push(staleId);
    } catch (error) {
      console.warn(`[capture-triggers] stale instance delete failed for ${staleId}:`, error);
    }
  }

  const config = (integration.config ?? {}) as Record<string, unknown>;
  const storedIds = Array.isArray(config.captureTriggerIds)
    ? (config.captureTriggerIds as unknown[]).filter((id): id is string => typeof id === "string")
    : [];

  const nextIds = storedIds.filter((id) => !removedStaleIds.includes(id));
  if (!nextIds.includes(triggerId)) nextIds.push(triggerId);

  const changed =
    nextIds.length !== storedIds.length || !nextIds.every((id) => storedIds.includes(id));
  if (changed) {
    await admin
      .from("workspace_integrations")
      .update({
        config: { ...config, captureTriggerIds: nextIds } as never,
      })
      .eq("id", integration.id);
  }

  return { ok: true, triggerId, removedStaleIds };
}

export interface RefreshTriggerConfigsResult {
  ok: boolean;
  results: Array<{ slug: string; triggerId?: string; error?: string }>;
}

/**
 * Re-upsert every enabled capture trigger for a provider with its current DB
 * config. The push path for global filter evolution: edit
 * connector_trigger_types.capture_trigger_config, then refresh each
 * connected workspace (per-slug failures are isolated, never block the rest).
 */
export async function refreshCaptureTriggerConfigs(
  workspaceId: string,
  provider: string
): Promise<RefreshTriggerConfigsResult> {
  const specs = await getCaptureTriggerSpecs(provider);
  const results: RefreshTriggerConfigsResult["results"] = [];

  for (const spec of specs) {
    const result = await upsertCaptureTriggerConfig(workspaceId, provider, spec);
    results.push({
      slug: spec.slug,
      triggerId: result.triggerId,
      error: result.error,
    });
  }

  return { ok: results.every((r) => !r.error), results };
}
