import "server-only";

import { createAdminClient } from "@/app/_lib/supabase/admin";
import { adapterForToolkit } from "@/app/_features/capture/adapters/registry";
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
    options: { connectedAccountId?: string; triggerConfig?: Record<string, unknown> },
  ): Promise<{ triggerId: string }>;
  delete(triggerId: string): Promise<unknown>;
}

function triggersApi(): TriggersApi {
  return getComposioClient().triggers as unknown as TriggersApi;
}

function configWith(
  config: Record<string, unknown> | null,
  captureTriggerIds: string[] | null,
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

function adapterFallbackSpecs(toolkitSlug: string): CaptureTriggerSpec[] {
  const adapter = adapterForToolkit(toolkitSlug);
  return (adapter?.triggerSlugs ?? []).map((slug) => ({ slug, config: null }));
}

/**
 * Get trigger specs (slug + upstream filter config) enabled for capture from
 * the database. Falls back to adapter.triggerSlugs (no filters) if the DB
 * lookup fails (backward compat).
 */
export async function getCaptureTriggerSpecs(
  toolkitSlug: string,
): Promise<CaptureTriggerSpec[]> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("connector_trigger_types")
      .select("trigger_slug, capture_trigger_config")
      .eq("toolkit_slug", toolkitSlug)
      .eq("enabled_for_capture", true)
      .eq("sync_status", "active");

    if (error) {
      console.error(
        "[trigger-subscriptions] DB lookup failed for %s:",
        toolkitSlug,
        error.message,
      );
      return adapterFallbackSpecs(toolkitSlug);
    }

    if (data && data.length > 0) {
      return data.map((row) => ({
        slug: row.trigger_slug,
        config: isRecord(row.capture_trigger_config)
          ? row.capture_trigger_config
          : null,
      }));
    }

    // If DB returns empty but migration hasn't run, fall back to adapter
    return adapterFallbackSpecs(toolkitSlug);
  } catch (error) {
    console.error(
      "[trigger-subscriptions] getCaptureTriggerSpecs threw for %s:",
      toolkitSlug,
      error,
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
export async function getCaptureTriggerSlugs(
  toolkitSlug: string,
): Promise<readonly string[]> {
  const specs = await getCaptureTriggerSpecs(toolkitSlug);
  return specs.map((spec) => spec.slug);
}

export interface CaptureTriggerResult {
  ok: boolean;
  created?: string[];
  error?: string;
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
 * Shared by enableCaptureTriggers and trigger reconciliation so both paths
 * create identical subscriptions.
 */
export async function createCaptureTriggerInstance(
  workspaceId: string,
  spec: CaptureTriggerSpec,
  connectedAccountId: string,
): Promise<{ triggerId: string }> {
  const triggers = triggersApi();
  const config = spec.config ?? {};

  try {
    return await triggers.create(workspaceId, spec.slug, {
      connectedAccountId,
      triggerConfig: { interval: 1, ...config },
    });
  } catch {
    // fall through to the next rung
  }

  if (Object.keys(config).length > 0) {
    try {
      return await triggers.create(workspaceId, spec.slug, {
        connectedAccountId,
        triggerConfig: config,
      });
    } catch {
      console.warn(
        "[capture-triggers] trigger config rejected; subscribing unfiltered:",
        spec.slug,
      );
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
  provider: string,
): Promise<CaptureTriggerResult> {
  // Check if we have an adapter for this provider's category
  const adapter = adapterForToolkit(provider);
  if (!adapter) {
    // Action-only connector: capture toggle shouldn't be reachable, but a
    // missing adapter is not an error worth failing the toggle for.
    return { ok: true, created: [] };
  }

  // Get enabled triggers from DB (falls back to adapter.triggerSlugs)
  const triggerSpecs = await getCaptureTriggerSpecs(provider);
  if (triggerSpecs.length === 0) {
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

  const triggers = triggersApi();
  const created: string[] = [];
  for (const spec of triggerSpecs) {
    try {
      const result = await createCaptureTriggerInstance(
        workspaceId,
        spec,
        integration.composio_connection_id,
      );
      created.push(result.triggerId);
    } catch (error) {
      console.error(
        "[capture-triggers] create failed for slug/provider:",
        spec.slug,
        provider,
        error,
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
      config: configWith(
        integration.config as Record<string, unknown> | null,
        created,
      ) as never,
    })
    .eq("id", integration.id);

  return { ok: true, created };
}

/** Delete the trigger instances enable created (best effort, always clears state). */
export async function disableCaptureTriggers(
  workspaceId: string,
  provider: string,
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
    ? (config.captureTriggerIds as unknown[]).filter(
        (id): id is string => typeof id === "string",
      )
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
