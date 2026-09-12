/**
 * Add Signal to Evidence (system lane)
 *
 * Creates new evidence if this identifier hasn't been seen before.
 * Accumulates log-odds score and updates status based on thresholds.
 *
 * Memory is fully autonomous: crossing the entity's auto bar creates the
 * record directly — the threshold IS the auto-apply, with no calibration
 * or worthiness gates. Correction ("That's wrong" on the Handled lane)
 * replaces approval. Suggest-tier evidence carries status='suggested' and
 * keeps accumulating signals in the background.
 *
 * NOT a "use server" module: this runs from crons and backlog scripts with
 * no request scope, so it uses the admin client — `cookies()` would throw
 * (same trap as hydrate-capture).
 */

import { createAdminClient } from "@/app/_lib/supabase/admin";
import type { Json } from "@/app/_lib/supabase/database.types";
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
import { mergeExtractedFields } from "./route-intake-proposal";
import type {
  AddSignalInput,
  AddSignalResult,
  ExtractedFieldValue,
} from "./types";

function toPendingEvidenceDbType(entityType: IntakeEntityType): string {
  return toLearningDbEntityType(entityType as LearningEntityType);
}

export async function addSignalToEvidence(
  input: AddSignalInput
): Promise<AddSignalResult> {
  const supabase = createAdminClient();

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
    // Terminal states are final: the user dismissed this identifier, or the
    // record already exists. Accumulating further would grow a score that
    // can never act (and re-merge fields nobody will read) — skip the
    // update, the merge, and the provenance row entirely, matching
    // routeIntakeProposal's terminal-state skip.
    if (existing.status === "dismissed" || existing.status === "created") {
      return {
        evidenceId: existing.id,
        newScore: existing.log_odds_score,
        previousScore: existing.log_odds_score,
        action: evaluateEvidence(input.entityType, existing.log_odds_score),
        isNew: false,
      };
    }

    // Update existing evidence
    const previousScore = existing.log_odds_score;
    const newScore = accumulateEvidence(previousScore, input.signal);
    const action = evaluateEvidence(input.entityType, newScore);

    // Merge extracted data
    const existingFields = (existing.extracted_fields ?? {}) as unknown as Record<
      string,
      ExtractedFieldValue
    >;
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
        extracted_fields: mergedFields as unknown as Json,
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

    // Handle threshold transitions. Suggest-tier rows carry
    // status='suggested' and keep accumulating until the auto tier clears.
    // Both non-terminal states can still cross: a parked 'suggested' row
    // that reaches the auto bar creates the record.
    if (existing.status === "watching" || existing.status === "suggested") {
      // Fetch all signals for this evidence (for the birth log count)
      const { data: signalRows } = await supabase
        .from("pending_evidence_signals")
        .select("signal")
        .eq("evidence_id", existing.id);

      const signalCount = (signalRows?.length ?? 0) + 1;

      if (action === "auto") {
        // The threshold is the only gate — over the auto bar, the record
        // is born.
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
        extracted_fields: initialFields as unknown as Json,
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

    // Handle immediate threshold crossing (e.g., very strong signal). The
    // threshold is the only gate — over the auto bar, the record is born.
    if (action === "auto") {
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
