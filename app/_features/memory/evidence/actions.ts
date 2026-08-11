"use server";

/**
 * Evidence Actions
 *
 * Mutations for accumulating and managing pending evidence.
 *
 * Threshold behavior (plays canon Phase 2): record proposals never write
 * play_runs. Suggest-tier evidence carries status='suggested' and the
 * Memory → Filter Watching lane renders it with one-tap Add to Memory.
 * The auto tier (P6 + P7: calibrated AND relationship-grade) creates
 * records directly.
 */

import { createClient } from "@/app/_lib/supabase/server";
import {
  toLearningDbEntityType,
  type LearningEntityType,
} from "@/app/_lib/learning";
import {
  SIGNAL_WEIGHTS,
  canonicalizeIdentifier,
  accumulateEvidence,
  evaluateEvidence,
  logOddsToProbability,
  type IntakeEntityType,
} from "@/app/_features/memory/care/intake";
import { autoCreateRecord } from "./auto-create-record";
import {
  extractedFieldPlainValues,
  hasRelationshipGradeSignal,
  mergeExtractedFields,
} from "./route-intake-proposal";
import type {
  AddSignalInput,
  AddSignalResult,
  ExtractedFieldValue,
} from "./types";

function toPendingEvidenceDbType(entityType: IntakeEntityType): string {
  return toLearningDbEntityType(entityType as LearningEntityType);
}

/**
 * Add a signal to pending evidence.
 *
 * Creates new evidence if this identifier hasn't been seen before.
 * Accumulates log-odds score and updates status based on thresholds.
 */
