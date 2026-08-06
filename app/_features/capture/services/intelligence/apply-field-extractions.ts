import "server-only";

/**
 * Apply LLM Field Extractions
 *
 * Routes contract-field values extracted by the email analyzer through
 * memoryUpdateField, the confidence-gated Memory write primitive:
 * at/above the workspace threshold the value applies with provenance,
 * below it the value accumulates as pending evidence (Watching queue).
 *
 * Trust boundaries:
 * - Only allow-listed fields are writable (validated against the field
 *   registry write policy — user_only / system_derived never pass).
 * - LLM confidence is capped by the registry fill-rule confidence for the
 *   field, so a single extraction can't overstate its own certainty.
 * - Fields that already hold a value are skipped — extraction fills gaps,
 *   it does not overwrite confirmed data.
 *
 * Metering: the extraction itself rides the analyzer's existing LLM call,
 * which is metered at the app/_lib/ai spend primitive by the caller.
 * This module performs no vendor calls.
 */

import { createAdminClient } from "@/app/_lib/supabase/admin";
import { memoryUpdateField } from "@/app/_lib/memory-tools";
import {
  getFieldDescriptor,
  getWritePolicy,
  type ContractEntityType,
} from "@/app/_features/memory/taxonomy/field-registry";
import type { FieldExtraction } from "./email-analyzer";

interface ExtractableField {
  /** Field registry key (camelCase) used to resolve the write policy. */
  registryKey: string;
  /** DB column used to check whether the field already holds a value. */
  column: string;
}

const PERSON_EXTRACTABLE: Record<string, ExtractableField> = {
  phone: { registryKey: "phone", column: "phone" },
  title: { registryKey: "title", column: "title" },
  billing_email: { registryKey: "billingEmail", column: "billing_email" },
  timezone: { registryKey: "timezone", column: "timezone" },
  address_line_1: { registryKey: "addressLine1", column: "address_line_1" },
  address_line_2: { registryKey: "addressLine2", column: "address_line_2" },
  city: { registryKey: "city", column: "city" },
  state: { registryKey: "state", column: "state" },
  postal_code: { registryKey: "postalCode", column: "postal_code" },
  country: { registryKey: "country", column: "country" },
};

const ORG_EXTRACTABLE: Record<string, ExtractableField> = {
  billing_email: { registryKey: "billingEmail", column: "billing_email" },
  website: { registryKey: "website", column: "website" },
  address_line_1: { registryKey: "addressLine1", column: "address_line_1" },
  address_line_2: { registryKey: "addressLine2", column: "address_line_2" },
  city: { registryKey: "city", column: "city" },
  state: { registryKey: "state", column: "state" },
  postal_code: { registryKey: "postalCode", column: "postal_code" },
  country: { registryKey: "country", column: "country" },
  tax_id: { registryKey: "taxId", column: "tax_id" },
};

/** LLM output uses a few spellings for address lines — normalize them. */
const FIELD_ALIASES: Record<string, string> = {
  address_line1: "address_line_1",
  addressline1: "address_line_1",
  address_line2: "address_line_2",
  addressline2: "address_line_2",
  postalcode: "postal_code",
  zip: "postal_code",
  zip_code: "postal_code",
};

function normalizeFieldKey(field: string): string {
  const key = field.trim().toLowerCase().replace(/\s+/g, "_");
  return FIELD_ALIASES[key] ?? key;
}

/**
 * The registry fill-rule confidence is the canonical ceiling for how sure
 * an automated extraction of this field may claim to be.
 */
function registryConfidenceCap(
  entityType: ContractEntityType,
  registryKey: string
): number {
  const descriptor = getFieldDescriptor(entityType, registryKey);
  const ruleConfidences = (descriptor?.fillRules ?? []).map((r) => r.confidence);
  return ruleConfidences.length > 0 ? Math.max(...ruleConfidences) : 80;
}

