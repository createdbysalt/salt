import type { ConnectorCatalogId } from "@/app/_features/connectors/types";
import type { ConnectorCategory } from "@/app/_lib/composio/enrichment/types";

/**
 * Representative connector logos per playbook requirement category.
 * Display-only: shows which apps a playbook can work with. Ordered by
 * preference (released connectors first); capped per category and overall
 * so the logo cluster stays compact.
 */
const CATEGORY_LOGO_IDS: Record<ConnectorCategory, ConnectorCatalogId[]> = {
  email: ["google", "outlook"],
  calendar: ["google-calendar", "calendly"],
  billing: ["stripe", "quickbooks"],
  crm: ["hubspot"],
  meetings: ["zoom", "fireflies"],
  documents: ["google-docs", "notion"],
  storage: ["google-drive", "dropbox"],
  project_management: ["asana", "linear"],
  communication: ["slack"],
};

const MAX_PER_CATEGORY = 2;
const MAX_TOTAL = 3;

/**
 * Representative app logos per playbook SECTION — used on play cards, where
 * only the section is known (not the playbook's requirement categories).
 */
const SECTION_LOGO_IDS: Record<string, ConnectorCatalogId[]> = {
  relationships: ["hubspot", "google"],
  work: ["linear", "asana"],
  billing: ["stripe", "quickbooks"],
  resources: ["google-drive", "google-docs"],
  files: ["google-drive", "google-docs"], // legacy section key
  meetings: ["google-calendar", "zoom"],
  communication: ["google", "slack"],
};

export function getSectionConnectorIds(
  section: string | null | undefined,
): ConnectorCatalogId[] {
  if (!section) return [];
  return SECTION_LOGO_IDS[section] ?? [];
}

export function getPlaybookConnectorIds({
  required = [],
  optional = [],
}: {
  required?: readonly ConnectorCategory[];
  optional?: readonly ConnectorCategory[];
}): ConnectorCatalogId[] {
  const ids: ConnectorCatalogId[] = [];
  const seen = new Set<string>();

  for (const category of [...required, ...optional]) {
    for (const id of (CATEGORY_LOGO_IDS[category] ?? []).slice(0, MAX_PER_CATEGORY)) {
      if (seen.has(id)) continue;
      seen.add(id);
      ids.push(id);
      if (ids.length >= MAX_TOTAL) return ids;
    }
  }

  return ids;
}
