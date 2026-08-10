import "server-only";

import { createAdminClient } from "@/app/_lib/supabase/admin";
import type { Json } from "@/app/_lib/supabase/database.types";
import { getComposioClient } from "./client";
import { invalidateClassificationCache } from "./classification-store";
import { schemaHash, stableStringify } from "./catalog-sync-hash";
import { classifyToolByHeuristic } from "./tool-classification-heuristics";

/**
 * Composio catalog sync + drift detection (connector-platform Phase 2.2).
 *
 * Composio's catalog is the source of truth; this job mirrors it into
 * connector_catalog / connector_tools / connector_trigger_types and treats
 * drift as an event, never a runtime surprise:
 *   - tool removed/renamed  → sync_status 'removed' + approved classification
 *     DISABLED + connector_sync_events row
 *   - input/output schema changed → sync_status 'changed' + approved
 *     classification DISABLED (needs re-review) + event
 *   - new tool → connector_tools row + an 'unclassified' classification row
 *     (unusable until reviewed) + event
 *   - trigger payload/config schema changed → sync_status 'changed' +
 *     'trigger_schema_changed' event flagged with enabledForCapture so drift
 *     on a capture-subscribed trigger (whose normalizer parses that shape)
 *     is distinguishable from long-tail noise (Sources plan 5.8)
 *
 * Shallow sync (toolkit metadata) covers every catalog provider; deep sync
 * (tools + triggers) only providers whose override tier is action/capture —
 * the long tail stays catalog_only and costs nothing per connector.
 */

export interface CatalogSyncEvent {
  kind:
    | "toolkit_removed"
    | "tool_added"
    | "tool_removed"
    | "tool_schema_changed"
    | "trigger_added"
    | "trigger_removed"
    | "trigger_schema_changed"
    | "classification_disabled"
    | "sync_failed";
  subjectSlug: string;
  detail?: Record<string, unknown>;
}

