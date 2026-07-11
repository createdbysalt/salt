/**
 * Config-driven enrichment infrastructure.
 *
 * Usage:
 *   import { loadManifestFromYaml, CANONICAL_SCHEMAS, validateManifest } from './config'
 */

export {
  CANONICAL_SCHEMAS,
  getCanonicalFields,
  personCanonicalSchema,
  orgCanonicalSchema,
  workCanonicalSchema,
  billingCanonicalSchema,
  meetingCanonicalSchema,
  fileCanonicalSchema,
  meCanonicalSchema,
  type CanonicalSchemaType,
  type PersonCanonical,
  type OrgCanonical,
  type WorkCanonical,
  type BillingCanonical,
  type MeetingCanonical,
  type FileCanonical,
  type MeCanonical,
} from "./canonical-schemas";

export {
  connectorManifestSchema,
  fieldMappingSchema,
  connectionMappingSchema,
  noteMappingSchema,
  entityEnrichmentConfigSchema,
  transformTypeSchema,
  confidenceMethodSchema,
  validateManifest,
  safeValidateManifest,
  type ConnectorManifest,
  type FieldMapping,
  type ConnectionMapping,
  type NoteMapping,
  type EntityEnrichmentConfig,
  type TransformType,
  type ConfidenceMethod,
  type PaginationConfig,
  type FallbackConfig,
} from "./manifest-schema";

export {
  loadManifestFromYaml,
  loadManifestFromObject,
  loadManifestStrict,
  getCachedManifest,
  setCachedManifest,
  clearManifestCache,
  getManifestCacheSize,
  type LoadResult,
} from "./loader";
