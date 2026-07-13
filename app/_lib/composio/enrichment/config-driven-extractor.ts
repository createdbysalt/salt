import "server-only";

import { get } from "lodash-es";
import type {
  ConnectorManifest,
  FieldMapping,
  ConnectionMapping,
  NoteMapping,
  TransformType,
  EntityEnrichmentConfig,
} from "./config";
import type {
  EnrichableEntityType,
  EnrichmentSeed,
  ExtractorResult,
  SourcedField,
  ConnectionCandidate,
  ExtractedNote,
} from "./types";
import { matchField } from "./matching";
import { getCanonicalFields } from "./config";

/**
 * Config-driven extractor that uses YAML manifests instead of per-connector code.
 * Applies field mappings, transforms, and confidence scoring based on config.
 */

export interface ExtractorContext {
  workspaceId: string;
  entityType: EnrichableEntityType;
  seed: EnrichmentSeed;
  connectorToolkit: string;
}

export interface ConfigDrivenExtractionResult extends ExtractorResult {
  unmappedFields?: string[];
  lowConfidenceFields?: Array<{ field: string; confidence: number }>;
}

function applyTransform(value: unknown, transform: TransformType): unknown {
  if (value == null) return null;

  const strValue = String(value);

  switch (transform) {
    case "direct":
      return value;

    case "lowercase":
      return strValue.toLowerCase();

    case "uppercase":
      return strValue.toUpperCase();

    case "trim":
      return strValue.trim();

    case "parse_date":
      if (typeof value === "number") {
        return new Date(value * 1000).toISOString();
      }
      const parsed = new Date(strValue);
      return isNaN(parsed.getTime()) ? null : parsed.toISOString();

    case "parse_currency":
      const num = parseFloat(strValue.replace(/[^0-9.-]/g, ""));
      return isNaN(num) ? null : num;

    case "normalize_phone":
      return strValue.replace(/[^\d+]/g, "");

    case "normalize_email":
      return strValue.toLowerCase().trim();

    case "extract_domain":
      const emailMatch = strValue.match(/@([^@\s]+)$/);
      if (emailMatch) return emailMatch[1].toLowerCase();
      try {
        return new URL(strValue).hostname;
      } catch {
        return strValue.toLowerCase();
      }

    case "to_cents":
      const amount = parseFloat(strValue);
      return isNaN(amount) ? null : Math.round(amount * 100);

    default:
      return value;
  }
}

function enrichSeedForQuery(seed: EnrichmentSeed): EnrichmentSeed & { firstName?: string; lastName?: string } {
  const enriched: EnrichmentSeed & { firstName?: string; lastName?: string } = { ...seed };

  if (seed.name?.trim()) {
    const parts = seed.name.trim().split(/\s+/);
    enriched.firstName = parts[0];
    if (parts.length > 1) {
      enriched.lastName = parts.slice(1).join(" ");
    }
  }

  return enriched;
}

function buildQuery(
  queryConfig: { template: string; fallback?: string },
  seed: EnrichmentSeed
): string {
  const querySeed = enrichSeedForQuery(seed);
  let query = queryConfig.template;

  for (const [key, value] of Object.entries(querySeed)) {
    if (value != null) {
      query = query.replace(new RegExp(`\\{seed\\.${key}\\}`, "g"), String(value));
    }
  }

  if (query.includes("{seed.") && queryConfig.fallback) {
    query = queryConfig.fallback;
    for (const [key, value] of Object.entries(querySeed)) {
      if (value != null) {
        query = query.replace(new RegExp(`\\{seed\\.${key}\\}`, "g"), String(value));
      }
    }
  }

  return query;
}

function extractFieldsFromResponse(
  response: unknown,
  mappings: FieldMapping[],
  source: string
): Record<string, Omit<SourcedField, "source">> {
  const fields: Record<string, Omit<SourcedField, "source">> = {};

  for (const mapping of mappings) {
    const rawValue = get(response, mapping.source);
    if (rawValue == null) continue;

    const transformedValue = applyTransform(rawValue, mapping.transform);
    if (transformedValue == null) continue;

    const confidenceScore =
      mapping.confidence === "deterministic"
        ? 0.99
        : mapping.confidence === "rule"
          ? 0.95
          : mapping.confidence === "fuzzy"
            ? 0.85
            : 0.75;

    fields[mapping.target] = {
      value: transformedValue as string | number | boolean,
      confidence: confidenceScore,
      raw: String(rawValue),
    };
  }

  return fields;
}

