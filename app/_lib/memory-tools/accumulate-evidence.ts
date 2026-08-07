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
import { createAdminClient } from "@/app/_lib/supabase/admin";
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

  await recordEvidenceActivity(input, evidenceId, aggregatedConfidence);

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

async function recordEvidenceActivity(
  input: AccumulateInput,
  evidenceId: string,
  aggregatedConfidence: number
): Promise<void> {
  try {
    const admin = createAdminClient();
    const playbookSlug = input.sourceDetails?.playbookSlug ?? null;

    const { error } = await admin.from("activity_entries").insert({
      workspace_id: input.workspaceId,
      action: "accumulated",
      title: playbookSlug
        ? `${formatPlaybookName(playbookSlug)} is watching`
        : "Salt is watching evidence",
      detail: input.because,
      metadata: {
        player_slug: "memory-care",
        auto_executed: true,
        evidence_id: evidenceId,
        entity_type: input.entityType,
        entity_id: input.entityId,
        field_path: input.field,
        confidence: input.confidence,
        aggregated_confidence: aggregatedConfidence,
        evidence_type: input.evidenceType,
        source: input.source,
        playbook_slug: playbookSlug,
        ...input.sourceDetails,
      },
    });

    if (error) {
      throw new Error(error.message);
    }
  } catch (error) {
    // Activity is a visibility layer; evidence accumulation is the source of truth.
    console.error("[memoryAccumulateEvidence] Failed to record activity:", error);
  }
}

function formatPlaybookName(slug: string): string {
  return slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