export interface CatalogSyncResult {
  toolkitsSynced: number;
  toolsSynced: number;
  triggersSynced: number;
  events: CatalogSyncEvent[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Salt-owned meta keys, written by the seed (generate-connector-seed.ts) and
 * read by connector-registry.ts. The sync must never clobber these — the raw
 * Composio toolkit payload is nested under meta.composio instead. (The first
 * live sync on 2026-07-06 replaced meta wholesale and every connector
 * vanished from the catalog UI: showInCatalog was gone.)
 */
const SALT_META_KEYS = [
  "catalogId",
  "phase",
  "showInCatalog",
  "connectHelp",
  "nativeBadge",
  "seededFrom",
] as const;

function preserveSaltMeta(existing: unknown): Record<string, unknown> {
  const existingMeta = isRecord(existing) ? existing : {};
  const preserved: Record<string, unknown> = {};
  for (const key of SALT_META_KEYS) {
    if (key in existingMeta) preserved[key] = existingMeta[key];
  }
  return preserved;
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += limit) {
    const chunk = items.slice(i, i + limit);
    results.push(...(await Promise.all(chunk.map(fn))));
  }
  return results;
}

interface SyncTarget {
  providerKey: string;
  toolkitSlug: string;
  deep: boolean;
}

export async function runCatalogSync(): Promise<CatalogSyncResult> {
  const supabase = createAdminClient();
  const composio = getComposioClient();
  const events: CatalogSyncEvent[] = [];
  const now = new Date().toISOString();

  const { data: catalogRows, error: catalogError } = await supabase
    .from("connector_catalog")
    .select("provider_key, toolkit_slug, name, description, meta");
  if (catalogError) {
    throw new Error(`catalog read failed: ${catalogError.message}`);
  }
  const existingByProvider = new Map(
    (catalogRows ?? []).map((row) => [row.provider_key, row] as const),
  );

  const { data: overrideRows, error: overrideError } = await supabase
    .from("connector_overrides")
    .select("provider_key, tier");
  if (overrideError) {
    throw new Error(`overrides read failed: ${overrideError.message}`);
  }
  const tierByProvider = new Map(
    (overrideRows ?? []).map((row) => [row.provider_key, row.tier] as const),
  );

  const targets: SyncTarget[] = (catalogRows ?? []).map((row) => ({
    providerKey: row.provider_key,
    toolkitSlug: row.toolkit_slug,
    deep: tierByProvider.get(row.provider_key) !== "catalog_only",
  }));

  let toolkitsSynced = 0;
  let toolsSynced = 0;
  let triggersSynced = 0;

  await mapWithConcurrency(targets, 5, async (target) => {
    // ── Shallow: toolkit metadata ──
    try {
      const toolkit: unknown = await composio.toolkits.get(target.toolkitSlug);
      if (isRecord(toolkit)) {
        const meta = isRecord(toolkit.meta) ? toolkit.meta : {};
        const existing = existingByProvider.get(target.providerKey);
        // Curated copy wins: only fill name/description from Composio when
        // the row has none. Salt meta keys survive; raw payload nests.
        await supabase
          .from("connector_catalog")
          .update({
            name: str(existing?.name) ?? str(toolkit.name) ?? target.providerKey,
            description:
              str(existing?.description) ??
              str(meta.description) ??
              str(toolkit.description) ??
              undefined,
            logo_url: str(meta.logo) ?? str(toolkit.logo) ?? undefined,
            meta: {
              ...preserveSaltMeta(existing?.meta),
              composio: JSON.parse(JSON.stringify(toolkit)) as Json,
            },
            sync_status: "active",
            last_synced_at: now,
          })
          .eq("provider_key", target.providerKey);
        toolkitsSynced += 1;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (/not.?found|404/i.test(message)) {
        await supabase
          .from("connector_catalog")
          .update({ sync_status: "removed", last_synced_at: now })
          .eq("provider_key", target.providerKey);
        events.push({ kind: "toolkit_removed", subjectSlug: target.toolkitSlug });
      } else {
        events.push({
          kind: "sync_failed",
          subjectSlug: target.toolkitSlug,
          detail: { stage: "toolkit", message },
        });
      }
      return;
    }

    if (!target.deep) return;

    // ── Deep: tools ──
    try {
      const rawTools: unknown = await composio.tools.getRawComposioTools({
        toolkits: [target.toolkitSlug],
        limit: 500,
      });
      const toolList: unknown[] = Array.isArray(rawTools)
        ? rawTools
        : isRecord(rawTools) && Array.isArray(rawTools.items)
          ? rawTools.items
          : [];

      const { data: existingTools } = await supabase
        .from("connector_tools")
        .select("tool_slug, schema_hash, sync_status")
        .eq("toolkit_slug", target.toolkitSlug);
      const existingBySlug = new Map(
        (existingTools ?? []).map((row) => [row.tool_slug, row] as const),
      );
      const seen = new Set<string>();

      for (const raw of toolList) {
        if (!isRecord(raw)) continue;
        const slug = str(raw.slug);
        if (!slug) continue;
        seen.add(slug);

        const inputSchema = isRecord(raw.inputParameters)
          ? raw.inputParameters
          : null;
        const outputSchema = isRecord(raw.outputParameters)
          ? raw.outputParameters
          : null;
        const hash = schemaHash(inputSchema, outputSchema);
        const existing = existingBySlug.get(slug);
        const changed = Boolean(existing?.schema_hash) && existing?.schema_hash !== hash;

        await supabase.from("connector_tools").upsert(
          {
            tool_slug: slug,
            toolkit_slug: target.toolkitSlug,
            name: str(raw.name) ?? slug,
            description: str(raw.description) ?? "",
            input_schema: inputSchema as Json,
            output_schema: outputSchema as Json,
            required_scopes: Array.isArray(raw.scopes)
              ? (raw.scopes.filter(
                  (scope): scope is string => typeof scope === "string",
                ) as unknown as Json)
              : null,
            version: str(raw.version),
            schema_hash: hash,
            sync_status: changed ? "changed" : "active",
            last_synced_at: now,
          },
          { onConflict: "tool_slug" },
        );
        toolsSynced += 1;

        if (!existing) {
          events.push({ kind: "tool_added", subjectSlug: slug });
          // Auto-classify new tools using heuristics — immediately usable.
          // Manual overrides in the DB take precedence (ignoreDuplicates).
          const heuristic = classifyToolByHeuristic(slug);
          await supabase
            .from("tool_classifications")
            .upsert(
              {
                tool_slug: slug,
                status: "approved",
                source: "heuristic",
                risk: heuristic.risk,
                requires_human_confirmation: heuristic.requiresHumanConfirmation,
              },
              { onConflict: "tool_slug", ignoreDuplicates: true },
            );
        } else if (changed) {
          events.push({ kind: "tool_schema_changed", subjectSlug: slug });
          await disableApprovedClassification(
            supabase,
            slug,
            "Input/output schema changed upstream — re-review required",
            events,
          );
        }
      }

      // Tools gone upstream → removed + classification disabled
      for (const [slug, existing] of existingBySlug) {
        if (seen.has(slug) || existing.sync_status === "removed") continue;
        await supabase
          .from("connector_tools")
          .update({ sync_status: "removed", last_synced_at: now })
          .eq("tool_slug", slug);
        events.push({ kind: "tool_removed", subjectSlug: slug });
        await disableApprovedClassification(
          supabase,
          slug,
          "Tool removed or renamed upstream",
          events,
        );
      }
    } catch (error) {
      events.push({
        kind: "sync_failed",
        subjectSlug: target.toolkitSlug,
        detail: {
          stage: "tools",
          message: error instanceof Error ? error.message : String(error),
        },
      });
    }

    // ── Deep: trigger types ──
    try {
      const rawTriggers: unknown = await composio.triggers.listTypes({
        toolkits: [target.toolkitSlug],
      });
      const triggerList: unknown[] =
        isRecord(rawTriggers) && Array.isArray(rawTriggers.items)
          ? rawTriggers.items
          : [];

      const { data: existingTriggers } = await supabase
        .from("connector_trigger_types")
        .select("trigger_slug, sync_status, payload_schema, config_schema, enabled_for_capture")
        .eq("toolkit_slug", target.toolkitSlug);
      const existingTriggerSlugs = new Map(
        (existingTriggers ?? []).map((row) => [row.trigger_slug, row] as const),
      );
      const seenTriggers = new Set<string>();

      for (const raw of triggerList) {
        if (!isRecord(raw)) continue;
        const slug = str(raw.slug);
        if (!slug) continue;
        seenTriggers.add(slug);

        const payloadSchema = isRecord(raw.payload) ? raw.payload : null;
        const configSchema = isRecord(raw.config) ? raw.config : null;
        const existing = existingTriggerSlugs.get(slug);

        // 5.8 drift watch: compare against the stored schemas (stable
        // stringify — jsonb key order is not meaningful). A changed payload
        // schema on a capture-subscribed trigger means the normalizer may
        // now be parsing the wrong shape.
        const changedFields: string[] = [];
        if (existing) {
          if (stableStringify(existing.payload_schema ?? null) !== stableStringify(payloadSchema)) {
            changedFields.push("payload_schema");
          }
          if (stableStringify(existing.config_schema ?? null) !== stableStringify(configSchema)) {
            changedFields.push("config_schema");
          }
        }

        await supabase.from("connector_trigger_types").upsert(
          {
            trigger_slug: slug,
            toolkit_slug: target.toolkitSlug,
            name: str(raw.name) ?? slug,
            description: str(raw.description) ?? "",
            delivery: str(raw.type),
            payload_schema: payloadSchema as Json,
            config_schema: configSchema as Json,
            sync_status: changedFields.length > 0 ? "changed" : "active",
            last_synced_at: now,
          },
          { onConflict: "trigger_slug" },
        );
        triggersSynced += 1;
        if (!existing) {
          events.push({ kind: "trigger_added", subjectSlug: slug });
        } else if (changedFields.length > 0) {
          events.push({
            kind: "trigger_schema_changed",
            subjectSlug: slug,
            detail: {
              enabledForCapture: existing.enabled_for_capture === true,
              changedFields,
            },
          });
        }
      }

      for (const [slug, existing] of existingTriggerSlugs) {
        if (seenTriggers.has(slug) || existing.sync_status === "removed") continue;
        await supabase
          .from("connector_trigger_types")
          .update({ sync_status: "removed", last_synced_at: now })
          .eq("trigger_slug", slug);
        events.push({ kind: "trigger_removed", subjectSlug: slug });
      }
    } catch (error) {
      events.push({
        kind: "sync_failed",
        subjectSlug: target.toolkitSlug,
        detail: {
          stage: "triggers",
          message: error instanceof Error ? error.message : String(error),
        },
      });
    }
  });

  if (events.length > 0) {
    await supabase.from("connector_sync_events").insert(
      events.map((event) => ({
        kind: event.kind,
        subject_slug: event.subjectSlug,
        detail: (event.detail ?? {}) as never,
      })),
    );
  }

  return { toolkitsSynced, toolsSynced, triggersSynced, events };
}

async function disableApprovedClassification(
  supabase: ReturnType<typeof createAdminClient>,
  toolSlug: string,
  reason: string,
  events: CatalogSyncEvent[],
): Promise<void> {
  const { data } = await supabase
    .from("tool_classifications")
    .update({ status: "disabled", disabled_reason: reason })
    .eq("tool_slug", toolSlug)
    .eq("status", "approved")
    .select("tool_slug");

  if (data && data.length > 0) {
    invalidateClassificationCache(toolSlug);
    events.push({
      kind: "classification_disabled",
      subjectSlug: toolSlug,
      detail: { reason },
    });
  }
}
