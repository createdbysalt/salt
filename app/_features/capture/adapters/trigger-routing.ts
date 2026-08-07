import "server-only";

/**
 * DB-driven webhook → adapter routing (capture-pipeline repair Phase 5).
 *
 * The code-built trigger-slug map in registry.ts only knows providers listed
 * in listCategoryAdapters(), so a connector enabled purely via DB rows got its
 * webhooks acked `no_adapter`. This resolver routes from the DB instead:
 *
 *   trigger_slug → connector_trigger_types (toolkit_slug)
 *               → connector registry (provider_key, capture_category)
 *               → category adapter
 *
 * `capture_category` lives on connector_overrides (Salt-curated, never
 * overwritten by the nightly Composio sync) — NOT connector_catalog.category,
 * which holds Composio's marketplace category ("recommended", "files", ...).
 *
 * The code-built map stays as the fallback for resilience (DB outage, or a
 * slug that predates catalog sync). Trigger-slug rows are cached 5 minutes,
 * same policy as connector-registry.ts.
 */

import { createAdminClient } from "@/app/_lib/supabase/admin";
import { getConnectorRegistry } from "@/app/_lib/composio/connector-registry";
import type { ConnectorCategory } from "@/app/_lib/composio/enrichment/types";
import type { CaptureAdapter } from "./types";
import { adapterForTriggerSlug } from "./registry";
import { getAdapterForCategory } from "./categories";

const KNOWN_CATEGORIES: ReadonlySet<string> = new Set([
  "email",
  "calendar",
  "billing",
  "crm",
  "meetings",
  "documents",
  "storage",
  "project_management",
  "communication",
] satisfies ConnectorCategory[]);

interface TriggerTypeCache {
  toolkitBySlug: Map<string, string>;
  expiresAt: number;
}

const CACHE_TTL_MS = 5 * 60_000;
let cache: TriggerTypeCache | null = null;

export function invalidateTriggerRouteCache(): void {
  cache = null;
}

async function loadToolkitBySlug(): Promise<Map<string, string>> {
  if (cache && cache.expiresAt > Date.now()) {
    return cache.toolkitBySlug;
  }

  const admin = createAdminClient();
  // All synced trigger types, not just enabled_for_capture: a lingering
  // trigger instance for a since-disabled slug should still route — the
  // ingest gates (capture_enabled check, noise gates) own the drop decision.
  const { data, error } = await admin
    .from("connector_trigger_types")
    .select("trigger_slug, toolkit_slug");

  if (error) {
    console.error("[trigger-routing] trigger type load failed:", error.message);
    if (cache) return cache.toolkitBySlug;
    throw new Error(`Trigger routes unavailable: ${error.message}`);
  }

  const toolkitBySlug = new Map<string, string>(
    (data ?? []).map((row) => [row.trigger_slug, row.toolkit_slug]),
  );
  cache = { toolkitBySlug, expiresAt: Date.now() + CACHE_TTL_MS };
  return toolkitBySlug;
}

/**
 * Resolve the capture adapter for a webhook trigger slug: DB routes first,
 * code-built map as fallback. Never throws — an unroutable slug returns null
 * so the webhook ingress can ack it as `no_adapter`.
 */
export async function resolveAdapterForTriggerSlug(
  slug: string,
): Promise<CaptureAdapter | null> {
  try {
    const [toolkitBySlug, registry] = await Promise.all([
      loadToolkitBySlug(),
      getConnectorRegistry(),
    ]);
    const toolkit = toolkitBySlug.get(slug);
    if (toolkit) {
      for (const entry of registry.values()) {
        if (entry.toolkitSlug !== toolkit) continue;
        if (
          entry.captureCategory &&
          KNOWN_CATEGORIES.has(entry.captureCategory)
        ) {
          return getAdapterForCategory(
            entry.captureCategory as ConnectorCategory,
            entry.providerKey,
          );
        }
        break;
      }
    }
  } catch (error) {
    console.error(
      "[trigger-routing] DB resolution failed, using code fallback:",
      error instanceof Error ? error.message : error,
    );
  }
  return adapterForTriggerSlug(slug);
}
