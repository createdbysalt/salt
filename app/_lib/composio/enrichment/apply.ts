import "server-only";

/**
 * Enrichment Apply Module
 *
 * Write-through from enrichment results to Memory records using the
 * confidence-gated memory tools. Per AD-1/AD-2:
 * - Uses getWorkspaceThreshold() from execution-router (same as Memory Care)
 * - High-confidence fields → memoryUpdateField (may auto-apply)
 * - Low-confidence fields → memoryAccumulateEvidence (gather more signal)
 *
 * This is the bridge between Ask Salt intake and the Memory Learn pipeline.
 */

import type { EnrichmentResult, EnrichableEntityType } from "./types";
import { memoryUpdateField } from "@/app/_lib/memory-tools/update-field";
import { memoryAccumulateEvidence } from "@/app/_lib/memory-tools/accumulate-evidence";
import type { LearningEntityType } from "@/app/_lib/learning";

export interface ApplyEnrichmentInput {
  workspaceId: string;
  entityType: EnrichableEntityType;
  entityId: string;
  entityLabel: string;
  enrichmentResult: EnrichmentResult;
}

export interface AppliedField {
  field: string;
  value: string | number | boolean;
  confidence: number;
  source: string;
  action: "applied" | "accumulated";
}

export interface ApplyEnrichmentResult {
  appliedFields: AppliedField[];
  accumulatedFields: AppliedField[];
  skippedFields: string[];
  summary: string;
}

function toLearningEntityType(entityType: EnrichableEntityType): LearningEntityType {
  const mapping: Record<EnrichableEntityType, LearningEntityType> = {
    person: "person",
    org: "organization",
    work: "work",
    billing: "billing",
    meeting: "meeting",
    file: "file",
    me: "me",
  };
  return mapping[entityType];
}

/**
 * Apply enrichment results to a Memory entity.
 *
 * For each field in the enrichment result:
 * - If confidence >= threshold → memoryUpdateField (may auto-apply)
 * - If confidence < threshold → memoryAccumulateEvidence
 *
 * Returns summary of what was applied vs accumulated for the model to report.
 */
export async function applyEnrichmentToEntity(
  input: ApplyEnrichmentInput
): Promise<ApplyEnrichmentResult> {
  const { workspaceId, entityType, entityId, entityLabel, enrichmentResult } = input;
  const learningEntityType = toLearningEntityType(entityType);

  const appliedFields: AppliedField[] = [];
  const accumulatedFields: AppliedField[] = [];
  const skippedFields: string[] = [];

  for (const [field, sourced] of Object.entries(enrichmentResult.fields)) {
    if (!sourced.value) {
      skippedFields.push(field);
      continue;
    }

    const confidencePercent = Math.round(sourced.confidence * 100);

    try {
      const result = await memoryUpdateField({
        workspaceId,
        entityType: learningEntityType,
        entityId,
        field,
        value: sourced.value,
        confidence: confidencePercent,
        because: `Enrichment from ${sourced.source}`,
        source: "enrichment",
        sourceDetails: {
          externalId: sourced.raw,
        },
        evidenceChain: [
          {
            type: "external",
            key: `enrichment:${sourced.source}`,
            value: sourced.value,
            confidence: confidencePercent,
            source: sourced.source,
            label: `Found in ${sourced.source}`,
          },
        ],
      });

      const appliedField: AppliedField = {
        field,
        value: sourced.value,
        confidence: confidencePercent,
        source: sourced.source,
        action: result.action === "applied" ? "applied" : "accumulated",
      };

      if (result.action === "applied") {
        appliedFields.push(appliedField);
      } else {
        accumulatedFields.push(appliedField);
      }
    } catch (error) {
      console.error(`[enrichment:apply] Failed to apply ${field}:`, error);
      skippedFields.push(field);
    }
  }

  const summary = buildSummary(entityLabel, appliedFields, accumulatedFields, skippedFields);

  return {
    appliedFields,
    accumulatedFields,
    skippedFields,
    summary,
  };
}

/**
 * Accumulate enrichment evidence without applying.
 *
 * Use this when you want to gather evidence before the entity exists
 * or when enrichment confidence is always below threshold.
 */
export async function accumulateEnrichmentEvidence(
  input: Omit<ApplyEnrichmentInput, "entityLabel">
): Promise<{
  accumulatedFields: string[];
  summary: string;
}> {
  const { workspaceId, entityType, entityId, enrichmentResult } = input;
  const learningEntityType = toLearningEntityType(entityType);

  const accumulatedFields: string[] = [];

  for (const [field, sourced] of Object.entries(enrichmentResult.fields)) {
    if (!sourced.value) continue;

    const confidencePercent = Math.round(sourced.confidence * 100);

    try {
      await memoryAccumulateEvidence({
        workspaceId,
        entityType: learningEntityType,
        entityId,
        field,
        value: sourced.value,
        confidence: confidencePercent,
        evidenceType: "behavioral_signal",
        because: `Enrichment from ${sourced.source}`,
        source: "enrichment",
        sourceDetails: {
          externalId: sourced.raw,
        },
      });

      accumulatedFields.push(field);
    } catch (error) {
      console.error(`[enrichment:accumulate] Failed to accumulate ${field}:`, error);
    }
  }

  return {
    accumulatedFields,
    summary: accumulatedFields.length > 0
      ? `Accumulated evidence for ${accumulatedFields.join(", ")}`
      : "No fields accumulated",
  };
}

function buildSummary(
  entityLabel: string,
  applied: AppliedField[],
  accumulated: AppliedField[],
  skipped: string[]
): string {
  const parts: string[] = [];

  if (applied.length > 0) {
    const fieldList = applied.map((f) => `${f.field} (${f.confidence}%)`).join(", ");
    parts.push(`Applied to ${entityLabel}: ${fieldList}`);
  }

  if (accumulated.length > 0) {
    const fieldList = accumulated.map((f) => `${f.field} (${f.confidence}%)`).join(", ");
    parts.push(`Accumulated evidence for: ${fieldList}`);
  }

  if (skipped.length > 0 && parts.length === 0) {
    parts.push(`No fields applied (skipped: ${skipped.join(", ")})`);
  }

  return parts.join(". ") || "No enrichment data to apply";
}
