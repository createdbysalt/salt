/**
 * memoryGetEvidence - Pending Evidence Retrieval Tool
 *
 * Returns all pending (unresolved) evidence for an entity,
 * grouped by field. Shows what's accumulating but not yet applied.
 *
 * @example
 * ```ts
 * const { pending } = await memoryGetEvidence({
 *   workspaceId: "...",
 *   entityType: "person",
 *   entityId: "...",
 * });
 *
 * // pending[0].field === "relationship_type"
 * // pending[0].aggregatedConfidence === 75
 * // pending[0].meetsThreshold === false
 * ```
 */

import { getPendingEvidenceForEntity } from "@/app/_lib/learning";
import { getWorkspaceThreshold } from "./get-threshold";
import type {
  GetEvidenceInput,
  GetEvidenceResult,
  PendingEvidence,
} from "./types";

/**
 * Get pending evidence for an entity.
 */
export async function memoryGetEvidence(
  input: GetEvidenceInput
): Promise<GetEvidenceResult> {
  // Get all pending evidence grouped by field
  const evidenceMap = await getPendingEvidenceForEntity(
    input.workspaceId,
    input.entityType,
    input.entityId
  );

  // Get threshold for this entity type
  const { threshold } = await getWorkspaceThreshold(
    input.workspaceId,
    input.entityType
  );

  // Convert to result format
  const pending: PendingEvidence[] = [];

  for (const [field, aggregated] of evidenceMap) {
    // Filter to specific field if requested
    if (input.field && field !== input.field) continue;

    pending.push({
      field,
      proposedValue: aggregated.proposedValue,
      aggregatedConfidence: aggregated.aggregatedConfidence,
      evidenceCount: aggregated.evidenceCount,
      sourceTypes: [], // TODO: Track source types in aggregation
      oldestAt: aggregated.oldestEvidenceAt,
      newestAt: aggregated.newestEvidenceAt,
      meetsThreshold: aggregated.aggregatedConfidence >= threshold,
      threshold,
    });
  }

  // Sort by confidence (highest first)
  pending.sort((a, b) => b.aggregatedConfidence - a.aggregatedConfidence);

  return {
    entityType: input.entityType,
    entityId: input.entityId,
    pending,
  };
}

/**
 * Check if any pending evidence meets threshold and is ready to apply.
 */
export async function memoryCheckReadyEvidence(
  workspaceId: string,
  entityType: GetEvidenceInput["entityType"],
  entityId: string
): Promise<PendingEvidence[]> {
  const { pending } = await memoryGetEvidence({
    workspaceId,
    entityType,
    entityId,
  });

  return pending.filter((p) => p.meetsThreshold);
}
