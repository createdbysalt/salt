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
  getFieldsForEntity,
  getWritePolicy,
  type ContractEntityType,
} from "@/app/_features/memory/taxonomy/field-registry";
import type { FieldExtraction } from "./email-analyzer";

interface ExtractableField {
  /** Field registry key (camelCase), for diagnostics. */
  registryKey: string;
  /** DB column used to check whether the field already holds a value. */
  column: string;
  /** Registry-derived provenance id for the write. */
  ruleId: string;
  /**
   * Max confidence across the field's {{extracted}} fill rules — the
   * canonical ceiling for how sure an automated extraction of this field
   * may claim to be.
   */
  confidenceCap: number;
}

/**
 * Derive the extraction allow-list from the field registry: a field is
 * extraction-writable exactly when the registry declares an {{extracted}}
 * fill rule for it and its write policy allows automated writes. This is
 * the same source of truth the Memory → Customize card renders, so the
 * write path can never drift from the advertised logic.
 */
export function buildExtractableFields(
  entityType: ContractEntityType
): Record<string, ExtractableField> {
  const map: Record<string, ExtractableField> = {};
  for (const field of getFieldsForEntity(entityType)) {
    if (!field.dbColumn) continue;
    const policy = getWritePolicy(field);
    if (policy === "user_only" || policy === "system_derived") continue;
    const extractionRules = (field.fillRules ?? []).filter(
      (rule) => rule.value === "{{extracted}}"
    );
    if (extractionRules.length === 0) continue;
    map[field.dbColumn] = {
      registryKey: field.key,
      column: field.dbColumn,
      ruleId: `${field.entityType}-${field.key}-${extractionRules[0]?.signal}`,
      confidenceCap: Math.max(...extractionRules.map((rule) => rule.confidence)),
    };
  }
  return map;
}

const PERSON_EXTRACTABLE = buildExtractableFields("person");
const ORG_EXTRACTABLE = buildExtractableFields("org");

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

    // Fill gaps only — an existing value is never overwritten by extraction.
    const existing = (currentRow as Record<string, unknown>)[descriptor.column];
    if (existing !== null && existing !== undefined && existing !== "") {
      result.skipped++;
      continue;
    }

    const confidence = Math.min(
      Math.max(0, Math.round(extraction.confidence)),
      descriptor.confidenceCap
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
          ruleId: descriptor.ruleId,
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
