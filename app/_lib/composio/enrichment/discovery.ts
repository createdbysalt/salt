import "server-only";

/**
 * Enrichment Provider Discovery
 *
 * Discovers connected providers for enrichment using category-based resolution.
 * Replaces the narrow ASK_SALT_CONNECTOR_MANIFEST allowlist with dynamic discovery
 * from workspace_integrations.
 *
 * Design decisions (AD-1, AD-3 from enrichment-unification plan):
 * - Uses getConnectedCategories() from category-fetcher (same as Act playbooks)
 * - Filters to categories relevant for the entity type being enriched
 * - Returns one provider per category (first connected wins, mirrors playbook behavior)
 */

import { getConnectedCategories, type ConnectedCategory } from "../category-fetcher";
import { getCategoriesForEntity } from "./registry";
import { getCaptureCategory } from "../capture-categories";
import { listAskSaltEntries } from "../connector-registry";
import type { ConnectorCategory, EnrichableEntityType } from "./types";

export interface EnrichmentProvider {
  category: ConnectorCategory;
  provider: string;
  connectionId: string;
}

/**
 * Get connected providers relevant for enriching a specific entity type.
 *
 * Unlike the legacy getConnectedToolkits() which checked a fixed 7-toolkit list,
 * this queries all workspace_integrations and filters to categories the entity
 * type actually uses.
 *
 * Example: enriching a "person" queries email, calendar, billing, crm, meetings, documents.
 * If the workspace has Gmail (email), HubSpot (crm), and Asana (project_management) connected,
 * returns Gmail and HubSpot (Asana is project_management, not in person's category list).
 */
export async function getConnectedProvidersForEnrichment(
  workspaceId: string,
  entityType: EnrichableEntityType
): Promise<EnrichmentProvider[]> {
  const neededCategories = getCategoriesForEntity(entityType);
  const connectedCategories = await getConnectedCategories(workspaceId);

  const providers: EnrichmentProvider[] = [];
  const seenCategories = new Set<ConnectorCategory>();

  for (const connected of connectedCategories) {
    if (!neededCategories.includes(connected.category)) {
      continue;
    }

    if (seenCategories.has(connected.category)) {
      continue;
    }

    const provider = connected.providers[0];
    const connectionId = connected.connectionIds[0];

    if (provider && connectionId) {
      providers.push({
        category: connected.category,
        provider,
        connectionId,
      });
      seenCategories.add(connected.category);
    }
  }

  return providers;
}

/**
 * Check if a provider has an enrichment manifest (i.e., Ask Salt enabled with tools).
 *
 * Derives from the DB connector registry (connector_overrides.ask_salt_slug_prefix)
 * — no hardcoded list. Used to decide between manifest-based extraction and
 * capability fallback.
 */
export async function hasConnectorManifest(provider: string): Promise<boolean> {
  const entries = await listAskSaltEntries();
  const key = provider.toLowerCase();
  return entries.some((entry) => entry.toolkitSlug.toLowerCase() === key);
}

/**
 * Get the category for a provider key (DB-backed capture taxonomy).
 */
export async function getCategoryForProvider(
  provider: string,
): Promise<ConnectorCategory | null> {
  return getCaptureCategory(provider);
}

/**
 * Log summary of enrichment discovery for debugging.
 */
export function logDiscoverySummary(
  entityType: EnrichableEntityType,
  providers: EnrichmentProvider[]
): void {
  const summary = providers.map((p) => `${p.provider}(${p.category})`).join(", ");
  console.log(
    `[enrichment:discovery] ${entityType} → ${providers.length} providers: ${summary || "none"}`
  );
}
