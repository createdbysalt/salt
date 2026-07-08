/**
 * Client-safe exports only. Server: `queries.ts`, `actions.ts`.
 * The catalog is DB-driven (connector-platform 2.5): components read
 * ConnectorsPageData.catalog + catalog-view helpers, never a static list.
 */
export {
  CONNECTOR_CATEGORY_ORDER,
  catalogById,
  catalogCategories,
  categoryLabel,
} from "./catalog-view";
export {
  getComposioProviderForToolSlug,
  getConnectorCapabilities,
  getGoogleToolPreferenceProviders,
  supportsToolPreferences,
} from "./connector-capabilities";
export type {
  ConnectorCapability,
  ConnectorCapabilityGroups,
} from "./connector-capabilities";
export {
  getDisabledToolsFromConfig,
  mergeDisabledToolsIntoConfig,
  parseConnectorIntegrationConfig,
} from "./connector-config";
export type { ConnectorIntegrationConfig } from "./connector-config";
export type {
  ConnectorActivityEntry,
  ConnectorAuthMethod,
  ConnectorCatalogId,
  ConnectorCategory,
  ConnectorDefinition,
  ConnectorDetailData,
  ConnectorEmailMode,
  ConnectorOwnership,
  ConnectorPhase,
  ConnectorRuntimeStatus,
  ConnectorTab,
  ConnectorTrustLevel,
  ConnectorTrustSettings,
  ConnectorsPageData,
} from "./types";
