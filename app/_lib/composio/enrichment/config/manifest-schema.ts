import { z } from "zod";
import type { ConnectorCategory, EnrichableEntityType } from "../types";

/**
 * Connector manifest schema for YAML configs.
 * Based on Airbyte's low-code pattern - declarative extraction with JSON Schema validation.
 */

export const transformTypeSchema = z.enum([
  "direct",
  "lowercase",
  "uppercase",
  "trim",
  "parse_date",
  "parse_currency",
  "normalize_phone",
  "normalize_email",
  "extract_domain",
  "to_cents",
]);

export const confidenceMethodSchema = z.enum([
  "deterministic",
  "rule",
  "fuzzy",
  "semantic",
]);

export const fieldMappingSchema = z.object({
  source: z.string(),
  target: z.string(),
  transform: transformTypeSchema.default("direct"),
  customTransform: z.string().optional(),
  confidence: confidenceMethodSchema.default("deterministic"),
});

export const connectionMappingSchema = z.object({
  source: z.string(),
  targetType: z.enum(["person", "org", "work", "billing", "meeting", "file"]),
  matchField: z.enum(["name", "email", "domain"]),
  confidence: z.number().min(0).max(1).default(0.7),
});

export const noteMappingSchema = z.object({
  source: z.string(),
  template: z.string().optional(),
});

export const paginationSchema = z.object({
  type: z.enum(["cursor", "offset", "page", "none"]),
  cursorPath: z.string().optional(),
  limitParam: z.string().optional(),
  maxPages: z.number().int().positive().optional(),
});

export const entityEnrichmentConfigSchema = z.object({
  action: z.string(),
  query: z.object({
    template: z.string(),
    fallback: z.string().optional(),
  }),
  defaultParams: z.record(z.unknown()).optional(),
  responseSelector: z.string().optional(),
  pagination: paginationSchema.optional(),
  fieldMappings: z.array(fieldMappingSchema),
  connectionMappings: z.array(connectionMappingSchema).optional(),
  noteMappings: z.array(noteMappingSchema).optional(),
});

export const fallbackConfigSchema = z.object({
  unmappedFields: z.enum(["ignore", "llm_extract", "human_review"]).default("ignore"),
  confidenceThreshold: z.number().min(0).max(1).default(0.85),
});

export const connectorManifestSchema = z.object({
  version: z.string(),
  connector: z.object({
    id: z.string(),
    name: z.string(),
    provider: z.string(),
    category: z.enum([
      "email",
      "calendar",
      "billing",
      "crm",
      "meetings",
      "documents",
      "project_management",
      "storage",
      "communication",
      "finance",
    ] as const satisfies readonly ConnectorCategory[]),
    apiVersion: z.string().optional(),
  }),
  enrichment: z.record(
    z.enum(["person", "org", "work", "billing", "meeting", "file", "me"] as const satisfies readonly EnrichableEntityType[]),
    entityEnrichmentConfigSchema
  ),
  fallback: fallbackConfigSchema.optional(),
  _generated: z.boolean().optional(),
  _needsReview: z.boolean().optional(),
});

export type TransformType = z.infer<typeof transformTypeSchema>;
export type ConfidenceMethod = z.infer<typeof confidenceMethodSchema>;
export type FieldMapping = z.infer<typeof fieldMappingSchema>;
export type ConnectionMapping = z.infer<typeof connectionMappingSchema>;
export type NoteMapping = z.infer<typeof noteMappingSchema>;
export type PaginationConfig = z.infer<typeof paginationSchema>;
export type EntityEnrichmentConfig = z.infer<typeof entityEnrichmentConfigSchema>;
export type FallbackConfig = z.infer<typeof fallbackConfigSchema>;
export type ConnectorManifest = z.infer<typeof connectorManifestSchema>;

export function validateManifest(manifest: unknown): ConnectorManifest {
  return connectorManifestSchema.parse(manifest);
}

export function safeValidateManifest(manifest: unknown): {
  success: boolean;
  data?: ConnectorManifest;
  error?: z.ZodError;
} {
  const result = connectorManifestSchema.safeParse(manifest);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}
