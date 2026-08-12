import "server-only";

/**
 * Provider → capture category lookups (Sources plan 5.1).
 *
 * Source of truth: `connector_overrides.capture_category`, read through the
 * cached DB registry (connector-registry.ts, 5-min TTL). The retired code
 * registry's provider→category map survives only as FALLBACK_PROVIDER_CATEGORIES,
 * a frozen snapshot consulted when the DB is unreachable so capture routing
 * degrades to the last known-good taxonomy instead of dropping events.
 */

import { getConnectorRegistry } from "./connector-registry";
import type { ConnectorCategory } from "./enrichment/types";

const KNOWN_CATEGORIES: ReadonlySet<string> = new Set<ConnectorCategory>([
  "email",
  "calendar",
  "billing",
  "crm",
  "meetings",
  "documents",
  "storage",
  "project_management",
  "communication",
  "finance",
]);

/**
 * Frozen snapshot of the provider→category map, verified at parity with
 * connector_overrides.capture_category on 2026-08-08 (hubspot removed same
 * day — Sources plan 5.7 demoted it to action-only). Fallback only — the DB
 * wins whenever it is reachable, and new providers get their category from
 * the DB row, never from this list.
 */
export const FALLBACK_PROVIDER_CATEGORIES: Readonly<Record<string, ConnectorCategory>> = {
  asana: "project_management",
  cal: "calendar",
  calendly: "calendar",
  clickup: "project_management",
  dropbox: "storage",
  github: "project_management",
  gmail: "email",
  googlecalendar: "calendar",
  googledocs: "documents",
  googledrive: "storage",
  googlesheets: "documents",
  googleslides: "documents",
  linear: "project_management",
  mercury: "finance",
  notion: "documents",
  outlook: "email",
  pipedrive: "crm",
  quickbooks: "billing",
  salesforce: "crm",
  slack: "communication",
  stripe: "billing",
};

function isConnectorCategory(value: string): value is ConnectorCategory {
  return KNOWN_CATEGORIES.has(value);
}

/**
 * Full provider→category map. DB-backed when reachable; the frozen fallback
 * snapshot otherwise. Never throws.
 */
export async function getCaptureCategoryMap(): Promise<
  ReadonlyMap<string, ConnectorCategory>
> {
  try {
    const registry = await getConnectorRegistry();
    const map = new Map<string, ConnectorCategory>();
    for (const entry of registry.values()) {
      if (entry.captureCategory && isConnectorCategory(entry.captureCategory)) {
        map.set(entry.providerKey, entry.captureCategory);
      }
    }
    return map;
  } catch (error) {
    console.error(
      "[capture-categories] DB registry unavailable, using frozen fallback:",
      error instanceof Error ? error.message : error,
    );
    return new Map(Object.entries(FALLBACK_PROVIDER_CATEGORIES));
  }
}

/** Category for one provider, or null when the provider has no capture taxonomy. */
export async function getCaptureCategory(
  provider: string,
): Promise<ConnectorCategory | null> {
  const map = await getCaptureCategoryMap();
  return map.get(provider.toLowerCase()) ?? null;
}

/** All providers assigned to a category (reverse lookup for category fetching). */
export async function listProvidersForCategory(
  category: ConnectorCategory,
): Promise<string[]> {
  const map = await getCaptureCategoryMap();
  return [...map.entries()]
    .filter(([, cat]) => cat === category)
    .map(([provider]) => provider);
}