export interface ApplyFieldExtractionsInput {
  workspaceId: string;
  /** Capture the extraction came from, for provenance. */
  captureId: string;
  /** Resolved sender person — target for entity "person" extractions. */
  personId?: string;
  /** Resolved sender org — target for entity "org" extractions. */
  orgId?: string;
  extractions: FieldExtraction[];
}

export interface ApplyFieldExtractionsResult {
  applied: number;
  accumulated: number;
  skipped: number;
}

export async function applyFieldExtractions(
  input: ApplyFieldExtractionsInput
): Promise<ApplyFieldExtractionsResult> {
  const result: ApplyFieldExtractionsResult = {
    applied: 0,
    accumulated: 0,
    skipped: 0,
  };
  if (input.extractions.length === 0) return result;

  const admin = createAdminClient();

  // Fetch current values once so extraction only fills gaps.
  const [personRow, orgRow] = await Promise.all([
    input.personId
      ? admin
          .from("people")
          .select(
            "phone, title, billing_email, timezone, address_line_1, address_line_2, city, state, postal_code, country"
          )
          .eq("id", input.personId)
          .eq("workspace_id", input.workspaceId)
          .maybeSingle()
          .then((r) => r.data)
      : Promise.resolve(null),
    input.orgId
      ? admin
          .from("organizations")
          .select(
            "billing_email, website, address_line_1, address_line_2, city, state, postal_code, country, tax_id"
          )
          .eq("id", input.orgId)
          .eq("workspace_id", input.workspaceId)
          .maybeSingle()
          .then((r) => r.data)
      : Promise.resolve(null),
  ]);

  for (const extraction of input.extractions) {
    const isPerson = extraction.entity === "person";
    const entityId = isPerson ? input.personId : input.orgId;
    const currentRow = isPerson ? personRow : orgRow;
    const allowList = isPerson ? PERSON_EXTRACTABLE : ORG_EXTRACTABLE;
    const fieldKey = normalizeFieldKey(extraction.field);
    const descriptor = allowList[fieldKey];
    const value = extraction.value.trim();

    if (!entityId || !currentRow || !descriptor || !value) {
      result.skipped++;
      continue;
    }

    // Registry write policy is the canon: never write user_only or derived.
    const registryEntityType: ContractEntityType = isPerson ? "person" : "org";
    const registryField = getFieldDescriptor(
      registryEntityType,
      descriptor.registryKey
    );
    if (registryField) {
      const policy = getWritePolicy(registryField);
      if (policy === "user_only" || policy === "system_derived") {
        result.skipped++;
        continue;
      }
    }

    // Fill gaps only — an existing value is never overwritten by extraction.
    const existing = (currentRow as Record<string, unknown>)[descriptor.column];
    if (existing !== null && existing !== undefined && existing !== "") {
      result.skipped++;
      continue;
    }

    const confidence = Math.min(
      Math.max(0, Math.round(extraction.confidence)),
      registryConfidenceCap(registryEntityType, descriptor.registryKey)
    );

    try {
      const update = await memoryUpdateField({
        workspaceId: input.workspaceId,
        entityType: isPerson ? "person" : "organization",
        entityId,
        field: fieldKey,
        value,
        confidence,
        because: extraction.evidence_quote
          ? `Extracted from capture: "${extraction.evidence_quote.slice(0, 200)}"`
          : "Extracted from capture content",
        source: "enrichment",
        sourceDetails: {
          playbookSlug: "memory-records",
          captureId: input.captureId,
          ruleId: "llm-field-extraction",
        },
      });

      if (update.action === "applied") {
        result.applied++;
      } else {
        result.accumulated++;
      }
    } catch (error) {
      // One bad field never blocks the rest of the batch.
      console.error(
        `[apply-field-extractions] Failed ${extraction.entity}.${fieldKey}:`,
        error
      );
      result.skipped++;
    }
  }

  return result;
}
