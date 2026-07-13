import "server-only";

/**
 * Capability-Based Enrichment Fallback
 *
 * For connectors without hand-authored manifests, this module provides
 * enrichment via the capability resolver + four-tier field matching.
 *
 * Per AD-3: This is OPT-IN per connector via `capability_enrichment_enabled`
 * flag in tool_capabilities. We don't want to extract garbage from raw JSON
 * without explicit enablement.
 *
 * Flow:
 * 1. Map entity type to enrichment capabilities (e.g., person → search_contacts)
 * 2. Check if any capability has enrichment enabled for this provider
 * 3. Resolve and execute the capability
 * 4. Run four-tier field matching on the raw response
 */

import { createAdminClient } from "@/app/_lib/supabase/admin";
import { resolveCapabilityTool } from "../capability-resolver";
import { executeComposioAction } from "../actions";
import type {
  EnrichableEntityType,
  EnrichmentSeed,
  ExtractorResult,
  ConnectorCategory,
} from "./types";
import { emptyResult } from "./extractors/base";

const ENTITY_ENRICHMENT_CAPABILITIES: Record<EnrichableEntityType, string[]> = {
  person: ["search_contacts", "search_people", "find_contact"],
  org: ["search_companies", "search_organizations", "find_company"],
  work: ["search_projects", "search_tasks", "find_project"],
  billing: ["search_invoices", "search_customers", "find_invoice"],
  meeting: ["search_events", "search_meetings", "find_event"],
  file: ["search_files", "search_documents", "find_file"],
  me: [],
};

export interface CapabilityEnrichmentResult {
  supported: boolean;
  result: ExtractorResult | null;
  capability?: string;
  provider?: string;
  reason?: string;
}

/**
 * Check if a provider has capability enrichment enabled.
 */
export async function isCapabilityEnrichmentEnabled(
  providerKey: string,
  entityType: EnrichableEntityType
): Promise<{ enabled: boolean; capability?: string }> {
  const capabilities = ENTITY_ENRICHMENT_CAPABILITIES[entityType];
  if (!capabilities || capabilities.length === 0) {
    return { enabled: false };
  }

  const supabase = createAdminClient();

  const { data: rows } = await supabase
    .from("tool_capabilities")
    .select("capability_key")
    .eq("provider_key", providerKey)
    .eq("capability_enrichment_enabled", true)
    .in("capability_key", capabilities)
    .limit(1);

  if (rows && rows.length > 0) {
    return { enabled: true, capability: rows[0].capability_key };
  }

  return { enabled: false };
}

/**
 * Enrich via capability when no manifest exists.
 *
 * Returns null if:
 * - Provider doesn't have enrichment-enabled capabilities
 * - Capability resolution fails (not connected, not approved)
 * - Execution fails
 */
export async function enrichViaCapability(
  workspaceId: string,
  providerKey: string,
  entityType: EnrichableEntityType,
  seed: EnrichmentSeed
): Promise<CapabilityEnrichmentResult> {
  const { enabled, capability } = await isCapabilityEnrichmentEnabled(
    providerKey,
    entityType
  );

  if (!enabled || !capability) {
    return {
      supported: false,
      result: null,
      reason: `No enrichment-enabled capability for ${providerKey}/${entityType}`,
    };
  }

  const tool = await resolveCapabilityTool(capability, workspaceId);
  if (!tool) {
    return {
      supported: false,
      result: null,
      capability,
      reason: `Capability ${capability} not resolvable for workspace`,
    };
  }

  try {
    const query = buildCapabilityQuery(entityType, seed);
    if (!query) {
      return {
        supported: true,
        result: emptyResult(providerKey),
        capability,
        provider: tool.provider,
        reason: "No query buildable from seed",
      };
    }

    const response = await executeComposioAction(
      tool.toolSlug,
      { query, limit: 10 },
      tool.connectionId,
      workspaceId,
      { skipAuthCheck: true, workspaceId, unattended: true }
    );

    const extraction = extractFieldsFromResponse(response, entityType, seed, providerKey);

    return {
      supported: true,
      result: extraction,
      capability,
      provider: tool.provider,
    };
  } catch (error) {
    console.error(`[capability-enricher] Error executing ${capability}:`, error);
    return {
      supported: true,
      result: emptyResult(providerKey),
      capability,
      provider: tool.provider,
      reason: error instanceof Error ? error.message : "Execution failed",
    };
  }
}

