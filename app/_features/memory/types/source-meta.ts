/**
 * Unified source metadata for memory records.
 * Tracks where data originated (which app/connector) and links to the original resource.
 */

export type SourceProvider =
  | "manual"
  | "stripe"
  | "quickbooks"
  | "square"
  | "shopify"
  | "lemonsqueezy"
  | "mercury"
  | "google-calendar"
  | "google-drive"
  | "google-docs"
  | "google-sheets"
  | "gmail"
  | "outlook"
  | "zoom"
  | "fireflies"
  | "slack"
  | "notion"
  | "linear"
  | "github"
  | "figma"
  | "hubspot"
  | "salesforce"
  | "pipedrive"
  | "airtable"
  | "asana"
  | "clickup"
  | "monday"
  | "trello"
  | "jira"
  | "docusign"
  | "pandadoc"
  | "calendly"
  | "calcom"
  | "granola"
  | "recall";

export type SourceOrigin =
  | "found"      // Found by Salt in a connected app
  | "created"    // Manually created by user
  | "extracted"  // Extracted from document/email
  | "imported";  // Bulk imported

/**
 * Source metadata for a memory record.
 * Used to display where data came from and link to the original resource.
 */
export type EntitySourceMeta = {
  /** Which app/connector the data came from */
  provider: SourceProvider;
  /** How the record was created */
  origin: SourceOrigin;
  /** URL to the original resource in the source app (e.g., Stripe invoice URL) */
  sourceUrl?: string | null;
  /** Provider-specific ID for dedup and deep linking */
  externalId?: string | null;
  /** Human-readable label for the source (e.g., "Invoice #1234 in Stripe") */
  sourceLabel?: string;
  /** When the record was last synced from the source */
  lastSyncedAt?: string | null;
};

/**
 * Check if a source has an external link
 */
export function hasExternalLink(source: EntitySourceMeta | null | undefined): boolean {
  return Boolean(source?.sourceUrl);
}

/**
 * Check if a record was synced from an external app (vs manual/extracted)
 */
export function isExternallySourced(source: EntitySourceMeta | null | undefined): boolean {
  return source?.origin === "found" && source.provider !== "manual";
}
