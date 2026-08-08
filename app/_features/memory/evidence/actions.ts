"use server";

/**
 * Evidence Actions
 *
 * Mutations for accumulating and managing pending evidence.
 * Creates plays in the approval queue when thresholds are reached.
 */

import { createClient } from "@/app/_lib/supabase/server";
import {
  SIGNAL_WEIGHTS,
  canonicalizeIdentifier,
  accumulateEvidence,
  evaluateEvidence,
  logOddsToProbability,
} from "@/app/_features/memory/care/intake";
import { createIntakePlayRun } from "@/app/_features/plays/services/create-intake-play-run";
import { autoCreateRecord } from "./auto-create-record";
import type {
  AddSignalInput,
  AddSignalResult,
  ExtractedFieldValue,
} from "./types";

/**
 * P7: Relationship-grade signals indicate a real relationship worth tracking.
 * Records should only auto-create when there's evidence of actual relationship.
 *
 * Relationship-grade signals:
 * - Payment: invoice, payment, billing signals
 * - User reply: sent email to them (not just received)
 * - Calendar co-presence: meeting attendance
 * - Contract/proposal: formal business documents
 */
const RELATIONSHIP_GRADE_SIGNALS = new Set([
  // Payment signals
  "invoice_attachment_detected",
  "invoice_addressee_unknown",
  "invoice_from_unknown_company",
  "invoice_line_items_suggest_project",
  "payment_notification_email",
  "stripe_webhook_payment",
  "receipt_attachment_detected",
  "receipt_detected",
  "email_mentions_amount_due",

  // User reply signals (sent, not just received)
  "email_to_unknown_address",

  // Calendar co-presence
  "meeting_attendee_unknown",
  "calendar_event_created",
  "calendar_invite_received",
  "email_scheduling_discussion",
  "zoom_invite_detected",

  // Contract/proposal signals
  "contract_detected",
  "contract_mentions_company",
  "msa_detected",
  "nda_detected",
  "signature_request_received",
  "proposal_detected",
  "proposal_or_sow_attached",
  "sow_detected",
  "brief_detected",

  // Deliverables (implies active work relationship)
  "deliverable_detected",
  "asset_delivered",
  "approval_detected",
  "feedback_detected",
]);

/**
 * Check if a set of signals contains relationship-grade evidence.
 * P7: Worthiness (relevance) is separate from confidence (accuracy).
 */
function hasRelationshipGradeSignal(signals: string[]): boolean {
  return signals.some((signal) => RELATIONSHIP_GRADE_SIGNALS.has(signal));
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

  // Check for existing evidence
  const { data: existing } = await supabase
    .from("pending_evidence")
    .select("*")
    .eq("workspace_id", input.workspaceId)
    .eq("entity_type", input.entityType)
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

    // Handle threshold transitions
    if (existing.status === "watching") {
      // Fetch all signals for this evidence (for count and worthiness check)
      const { data: signalRows } = await supabase
        .from("pending_evidence_signals")
        .select("signal")
        .eq("evidence_id", existing.id);

      const signalCount = (signalRows?.length ?? 0) + 1;
      const allSignals = [...(signalRows?.map((r) => r.signal as string) ?? []), input.signal];
      const isWorthy = hasRelationshipGradeSignal(allSignals);

      if (action === "auto" && isWorthy) {
        // P6 + P7: Auto-create only if relationship-grade worthy
        await autoCreateRecord({
          workspaceId: input.workspaceId,
          evidenceId: existing.id,
          entityType: input.entityType,
          identifier: canonicalId,
          confidence: logOddsToProbability(newScore),
          extractedFields: mergedFields,
          signalCount,
        });
      } else if (action === "auto" && !isWorthy) {
        // P7: Confidence passed but not relationship-grade — route to suggest
        await createIntakePlayRun({
          workspaceId: input.workspaceId,
          evidenceId: existing.id,
          entityType: input.entityType,
          identifier: canonicalId,
          confidence: logOddsToProbability(newScore),
          extractedFields: mergedFields,
          signalCount,
          autoCreate: false,
        });
      } else if (action === "suggest") {
        // Route to Plays Queue for user approval
        await createIntakePlayRun({
          workspaceId: input.workspaceId,
          evidenceId: existing.id,
          entityType: input.entityType,
          identifier: canonicalId,
          confidence: logOddsToProbability(newScore),
          extractedFields: mergedFields,
          signalCount,
          autoCreate: false,
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
        entity_type: input.entityType,
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

    // Handle immediate threshold crossing (e.g., very strong signal)
    // P7: Check if the signal is relationship-grade
    const isWorthy = hasRelationshipGradeSignal([input.signal]);

    if (action === "auto" && isWorthy) {
      // P6 + P7: Auto-create only if relationship-grade worthy
      await autoCreateRecord({
        workspaceId: input.workspaceId,
        evidenceId: newEvidence.id,
        entityType: input.entityType,
        identifier: canonicalId,
        confidence: logOddsToProbability(newScore),
        extractedFields: initialFields,
        signalCount: 1,
      });
    } else if (action === "auto" && !isWorthy) {
      // P7: Confidence passed but not relationship-grade — route to suggest
      await createIntakePlayRun({
        workspaceId: input.workspaceId,
        evidenceId: newEvidence.id,
        entityType: input.entityType,
        identifier: canonicalId,
        confidence: logOddsToProbability(newScore),
        extractedFields: initialFields,
        signalCount: 1,
        autoCreate: false,
      });
    } else if (action === "suggest") {
      // Route to Plays Queue for user approval
      await createIntakePlayRun({
        workspaceId: input.workspaceId,
        evidenceId: newEvidence.id,
        entityType: input.entityType,
        identifier: canonicalId,
        confidence: logOddsToProbability(newScore),
        extractedFields: initialFields,
        signalCount: 1,
        autoCreate: false,
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

/**
 * Merge extracted fields from a new signal into existing fields.
 */
function mergeExtractedFields(
  existing: Record<string, ExtractedFieldValue>,
  newData: Record<string, string>,
  captureId?: string
): Record<string, ExtractedFieldValue> {
  const merged = { ...existing };

  for (const [key, value] of Object.entries(newData)) {
    if (!value) continue;

    if (merged[key]) {
      // Field already exists - update if new value matches or has higher implied confidence
      if (merged[key].value === value) {
        // Same value - add source
        if (captureId && !merged[key].sources.includes(captureId)) {
          merged[key].sources.push(captureId);
          // Increase confidence slightly with corroboration
          merged[key].confidence = Math.min(99, merged[key].confidence + 2);
        }
      } else {
        // Different value - only replace if we have more sources for the new one
        // (This is a simplification; in production you'd want more sophisticated conflict resolution)
        // For now, keep the existing value but note the conflict
      }
    } else {
      // New field
      merged[key] = {
        value,
        confidence: 80,
        sources: captureId ? [captureId] : [],
      };
    }
  }

  return merged;
}