function buildCapabilityQuery(
  entityType: EnrichableEntityType,
  seed: EnrichmentSeed
): string | null {
  switch (entityType) {
    case "person":
      if (seed.email) return seed.email;
      if (seed.name) return seed.name;
      return null;

    case "org":
      if (seed.domain) return seed.domain;
      if (seed.name) return seed.name;
      return null;

    case "work":
      if (seed.projectName) return seed.projectName;
      if (seed.name) return seed.name;
      return null;

    case "billing":
      if (seed.invoiceNumber) return seed.invoiceNumber;
      if (seed.email) return seed.email;
      return null;

    case "meeting":
      if (seed.meetingTitle) return seed.meetingTitle;
      return null;

    case "file":
      if (seed.fileName) return seed.fileName;
      return null;

    default:
      return null;
  }
}

/**
 * Extract fields from raw capability response using four-tier matching.
 *
 * This is a simplified version - the full four-tier matcher in
 * matching/multi-tier.ts can be used for more sophisticated extraction.
 */
function extractFieldsFromResponse(
  response: unknown,
  entityType: EnrichableEntityType,
  seed: EnrichmentSeed,
  source: string
): ExtractorResult {
  if (!response || typeof response !== "object") {
    return emptyResult(source);
  }

  const fields: Record<string, { value: string; confidence: number }> = {};

  const records = Array.isArray(response)
    ? response
    : "results" in response && Array.isArray((response as Record<string, unknown>).results)
      ? (response as Record<string, unknown>).results as unknown[]
      : [response];

  if (records.length === 0) {
    return emptyResult(source);
  }

  const record = records[0] as Record<string, unknown>;

  if (entityType === "person") {
    if (typeof record.email === "string" && record.email.includes("@")) {
      fields.email = { value: record.email.toLowerCase(), confidence: 0.9 };
    }
    if (typeof record.phone === "string" && record.phone.length > 5) {
      fields.phone = { value: record.phone, confidence: 0.85 };
    }
    if (typeof record.title === "string" || typeof record.job_title === "string") {
      fields.title = {
        value: String(record.title ?? record.job_title),
        confidence: 0.8,
      };
    }
    if (typeof record.name === "string" && !seed.name) {
      fields.name = { value: record.name, confidence: 0.85 };
    }
    if (typeof record.company === "string" || typeof record.organization === "string") {
      fields.organization = {
        value: String(record.company ?? record.organization),
        confidence: 0.75,
      };
    }
  }

  if (entityType === "org") {
    if (typeof record.website === "string") {
      fields.website = { value: record.website, confidence: 0.9 };
    }
    if (typeof record.industry === "string") {
      fields.industry = { value: record.industry, confidence: 0.8 };
    }
    if (typeof record.name === "string" && !seed.name) {
      fields.name = { value: record.name, confidence: 0.85 };
    }
  }

  return {
    source,
    fields,
    hasData: Object.keys(fields).length > 0,
  };
}

/**
 * Get all providers that have capability enrichment enabled for an entity type.
 */
export async function getCapabilityEnabledProviders(
  entityType: EnrichableEntityType
): Promise<string[]> {
  const capabilities = ENTITY_ENRICHMENT_CAPABILITIES[entityType];
  if (!capabilities || capabilities.length === 0) {
    return [];
  }

  const supabase = createAdminClient();

  const { data: rows } = await supabase
    .from("tool_capabilities")
    .select("provider_key")
    .eq("capability_enrichment_enabled", true)
    .in("capability_key", capabilities);

  if (!rows) {
    return [];
  }

  return [...new Set(rows.map((r) => r.provider_key))];
}
