import "server-only";

import type {
  ConnectorManifest,
  FieldMapping,
  ConfidenceMethod,
  EntityEnrichmentConfig,
} from "./config";
import type { ConnectorCategory, EnrichableEntityType } from "./types";
import { getCanonicalFields } from "./config";
import { matchAllFields, type MatchResult } from "./matching";

/**
 * Auto-generate connector manifests from Composio tool schemas.
 * Produces draft manifests that need human review before activation.
 */

export interface ToolSchema {
  name: string;
  description?: string;
  inputParameters?: {
    properties?: Record<string, PropertySchema>;
    required?: string[];
  };
  outputParameters?: {
    properties?: Record<string, PropertySchema>;
  };
}

export interface PropertySchema {
  type?: string;
  description?: string;
  format?: string;
  enum?: string[];
  items?: PropertySchema;
  properties?: Record<string, PropertySchema>;
}

export interface GenerationResult {
  manifest: ConnectorManifest;
  coverage: {
    entityType: EnrichableEntityType;
    mappedFields: number;
    totalFields: number;
    unmappedFields: string[];
  }[];
  warnings: string[];
  needsReview: boolean;
}

const ENTITY_ACTION_PATTERNS: Record<EnrichableEntityType, string[]> = {
  person: ["SEARCH_CONTACTS", "LIST_CONTACTS", "GET_CONTACT", "SEARCH_USERS", "LIST_USERS"],
  org: ["SEARCH_COMPANIES", "LIST_COMPANIES", "GET_COMPANY", "SEARCH_ORGANIZATIONS"],
  work: ["SEARCH_DEALS", "LIST_PROJECTS", "SEARCH_ISSUES", "LIST_TASKS"],
  billing: ["LIST_INVOICES", "SEARCH_INVOICES", "LIST_PAYMENTS", "SEARCH_CUSTOMERS"],
  meeting: ["LIST_EVENTS", "SEARCH_EVENTS", "LIST_MEETINGS", "GET_CALENDAR"],
  file: ["SEARCH_FILES", "LIST_FILES", "GET_FILE"],
  me: [],
};

const CATEGORY_PATTERNS: Record<string, ConnectorCategory> = {
  gmail: "email",
  outlook: "email",
  slack: "email",
  googlecalendar: "calendar",
  outlook_calendar: "calendar",
  calendly: "calendar",
  stripe: "billing",
  quickbooks: "billing",
  xero: "billing",
  hubspot: "crm",
  salesforce: "crm",
  pipedrive: "crm",
  zoom: "meetings",
  teams: "meetings",
  googledrive: "storage",
  dropbox: "storage",
  notion: "documents",
  confluence: "documents",
  linear: "project_management",
  jira: "project_management",
  asana: "project_management",
};

function inferCategory(toolkit: string): ConnectorCategory {
  const normalized = toolkit.toLowerCase().replace(/[^a-z]/g, "");
  return CATEGORY_PATTERNS[normalized] ?? "crm";
}

function inferConfidence(matchResult: MatchResult | null): ConfidenceMethod {
  if (!matchResult) return "fuzzy";
  if (matchResult.method === "deterministic") return "deterministic";
  if (matchResult.confidence >= 0.9) return "rule";
  return "fuzzy";
}

function findBestAction(
  tools: ToolSchema[],
  entityType: EnrichableEntityType
): ToolSchema | null {
  const patterns = ENTITY_ACTION_PATTERNS[entityType];
  if (!patterns || patterns.length === 0) return null;

  for (const pattern of patterns) {
    const tool = tools.find((t) =>
      t.name.toUpperCase().includes(pattern)
    );
    if (tool) return tool;
  }

  return null;
}

function extractOutputFields(schema: PropertySchema): string[] {
  const fields: string[] = [];

  if (schema.properties) {
    for (const [key, value] of Object.entries(schema.properties)) {
      if (value.type === "object" && value.properties) {
        for (const nestedKey of Object.keys(value.properties)) {
          fields.push(`${key}.${nestedKey}`);
        }
      } else {
        fields.push(key);
      }
    }
  }

  return fields;
}

