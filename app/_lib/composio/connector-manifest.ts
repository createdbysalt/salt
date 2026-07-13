/**
 * Ask Salt connector manifest — DERIVED FROM UNIFIED REGISTRY
 *
 * This file now re-exports from the unified connector registry.
 * To add a connector to Ask Salt, set askSalt.enabled = true in:
 *   app/_lib/composio/unified-connector-registry.ts
 *
 * Plain module (no server-only / no DB) so the guard test can import it freely.
 */

import {
  getAskSaltManifest,
  getAskSaltToolkits,
  getAskSaltSlugPrefixes,
  getAskSaltLabels,
  type AskSaltManifestEntry,
} from "./unified-connector-registry";

// Re-export the type
export type AskSaltConnectorManifestEntry = AskSaltManifestEntry;

// Derive from unified registry
export const ASK_SALT_CONNECTOR_MANIFEST: readonly AskSaltConnectorManifestEntry[] =
  getAskSaltManifest();

/** Toolkit keys Ask Salt may load tools for (derived from unified registry). */
export function askSaltManifestToolkits(): string[] {
  return getAskSaltToolkits();
}

/** Toolkit key → slug prefix map (derived from unified registry). */
export function askSaltManifestSlugPrefixes(): Record<string, string> {
  return getAskSaltSlugPrefixes();
}

/** Toolkit key → human label map (derived from unified registry). */
export function askSaltManifestLabels(): Record<string, string> {
  return getAskSaltLabels();
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
