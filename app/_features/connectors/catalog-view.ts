/**
 * Client-safe helpers over the DB-driven connector catalog rows delivered in
 * ConnectorsPageData.catalog (connector-platform Phase 2.5). Replaces direct
 * imports of the static CONNECTOR_CATALOG in client components.
 */

import type {
  ConnectorCatalogId,
  ConnectorCategory,
  ConnectorDefinition,
} from "./types";

/** All catalog categories in display order. */
export const CONNECTOR_CATEGORY_ORDER: readonly ConnectorCategory[] = [
  "recommended",
  "payments",
  "communication",
  "scheduling",
  "meetings",
  "productivity",
  "files",
  "documents",
  "forms",
  "social",
  "marketing",
  "analytics",
  "crm",
  "design",
  "website",
  "developer",
  "ai",
  "location",
  "property",
  "security",
  "delivery",
];

export function catalogById(
  catalog: readonly ConnectorDefinition[],
): Partial<Record<ConnectorCatalogId, ConnectorDefinition>> {
  return Object.fromEntries(catalog.map((entry) => [entry.id, entry]));
}

/** Categories present in this catalog, in canonical display order. */
export function catalogCategories(
  catalog: readonly ConnectorDefinition[],
): ConnectorCategory[] {
  const present = new Set(catalog.map((entry) => entry.category));
  return CONNECTOR_CATEGORY_ORDER.filter((category) => present.has(category));
}
