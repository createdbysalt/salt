import type { ConnectorCapabilityGroups } from "./connector-capabilities";

/**
 * Connector content contract (2026-07-07).
 *
 * The taxonomy for a connector detail page: what every connector must show,
 * where each piece comes from, and its fallback — the connector analogue of
 * the memory field-registry. Adding a connector fills a known checklist; the
 * coverage report (.scratch/connector-content-coverage.ts) flags what's still
 * on a fallback so no page ships silently half-empty.
 *
 * Source kinds:
 *  - "synced"   : from Composio via the catalog sync (every connector has it)
 *  - "derived"  : computed from the connector's classified tools / capture
 *  - "curated"  : hand-authored, optional; absent is honest, not broken
 */
export type ContentSource = "synced" | "derived" | "curated";

export interface ContentField {
  key: string;
  label: string;
  source: ContentSource;
  /** Required fields must resolve for every VISIBLE connector (else the page
   *  reads as incomplete). Optional fields hide cleanly when absent. */
  required: boolean;
  note: string;
}

export const CONNECTOR_CONTENT_CONTRACT: readonly ContentField[] = [
  { key: "name", label: "Name", source: "synced", required: true, note: "connector_catalog.name" },
  { key: "logo", label: "Logo", source: "synced", required: true, note: "connector_catalog.logo_url" },
  { key: "category", label: "Category / domain", source: "synced", required: true, note: "catalog category → Salt domain" },
  { key: "tagline", label: "Tagline / description", source: "synced", required: true, note: "catalog description (curated seed or Composio)" },
  { key: "overview", label: "What connecting unlocks", source: "derived", required: true, note: "curated bullets, else derived from tool classes" },
  { key: "tools", label: "Tools (read/write)", source: "derived", required: true, note: "connector_tools ∩ approved classifications" },
  { key: "activity", label: "Recent activity", source: "derived", required: true, note: "workspace_tool_executions (empty state until used)" },
  { key: "capture", label: "Memory capture", source: "derived", required: false, note: "adapter presence; honest 'not available yet' when absent" },
  { key: "trust", label: "Trust / permissions", source: "derived", required: true, note: "workspace policy (present when connected)" },
  { key: "developer", label: "Developed by", source: "curated", required: false, note: "Composio has no developer field; curated-optional" },
  { key: "links", label: "Docs / support links", source: "curated", required: false, note: "Composio provides no URLs; curated-optional" },
] as const;

/** The `required` contract fields — used by the coverage report + a guard test. */
export const REQUIRED_CONTENT_KEYS = CONNECTOR_CONTENT_CONTRACT.filter(
  (field) => field.required,
).map((field) => field.key);

/**
 * Auto-derive the "what connecting unlocks" overview from a connector's tool
 * classes — truthful and consistent for EVERY connector, so the section is
 * never empty. Curated bullets (head connectors) override this.
 */
export function deriveConnectorOverview(input: {
  name: string;
  groups: ConnectorCapabilityGroups | null;
  captureCapable: boolean;
}): string[] {
  const { name, groups, captureCapable } = input;
  const readCount = groups?.read.length ?? 0;
  const writeCount = groups?.write.length ?? 0;
  const bullets: string[] = [];

  if (readCount > 0) {
    bullets.push(`Salt reads your ${name} data to understand your work.`);
  }
  if (writeCount > 0) {
    bullets.push(
      `Actions like creating or updating happen only after you approve each one.`,
    );
  }
  // Destructive tools are excluded at the gate and never shown — say so.
  bullets.push(`Salt can never delete anything in ${name}.`);
  if (captureCapable) {
    bullets.push(
      `With Memory capture on, Salt learns from your ${name} activity.`,
    );
  }
  return bullets;
}