export async function addSignalToEvidence(
  input: AddSignalInput
): Promise<AddSignalResult> {
  const supabase = await createClient();

  const canonicalId = canonicalizeIdentifier(input.entityType, input.identifier);
  const weight = SIGNAL_WEIGHTS[input.signal] ?? 0;

  // Check for existing evidence (DB still stores resources as `"file"`)
  const { data: existing } = await supabase
    .from("pending_evidence")
    .select("*")
    .eq("workspace_id", input.workspaceId)
    .eq("entity_type", toPendingEvidenceDbType(input.entityType))
    .eq("identifier", canonicalId)
    .single();

  if (existing) {
    // Update existing evidence
    const previousScore = existing.log_odds_score;
    const newScore = accumulateEvidence(previousScore, input.signal);
    const action = evaluateEvidence(input.entityType, newScore);

    // Merge extracted data
    const existingFields = existing.extracted_fields || {};
    const mergedFields = mergeExtractedFields(
      existingFields,
      input.extractedData || {},
      input.captureId
    );

    // Determine new status
    let newStatus = existing.status;
    if (action === "suggest" && existing.status === "watching") {
      newStatus = "suggested";
    } else if (action === "dismiss" && existing.status === "watching") {
      newStatus = "dismissed";
    }

    // Update evidence
    await supabase
      .from("pending_evidence")
      .update({
        log_odds_score: newScore,
        status: newStatus,
        last_signal_at: new Date().toISOString(),
        extracted_fields: mergedFields,
        dismissed_at:
          newStatus === "dismissed" ? new Date().toISOString() : null,
        dismissed_reason:
          newStatus === "dismissed" ? "Auto-dismissed: too much negative evidence" : null,
      })
      .eq("id", existing.id);

    // Add signal record
    await supabase.from("pending_evidence_signals").insert({
      evidence_id: existing.id,
      signal: input.signal,
      weight,
      capture_id: input.captureId,
      extracted_data: input.extractedData || {},
    });

    // Handle threshold transitions. Plays canon Phase 2: proposals never
    // write play_runs — suggest-tier rows carry status='suggested' and the
    // Memory → Filter Watching lane renders them directly.
    if (existing.status === "watching") {
      // Fetch all signals for this evidence (for count and worthiness check)
      const { data: signalRows } = await supabase
        .from("pending_evidence_signals")
        .select("signal")
        .eq("evidence_id", existing.id);

      const signalCount = (signalRows?.length ?? 0) + 1;
      const allSignals = [...(signalRows?.map((r) => r.signal as string) ?? []), input.signal];
      const isWorthy = hasRelationshipGradeSignal(allSignals);
      // Resources never auto-create from background paths: they stay
      // confirm-only (only the confirm path supplies an acting user).
      const canAutoCreate = isWorthy && input.entityType !== "resource";

      if (action === "auto" && canAutoCreate) {
        // P6 + P7: Auto-create only if relationship-grade worthy
        await autoCreateRecord({
          workspaceId: input.workspaceId,
          evidenceId: existing.id,
          entityType: input.entityType,
          identifier: canonicalId,
          confidence: logOddsToProbability(newScore),
          extractedFields: mergedFields,
          signalCount,
          captureId: input.captureId,
        });
      } else if (action === "auto") {
        // P7: confidence passed but not relationship-grade (or the entity
        // is confirm-only) — surface as a suggested candidate instead.
        await supabase
          .from("pending_evidence")
          .update({ status: "suggested" })
          .eq("id", existing.id);
      }
    }

    return {
      evidenceId: existing.id,
      newScore,
      previousScore,
      action,
      isNew: false,
    };
  } else {
    // Create new evidence
    const newScore = accumulateEvidence(0, input.signal);
    const action = evaluateEvidence(input.entityType, newScore);

    const initialFields = input.extractedData
      ? Object.fromEntries(
          Object.entries(input.extractedData).map(([key, value]) => [
            key,
            {
              value,
              confidence: 80,
              sources: input.captureId ? [input.captureId] : [],
            },
          ])
        )
      : {};

    const status =
      action === "suggest"
        ? "suggested"
        : action === "dismiss"
          ? "dismissed"
          : "watching";

    const { data: newEvidence, error } = await supabase
      .from("pending_evidence")
      .insert({
        workspace_id: input.workspaceId,
        entity_type: toPendingEvidenceDbType(input.entityType),
        identifier: canonicalId,
        log_odds_score: newScore,
        status,
        extracted_fields: initialFields,
        dismissed_at: status === "dismissed" ? new Date().toISOString() : null,
        dismissed_reason:
          status === "dismissed"
            ? "Auto-dismissed: initial signal was too negative"
            : null,
      })
      .select()
      .single();

    if (error) throw error;

    // Add signal record
    await supabase.from("pending_evidence_signals").insert({
      evidence_id: newEvidence.id,
      signal: input.signal,
      weight,
      capture_id: input.captureId,
      extracted_data: input.extractedData || {},
    });

    // Handle immediate threshold crossing (e.g., very strong signal).
    // Plays canon Phase 2: proposals never write play_runs — the row was
    // inserted with status='suggested' above when the suggest bar cleared,
    // and the Memory → Filter Watching lane renders it directly.
    const isWorthy = hasRelationshipGradeSignal([input.signal]);
    // Files never auto-create from background paths (see above).
    const canAutoCreate = isWorthy && input.entityType !== "resource";

    if (action === "auto" && canAutoCreate) {
      // P6 + P7: Auto-create only if relationship-grade worthy
      await autoCreateRecord({
        workspaceId: input.workspaceId,
        evidenceId: newEvidence.id,
        entityType: input.entityType,
        identifier: canonicalId,
        confidence: logOddsToProbability(newScore),
        extractedFields: initialFields,
        signalCount: 1,
        captureId: input.captureId,
      });
    } else if (action === "auto") {
      // P7: confidence passed but not relationship-grade (or the entity
      // is confirm-only) — surface as a suggested candidate instead.
      await supabase
        .from("pending_evidence")
        .update({ status: "suggested" })
        .eq("id", newEvidence.id);
    }

    return {
      evidenceId: newEvidence.id,
      newScore,
      previousScore: 0,
      action,
      isNew: true,
    };
  }
}

/**
 * Dismiss pending evidence (stop watching).
 */
export async function dismissEvidence(
  evidenceId: string,
  reason?: string
): Promise<void> {
  const supabase = await createClient();

  await supabase
    .from("pending_evidence")
    .update({
      status: "dismissed",
      dismissed_at: new Date().toISOString(),
      dismissed_reason: reason || "User dismissed",
    })
    .eq("id", evidenceId);
}

/**
 * Mark evidence as created (record was added).
 */
export async function markEvidenceCreated(
  evidenceId: string,
  recordId: string
): Promise<void> {
  const supabase = await createClient();

  await supabase
    .from("pending_evidence")
    .update({
      status: "created",
      created_record_id: recordId,
      created_at: new Date().toISOString(),
    })
    .eq("id", evidenceId);
}

/**
 * Restore dismissed evidence back to watching.
 */
export async function restoreEvidence(evidenceId: string): Promise<void> {
  const supabase = await createClient();

  await supabase
    .from("pending_evidence")
    .update({
      status: "watching",
      dismissed_at: null,
      dismissed_reason: null,
    })
    .eq("id", evidenceId);
}
