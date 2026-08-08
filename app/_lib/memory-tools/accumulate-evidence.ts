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
 * Watching contract: evidence must carry a concrete proposed value and a
 * human-readable reason. A "gap" (missing field, diagnostic, debug probe)
 * carries neither — it must never reach entity_evidence, because everything
 * unresolved there surfaces in Memory → Filter.
 */
function validateConcreteEvidence(input: AccumulateInput): string | null {
  const { value, because } = input;

  if (value === null || value === undefined) {
    return "evidence requires a concrete value (got null/undefined)";
  }
  if (typeof value === "string" && value.trim() === "") {
    return "evidence requires a concrete value (got empty string)";
  }
  if (
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.keys(value as Record<string, unknown>).length === 0
  ) {
    return "evidence requires a concrete value (got empty object)";
  }
  if (typeof because !== "string" || because.trim() === "") {
    return "evidence requires a human-readable `because`";
  }
  return null;
}

/**
 * Accumulate evidence for a field without applying changes.
 *
 * Use this when:
 * - You want to observe/record without triggering updates
 * - Building confidence over multiple observations
 * - Gathering evidence before letting memoryUpdateField decide
 *
 * Value-less evidence is rejected at this gate: throws in development so the
 * emitting capability fails loudly; logs and skips in production so a bad
 * emitter can't pollute Watching.
 */
export async function memoryAccumulateEvidence(
  input: AccumulateInput
): Promise<AccumulateResult> {
  const validationError = validateConcreteEvidence(input);
  if (validationError) {
    const context = `${input.entityType}/${input.field} (source: ${input.source})`;
    if (process.env.NODE_ENV !== "production") {
      throw new Error(`[memoryAccumulateEvidence] ${validationError} — ${context}`);
    }
    console.error(
      `[memoryAccumulateEvidence] Rejected value-less evidence: ${validationError} — ${context}`
    );
    return {
      evidenceId: "",
      aggregatedConfidence: 0,
      evidenceCount: 0,
      sourceTypeCount: 0,
      meetsThreshold: false,
      threshold: 0,
    };
  }
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