function generateFieldMappings(
  outputFields: string[],
  targetFields: string[]
): { mappings: FieldMapping[]; unmapped: string[] } {
  const mappings: FieldMapping[] = [];
  const matchResults = matchAllFields(outputFields, targetFields);
  const mappedTargets = new Set<string>();

  for (const [source, result] of matchResults.entries()) {
    if (mappedTargets.has(result.targetField)) continue;

    mappings.push({
      source,
      target: result.targetField,
      transform: "direct",
      confidence: inferConfidence(result),
    });
    mappedTargets.add(result.targetField);
  }

  const unmapped = targetFields.filter((t) => !mappedTargets.has(t));

  return { mappings, unmapped };
}

export function generateManifest(
  toolkit: string,
  tools: ToolSchema[]
): GenerationResult {
  const warnings: string[] = [];
  const coverage: GenerationResult["coverage"] = [];

  const category = inferCategory(toolkit);
  const enrichment: Record<string, EntityEnrichmentConfig> = {};

  const entityTypes: EnrichableEntityType[] = ["person", "org", "work", "billing", "meeting", "file"];

  for (const entityType of entityTypes) {
    const action = findBestAction(tools, entityType);
    if (!action) {
      warnings.push(`No action found for entity type: ${entityType}`);
      continue;
    }

    const targetFields = getCanonicalFields(entityType as keyof typeof import("./config").CANONICAL_SCHEMAS);
    const outputFields = action.outputParameters?.properties
      ? extractOutputFields(action.outputParameters)
      : [];

    if (outputFields.length === 0) {
      warnings.push(`No output fields found for action: ${action.name}`);
      continue;
    }

    const { mappings, unmapped } = generateFieldMappings(outputFields, targetFields);

    if (mappings.length === 0) {
      warnings.push(`No field mappings generated for ${entityType}`);
      continue;
    }

    enrichment[entityType] = {
      action: action.name,
      query: {
        template: "{seed.email}",
        fallback: "{seed.name}",
      },
      fieldMappings: mappings,
    };

    coverage.push({
      entityType,
      mappedFields: mappings.length,
      totalFields: targetFields.length,
      unmappedFields: unmapped,
    });
  }

  const manifest: ConnectorManifest = {
    version: "1.0.0",
    connector: {
      id: `${toolkit}-auto`,
      name: `${toolkit} (auto-generated)`,
      provider: toolkit,
      category,
    },
    enrichment,
    fallback: {
      unmappedFields: "ignore",
      confidenceThreshold: 0.85,
    },
    _generated: true,
    _needsReview: true,
  };

  const needsReview =
    warnings.length > 0 ||
    coverage.some((c) => c.mappedFields / c.totalFields < 0.5);

  return {
    manifest,
    coverage,
    warnings,
    needsReview,
  };
}

export function generateManifestReport(result: GenerationResult): string {
  const lines: string[] = [
    `# Auto-Generated Manifest: ${result.manifest.connector.name}`,
    "",
    `**Category:** ${result.manifest.connector.category}`,
    `**Needs Review:** ${result.needsReview ? "Yes" : "No"}`,
    "",
    "## Coverage",
    "",
  ];

  for (const cov of result.coverage) {
    const percentage = Math.round((cov.mappedFields / cov.totalFields) * 100);
    lines.push(`### ${cov.entityType}`);
    lines.push(`- Mapped: ${cov.mappedFields}/${cov.totalFields} (${percentage}%)`);
    if (cov.unmappedFields.length > 0) {
      lines.push(`- Unmapped: ${cov.unmappedFields.join(", ")}`);
    }
    lines.push("");
  }

  if (result.warnings.length > 0) {
    lines.push("## Warnings");
    lines.push("");
    for (const warning of result.warnings) {
      lines.push(`- ${warning}`);
    }
  }

  return lines.join("\n");
}