function extractConnectionsFromResponse(
  response: unknown,
  mappings: ConnectionMapping[] | undefined,
  source: string
): {
  orgs?: Omit<ConnectionCandidate, "source">[];
  work?: Omit<ConnectionCandidate, "source">[];
  people?: Omit<ConnectionCandidate, "source">[];
} {
  if (!mappings || mappings.length === 0) return {};

  const connections: {
    orgs: Omit<ConnectionCandidate, "source">[];
    work: Omit<ConnectionCandidate, "source">[];
    people: Omit<ConnectionCandidate, "source">[];
  } = { orgs: [], work: [], people: [] };

  for (const mapping of mappings) {
    const value = get(response, mapping.source);
    if (!value) continue;

    const candidate: Omit<ConnectionCandidate, "source"> = {
      name: String(value),
    };

    if (mapping.matchField === "email") {
      candidate.email = String(value);
    } else if (mapping.matchField === "domain") {
      candidate.domain = String(value);
    }

    switch (mapping.targetType) {
      case "org":
        connections.orgs.push(candidate);
        break;
      case "work":
        connections.work.push(candidate);
        break;
      case "person":
        connections.people.push(candidate);
        break;
    }
  }

  return {
    orgs: connections.orgs.length > 0 ? connections.orgs : undefined,
    work: connections.work.length > 0 ? connections.work : undefined,
    people: connections.people.length > 0 ? connections.people : undefined,
  };
}

function extractNotesFromResponse(
  response: unknown,
  mappings: NoteMapping[] | undefined,
  source: string
): Omit<ExtractedNote, "source">[] {
  if (!mappings || mappings.length === 0) return [];

  const notes: Omit<ExtractedNote, "source">[] = [];

  for (const mapping of mappings) {
    const value = get(response, mapping.source);
    if (!value) continue;

    let content = String(value);
    if (mapping.template) {
      content = mapping.template.replace("{value}", content);
    }

    notes.push({ content });
  }

  return notes;
}

export function extractWithManifest(
  manifest: ConnectorManifest,
  entityType: EnrichableEntityType,
  response: unknown,
  seed: EnrichmentSeed
): ConfigDrivenExtractionResult {
  const source = manifest.connector.id;
  const entityConfig = manifest.enrichment[entityType];

  if (!entityConfig) {
    return {
      source,
      fields: {},
      hasData: false,
    };
  }

  let data = response;
  if (entityConfig.responseSelector) {
    data = get(response, entityConfig.responseSelector);
  }

  if (Array.isArray(data) && data.length > 0) {
    data = data[0];
  }

  if (!data) {
    return {
      source,
      fields: {},
      hasData: false,
    };
  }

  const fields = extractFieldsFromResponse(data, entityConfig.fieldMappings, source);
  const connections = extractConnectionsFromResponse(data, entityConfig.connectionMappings, source);
  const notes = extractNotesFromResponse(data, entityConfig.noteMappings, source);

  const hasData = Object.keys(fields).length > 0 || notes.length > 0;

  const canonicalFields = getCanonicalFields(entityType as keyof typeof import("./config").CANONICAL_SCHEMAS);
  const mappedFields = new Set(entityConfig.fieldMappings.map((m) => m.target));
  const unmappedFields = canonicalFields.filter((f) => !mappedFields.has(f));

  const lowConfidenceFields = Object.entries(fields)
    .filter(([, field]) => field.confidence < 0.85)
    .map(([name, field]) => ({ field: name, confidence: field.confidence }));

  return {
    source,
    fields,
    connections,
    notes,
    hasData,
    unmappedFields,
    lowConfidenceFields,
  };
}

export function getQueryFromManifest(
  manifest: ConnectorManifest,
  entityType: EnrichableEntityType,
  seed: EnrichmentSeed
): { action: string; query: string; params?: Record<string, unknown> } | null {
  const entityConfig = manifest.enrichment[entityType];
  if (!entityConfig) return null;

  const query = buildQuery(entityConfig.query, seed);

  return {
    action: entityConfig.action,
    query,
    params: entityConfig.defaultParams,
  };
}
