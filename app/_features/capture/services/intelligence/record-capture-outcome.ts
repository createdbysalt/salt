/**
 * Record Capture Outcome Tracking
 *
 * Logs CREATE/WATCH/NOTHING decisions and their outcomes for calibration.
 * This data is used to:
 * - Measure proposal accuracy (% of CREATE proposals approved)
 * - Track watch graduation rates (% of WATCHes that became records)
 * - Identify signal effectiveness (which signals predict approval best)
 */

import { createAdminClient } from "@/app/_lib/supabase/admin";
import type { RecordCaptureDecision } from "../enrichment/record-capture-criteria";
import type { AdmissionSignal } from "../../types/gate-result";
import type { CaptureSenderKind } from "../../types/sender-profiles";

export type DecisionOutcome =
  | "approved"
  | "rejected"
  | "ignored"
  | "auto_applied"
  | "graduated"
  | "expired";

export interface LogDecisionInput {
  workspaceId: string;
  captureEventId: string;
  decision: RecordCaptureDecision;
  admissionScore?: number;
  admissionSignals?: AdmissionSignal[];
  hadLinkedRecords: boolean;
  senderClassification?: CaptureSenderKind | "unknown";
  senderEmail?: string | null;
  senderDomain?: string | null;
}

/**
 * Log a record capture decision for outcome tracking.
 */
export async function logRecordCaptureDecision(
  input: LogDecisionInput
): Promise<string | null> {
  const admin = createAdminClient();

  const insertData: Record<string, unknown> = {
    workspace_id: input.workspaceId,
    capture_event_id: input.captureEventId,
    decision_tier: input.decision.tier,
    decision_reason: input.decision.reason,
    admission_score: input.admissionScore,
    admission_signals: input.admissionSignals,
    had_linked_records: input.hadLinkedRecords,
    sender_classification: input.senderClassification,
    sender_email: input.senderEmail,
    sender_domain: input.senderDomain,
  };

  if (input.decision.tier === "create") {
    const proposals = input.decision.proposals;
    if (proposals.length > 0) {
      insertData.proposal_surface = proposals[0].surface;
      insertData.proposal_confidence = proposals[0].confidence;
    }
  } else if (input.decision.tier === "watch") {
    insertData.watch_type = input.decision.watchType;
    insertData.watch_target = input.decision.target;
  }

  const { data, error } = await admin
    .from("record_capture_decisions")
    .insert(insertData as never)
    .select("id")
    .single();

  if (error) {
    console.error("[record-capture-outcome] Failed to log decision:", error.message);
    return null;
  }

  return data?.id ?? null;
}

/**
 * Record the outcome of a decision.
 */
export async function recordDecisionOutcome(
  decisionId: string,
  outcome: DecisionOutcome,
  userId?: string,
  entityCreatedId?: string
): Promise<boolean> {
  const admin = createAdminClient();

  const { error } = await admin
    .from("record_capture_decisions")
    .update({
      outcome,
      outcome_at: new Date().toISOString(),
      outcome_by: userId,
      entity_created_id: entityCreatedId,
    })
    .eq("id", decisionId);

  if (error) {
    console.error("[record-capture-outcome] Failed to record outcome:", error.message);
    return false;
  }

  return true;
}

/**
 * Record an outcome for the latest unresolved decision tied to a capture.
 *
 * Watching accept/dismiss and Kept-Out corrections key off a capture id,
 * not a decision id — this bridges the two so real user feedback reaches
 * the auto-apply calibration loop (Connector Rules & Learning, P4 repair:
 * previously nothing wrote these outcomes, so the earn loop could never
 * trigger). No-ops when the capture has no pending decision row.
 */
export async function recordDecisionOutcomeForCapture(
  captureEventId: string,
  outcome: DecisionOutcome,
  userId?: string
): Promise<boolean> {
  const admin = createAdminClient();

  const { data: decision, error } = await admin
    .from("record_capture_decisions")
    .select("id")
    .eq("capture_event_id", captureEventId)
    .is("outcome", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error(
      "[record-capture-outcome] Failed to find pending decision:",
      error.message,
    );
    return false;
  }
  if (!decision) return false;

  return recordDecisionOutcome(decision.id, outcome, userId);
}

