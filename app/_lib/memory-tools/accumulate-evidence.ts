/**
 * memoryAccumulateEvidence - Evidence Accumulation Tool
 *
 * Thin wrapper around the learning module's accumulateEvidence.
 * Use this when you want to add evidence without triggering the
 * threshold check (e.g., when gathering observations before a decision).
 *
 * For most use cases, prefer memoryUpdateField which handles both
 * accumulation and threshold checking.
 */

import {
  accumulateEvidence as coreAccumulate,
  getAggregatedConfidence,
} from "@/app/_lib/learning";
import { getWorkspaceThreshold } from "./get-threshold";
import type { AccumulateInput, AccumulateResult } from "./types";

/**
 * Accumulate evidence for a field without applying changes.
 *
 * Use this when:
 * - You want to observe/record without triggering updates
 * - Building confidence over multiple observations
 * - Gathering evidence before letting memoryUpdateField decide
 */
export async function memoryAccumulateEvidence(
  input: AccumulateInput
): Promise<AccumulateResult> {
  const { evidenceId, aggregatedConfidence } = await coreAccumulate({
    workspaceId: input.workspaceId,
    entityType: input.entityType,
    entityId: input.entityId,
    fieldPath: input.field,
    proposedValue: input.value,
    confidence: input.confidence,
    evidenceType: input.evidenceType,
    evidenceDetails: {
      because: input.because,
      source: input.source,
      ...input.sourceDetails,
    },
    sourceType: input.source,
    sourceCaptureId: input.sourceDetails?.captureId,
    sourceExternalId: input.sourceDetails?.externalId,
    playbookSlug: input.sourceDetails?.playbookSlug,
  });

  // Get full aggregation stats
  const aggregated = await getAggregatedConfidence(
    input.workspaceId,
    input.entityType,
    input.entityId,
    input.field
  );

  // Get threshold to report if we're ready
  const { threshold } = await getWorkspaceThreshold(
    input.workspaceId,
    input.entityType,
    input.field
  );

  return {
    evidenceId,
    aggregatedConfidence,
    evidenceCount: aggregated?.evidenceCount ?? 1,
    sourceTypeCount: aggregated?.sourceTypeCount ?? 1,
    meetsThreshold: aggregatedConfidence >= threshold,
    threshold,
  };
}
