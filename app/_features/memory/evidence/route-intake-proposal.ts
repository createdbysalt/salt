/**
 * Route Intake Proposal (internal module — NOT a server action)
 *
 * Runs from webhook/cron contexts (no user session) with the admin client,
 * so it must never be reachable from the client. It lives outside
 * actions.ts deliberately: a "use server" directive makes every export a
 * public endpoint, and this function takes workspaceId from its caller
 * (Sources plan 6.3 / INV-3: workspace derives from the trusted pipeline
 * context here, never from a request payload).
 *
 * Also hosts the shared extracted-field helpers and the P7
 * relationship-grade signal vocabulary used by both this module and
 * actions.ts (which keeps the session-scoped, RLS-guarded actions).
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
  probabilityToLogOdds,
  type IntakeEntityType,
} from "@/app/_features/memory/care/intake";
import { autoCreateRecord } from "./auto-create-record";
import type { ExtractedFieldValue } from "./types";

function toPendingEvidenceDbType(entityType: IntakeEntityType): string {
  return toLearningDbEntityType(entityType as LearningEntityType);
}

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
export function hasRelationshipGradeSignal(signals: string[]): boolean {
  return signals.some((signal) => RELATIONSHIP_GRADE_SIGNALS.has(signal));
}

/**
 * Flatten extracted fields to their plain string values (for merge input
 * and signal provenance rows).
 */
export function extractedFieldPlainValues(
  fields: Record<string, ExtractedFieldValue>
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(fields)
      .filter(([, field]) => Boolean(field.value))
      .map(([key, field]) => [key, field.value])
  );
}

/**
 * Merge extracted fields from a new signal into existing fields.
 */
export function mergeExtractedFields(
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

/**
 * Input for routing a CREATE-tier capture proposal into pending_evidence.
 */
export interface RouteIntakeProposalInput {
  workspaceId: string;
  entityType: IntakeEntityType;
  identifier: string;
  /** Criteria-engine confidence (0-100 probability). */
  confidence: number;
  extractedFields: Record<string, ExtractedFieldValue>;
  /**
   * Signal names backing the proposal, in the intake SIGNAL_WEIGHTS
   * vocabulary. Used for the P7 worthiness check — callers that cannot
   * supply relationship-grade signal names fail closed to "suggested".
   */
  signals: string[];
  /** Capture event that produced the proposal (provenance). */
  captureId?: string;
  /** P6 gate: the workspace's calibration earned auto-apply. */
  autoApply: boolean;
}

export type RouteIntakeProposalResult =
  | { outcome: "created"; evidenceId: string; recordId: string }
  | { outcome: "suggested"; evidenceId: string }
  | { outcome: "skipped"; evidenceId: string };

/**
 * Route a CREATE-tier capture proposal into the evidence system.
 *
 * Plays canon Phase 2: the capture enrichment chain used to write these
 * proposals to play_runs — with a capture_events UUID posing as an evidence
 * id, so downstream pending_evidence updates silently no-oped. This entry
 * point applies the same P6 + P7 contract that addSignalToEvidence encodes:
 *
 * - P6 (earned autonomy): auto-create only when the caller's calibration
 *   gate passed (`autoApply`).
 * - P7 (worthiness): auto-create only when the proposal carries a
 *   relationship-grade signal — confidence alone is not enough.
 *
 * Everything else lands in pending_evidence with status='suggested' so the
 * Memory → Filter Watching lane renders it. Dismissed or already-created
 * evidence is never resurrected.
 */
export async function routeIntakeProposal(
  input: RouteIntakeProposalInput
): Promise<RouteIntakeProposalResult> {
  // Runs from webhook/cron contexts (no user session), so this uses the
  // admin client — matching auto-create-record and process-capture.
  const supabase = createAdminClient();

  const canonicalId = canonicalizeIdentifier(input.entityType, input.identifier);
  // Clamp away from the asymptotes so the stored log-odds stays finite.
  const clampedConfidence = Math.min(99, Math.max(1, Math.round(input.confidence)));
  const proposalScore = probabilityToLogOdds(clampedConfidence);

  const { data: existing } = await supabase
    .from("pending_evidence")
    .select("id, status, log_odds_score, extracted_fields")
    .eq("workspace_id", input.workspaceId)
    .eq("entity_type", toPendingEvidenceDbType(input.entityType))
    .eq("identifier", canonicalId)
    .single();

  let evidenceId: string;

  if (existing) {
    // Respect terminal states: the user said no, or the record already exists.
    if (existing.status === "dismissed" || existing.status === "created") {
      return { outcome: "skipped", evidenceId: existing.id };
    }

    // Boundary cast out of the Json column; this shape is written by
    // addSignalToEvidence / routeIntakeProposal above.
    const existingFields = (existing.extracted_fields ?? {}) as unknown as Record<
      string,
      ExtractedFieldValue
    >;
    const mergedFields = mergeExtractedFields(
      existingFields,
      extractedFieldPlainValues(input.extractedFields),
      input.captureId
    );

    await supabase
      .from("pending_evidence")
      .update({
        status: "suggested",
        log_odds_score: Math.max(existing.log_odds_score, proposalScore),
        last_signal_at: new Date().toISOString(),
        extracted_fields: mergedFields as unknown as Json,
      })
      .eq("id", existing.id);

    evidenceId = existing.id;
  } else {
    const { data: newEvidence, error } = await supabase
      .from("pending_evidence")
      .insert({
        workspace_id: input.workspaceId,
        entity_type: toPendingEvidenceDbType(input.entityType),
        identifier: canonicalId,
        log_odds_score: proposalScore,
        status: "suggested",
        extracted_fields: input.extractedFields as unknown as Json,
      })
      .select()
      .single();

    if (error) throw error;

    evidenceId = newEvidence.id;
  }

  // Provenance: record what put this identifier on the suggested lane.
  const primarySignal = input.signals[0] ?? "capture_create_decision";
  await supabase.from("pending_evidence_signals").insert({
    evidence_id: evidenceId,
    signal: primarySignal,
    weight: SIGNAL_WEIGHTS[primarySignal] ?? 0,
    capture_id: input.captureId ?? null,
    extracted_data: extractedFieldPlainValues(input.extractedFields),
  });

  // P6 + P7: auto-create only with earned calibration AND relationship-grade
  // evidence. On failure (e.g. missing name), fall back to the suggested lane.
  // Resources are confirm-only — skip the attempt entirely instead of
  // failing closed on every proposal.
  if (
    input.autoApply &&
    input.entityType !== "resource" &&
    hasRelationshipGradeSignal(input.signals)
  ) {
    const created = await autoCreateRecord({
      workspaceId: input.workspaceId,
      evidenceId,
      entityType: input.entityType,
      identifier: canonicalId,
      confidence: clampedConfidence,
      extractedFields: input.extractedFields,
      signalCount: Math.max(input.signals.length, 1),
      captureId: input.captureId,
    });
    if (created.ok) {
      return { outcome: "created", evidenceId, recordId: created.recordId };
    }
  }

  return { outcome: "suggested", evidenceId };
}