// ============= Calibration Metrics =============

// The earned auto-apply gate (workspace_capture_settings.auto_apply_*) was
// retired with memory full autonomy: the evidence threshold is the only
// gate for record birth. Decision logging and metrics below remain for
// signal-effectiveness analysis.

export interface CalibrationMetrics {
  totalDecisions: number;
  byTier: {
    create: { count: number; approved: number; rejected: number; ignored: number };
    watch: { count: number; graduated: number; expired: number };
    nothing: { count: number };
  };
  approvalRate: number | null;
  graduationRate: number | null;
  signalEffectiveness: { signal: string; approvalRate: number; count: number }[];
}

/**
 * Get calibration metrics for a workspace.
 */
export async function getCalibrationMetrics(
  workspaceId: string,
  sinceDays: number = 30
): Promise<CalibrationMetrics> {
  const admin = createAdminClient();
  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - sinceDays);

  const { data: decisions } = await admin
    .from("record_capture_decisions")
    .select("*")
    .eq("workspace_id", workspaceId)
    .gte("created_at", sinceDate.toISOString());

  const all = decisions ?? [];

  const createDecisions = all.filter((d) => d.decision_tier === "create");
  const watchDecisions = all.filter((d) => d.decision_tier === "watch");
  const nothingDecisions = all.filter((d) => d.decision_tier === "nothing");

  const createApproved = createDecisions.filter((d) => d.outcome === "approved").length;
  const createRejected = createDecisions.filter((d) => d.outcome === "rejected").length;
  const createIgnored = createDecisions.filter(
    (d) => d.outcome === "ignored" || !d.outcome
  ).length;

  const watchGraduated = watchDecisions.filter((d) => d.outcome === "graduated").length;
  const watchExpired = watchDecisions.filter((d) => d.outcome === "expired").length;

  // Calculate approval rate (only if we have outcomes)
  const createWithOutcome = createDecisions.filter((d) => d.outcome);
  const approvalRate =
    createWithOutcome.length > 0
      ? createApproved / createWithOutcome.length
      : null;

  // Calculate graduation rate (only if we have outcomes)
  const watchWithOutcome = watchDecisions.filter((d) => d.outcome);
  const graduationRate =
    watchWithOutcome.length > 0
      ? watchGraduated / watchWithOutcome.length
      : null;

  // Calculate signal effectiveness
  type SignalRow = { admission_signals: unknown[] | null; outcome: string | null };
  const signalStats = new Map<string, { approved: number; total: number }>();

  for (const decision of createDecisions as SignalRow[]) {
    if (!decision.admission_signals) continue;
    const signals = decision.admission_signals as { type: string }[];
    const isApproved = decision.outcome === "approved";

    for (const signal of signals) {
      const stats = signalStats.get(signal.type) ?? { approved: 0, total: 0 };
      stats.total++;
      if (isApproved) stats.approved++;
      signalStats.set(signal.type, stats);
    }
  }

  const signalEffectiveness = [...signalStats.entries()]
    .map(([signal, stats]) => ({
      signal,
      approvalRate: stats.total > 0 ? stats.approved / stats.total : 0,
      count: stats.total,
    }))
    .filter((s) => s.count >= 3) // Only signals with enough samples
    .sort((a, b) => b.approvalRate - a.approvalRate);

  return {
    totalDecisions: all.length,
    byTier: {
      create: {
        count: createDecisions.length,
        approved: createApproved,
        rejected: createRejected,
        ignored: createIgnored,
      },
      watch: {
        count: watchDecisions.length,
        graduated: watchGraduated,
        expired: watchExpired,
      },
      nothing: { count: nothingDecisions.length },
    },
    approvalRate,
    graduationRate,
    signalEffectiveness,
  };
}
