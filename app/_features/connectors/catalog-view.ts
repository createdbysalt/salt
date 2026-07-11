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

/**
 * Sentence-case display names for every catalog category — the single
 * source of truth. Both the browse surfaces and filter UIs import this;
 * per-component switch statements (which silently fell back to raw slugs)
 * are retired.
 */
const CONNECTOR_CATEGORY_LABELS: Record<ConnectorCategory, string> = {
  recommended: "Recommended",
  payments: "Payments",
  communication: "Communication",
  scheduling: "Scheduling",
  meetings: "Meetings",
  productivity: "Productivity",
  files: "Files",
  documents: "Documents",
  forms: "Forms",
  social: "Social",
  marketing: "Marketing",
  analytics: "Analytics",
  crm: "CRM",
  design: "Design",
  website: "Website",
  developer: "Developer",
  ai: "AI",
  location: "Location",
  property: "Property",
  security: "Security",
  delivery: "Delivery",
};

/** Display label for a connector category (covers all 21 categories). */
export function categoryLabel(category: ConnectorCategory): string {
  return CONNECTOR_CATEGORY_LABELS[category] ?? category;
}

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
