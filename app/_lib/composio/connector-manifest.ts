/**
 * Single source of truth for the connectors Ask Salt exposes.
 *
 * Adding a connector to Ask Salt is a multi-registry operation that used to be
 * spread across files and easy to half-finish (toolkit listed but no prefix, or
 * slugs with a policy but no input schema). This manifest declares the
 * per-connector facts once; the derived registries (toolkit list, slug
 * prefixes, capability labels) read from here, and `connector-manifest.test.ts`
 * fails CI if any allowlisted slug is missing a policy or Zod schema, or if a
 * manifest connector is otherwise half-registered.
 *
 * Plain module (no server-only / no DB) so the guard test can import it freely.
 */
export interface AskSaltConnectorManifestEntry {
  /** Composio toolkit slug (also the workspace_integrations provider key). */
  toolkit: string;
  /** UPPER_SNAKE slug prefix every tool in this toolkit shares (e.g. "GMAIL_"). */
  slugPrefix: string;
  /** Human-facing label used in the capability block. */
  label: string;
  /** Provider key returned by getComposioProviderForToolSlug for this toolkit. */
  catalogProvider: string;
}

export const ASK_SALT_CONNECTOR_MANIFEST: readonly AskSaltConnectorManifestEntry[] = [
  { toolkit: "gmail", slugPrefix: "GMAIL_", label: "Gmail", catalogProvider: "gmail" },
  {
    toolkit: "googlecalendar",
    slugPrefix: "GOOGLECALENDAR_",
    label: "Google Calendar",
    catalogProvider: "googlecalendar",
  },
  {
    toolkit: "googledrive",
    slugPrefix: "GOOGLEDRIVE_",
    label: "Google Drive",
    catalogProvider: "googledrive",
  },
  {
    toolkit: "googledocs",
    slugPrefix: "GOOGLEDOCS_",
    label: "Google Docs",
    catalogProvider: "googledocs",
  },
  {
    toolkit: "googlesheets",
    slugPrefix: "GOOGLESHEETS_",
    label: "Google Sheets",
    catalogProvider: "googlesheets",
  },
  {
    toolkit: "googleslides",
    slugPrefix: "GOOGLESLIDES_",
    label: "Google Slides",
    catalogProvider: "googleslides",
  },
  { toolkit: "stripe", slugPrefix: "STRIPE_", label: "Stripe", catalogProvider: "stripe" },
] as const;

/** Toolkit keys Ask Salt may load tools for (derived from the manifest). */
export function askSaltManifestToolkits(): string[] {
  return ASK_SALT_CONNECTOR_MANIFEST.map((entry) => entry.toolkit);
}

/** Toolkit key → slug prefix map (derived from the manifest). */
export function askSaltManifestSlugPrefixes(): Record<string, string> {
  return Object.fromEntries(
    ASK_SALT_CONNECTOR_MANIFEST.map((entry) => [entry.toolkit, entry.slugPrefix]),
  );
}

/** Toolkit key → human label map (derived from the manifest). */
export function askSaltManifestLabels(): Record<string, string> {
  return Object.fromEntries(
    ASK_SALT_CONNECTOR_MANIFEST.map((entry) => [entry.toolkit, entry.label]),
  );
}

/** Manifest entry whose prefix matches the slug, or null if not an Ask Salt connector. */
export function manifestEntryForSlug(slug: string): AskSaltConnectorManifestEntry | null {
  return (
    ASK_SALT_CONNECTOR_MANIFEST.find((entry) => slug.startsWith(entry.slugPrefix)) ?? null
  );
}

/** True when the slug belongs to one of Ask Salt's manifest connectors. */
export function isAskSaltManifestSlug(slug: string): boolean {
  return manifestEntryForSlug(slug) !== null;
}
