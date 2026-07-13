/**
 * Connector display metadata — DERIVED FROM UNIFIED REGISTRY
 *
 * This file now re-exports from the unified connector registry.
 * To update connector metadata, edit:
 *   app/_lib/composio/unified-connector-registry.ts
 */

import type { ConnectorCatalogId } from "@/app/_features/connectors";
import {
  getConnectorMetaWithFallback,
  type ConnectorMeta as UnifiedConnectorMeta,
  type ConnectorLink as UnifiedConnectorLink,
} from "@/app/_lib/composio/unified-connector-registry";

// Re-export types for backwards compatibility
export type ConnectorLink = UnifiedConnectorLink;
export type ConnectorMeta = UnifiedConnectorMeta;

/**
 * Get connector meta by catalog ID, with fallback for unknown connectors.
 * Now derived from the unified registry.
 */
export function getConnectorMeta(
  connectorId: ConnectorCatalogId,
  fallbackName: string,
  fallbackDescription: string,
): ConnectorMeta {
  return getConnectorMetaWithFallback(connectorId, fallbackName, fallbackDescription);
}
