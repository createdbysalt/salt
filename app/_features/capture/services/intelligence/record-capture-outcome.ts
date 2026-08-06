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
  watchExpressionId?: string;
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
    insertData.watch_expression_id = input.watchExpressionId;
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
 * Find the decision record for a capture event.
 */
export async function findDecisionForCapture(
  captureEventId: string
): Promise<{ id: string; decision_tier: string; outcome: string | null } | null> {
  const admin = createAdminClient();

  const { data } = await admin
    .from("record_capture_decisions")
    .select("id, decision_tier, outcome")
    .eq("capture_event_id", captureEventId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data;
}

/**
 * Find decisions by watch expression ID.
 */
export async function findDecisionsForWatch(
  watchExpressionId: string
): Promise<{ id: string; decision_tier: string; outcome: string | null }[]> {
  const admin = createAdminClient();

  const { data } = await admin
    .from("record_capture_decisions")
    .select("id, decision_tier, outcome")
    .eq("watch_expression_id", watchExpressionId)
    .order("created_at", { ascending: false });

  return data ?? [];
}

/**
 * Expire watches that have passed their expiry date.
 * Returns the count of expired watches.
 */
export async function expireStaleWatches(
  workspaceId?: string
): Promise<number> {
  const admin = createAdminClient();

  // Find expired pending_contact watches
  let query = admin
    .from("entity_watch_expressions")
    .select("id, workspace_id")
    .eq("watch_purpose", "pending_contact")
    .lt("expires_at", new Date().toISOString());

  if (workspaceId) {
    query = query.eq("workspace_id", workspaceId);
  }

  const { data: expiredWatches } = await query;

  if (!expiredWatches || expiredWatches.length === 0) {
    return 0;
  }

  // Mark associated decisions as expired
  const watchIds = expiredWatches.map((w) => w.id);

  await admin
    .from("record_capture_decisions")
    .update({
      outcome: "expired",
      outcome_at: new Date().toISOString(),
    })
    .in("watch_expression_id", watchIds)
    .is("outcome", null);

  // Delete the expired watches
  const { error } = await admin
    .from("entity_watch_expressions")
    .delete()
    .in("id", watchIds);

  if (error) {
    console.error("[record-capture-outcome] Failed to delete expired watches:", error.message);
    return 0;
  }

  return expiredWatches.length;
}

// ============= Auto-Apply Gate =============

export interface AutoApplySettings {
  enabled: boolean;
  threshold: number;
  minProposals: number;
  minApprovalRate: number;
  earnedAt: string | null;
  proposalCount: number;
  approvalRate: number | null;
}

/**
 * Get auto-apply settings for a workspace.
 * Returns default settings if none exist.
 */
export async function getAutoApplySettings(
  workspaceId: string
): Promise<AutoApplySettings> {
  const admin = createAdminClient();

  const { data } = await admin
    .from("workspace_capture_settings")
    .select("*")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (!data) {
    return {
      enabled: false,
      threshold: 95,
      minProposals: 50,
      minApprovalRate: 0.9,
      earnedAt: null,
      proposalCount: 0,
      approvalRate: null,
    };
  }

  return {
    enabled: data.auto_apply_enabled ?? false,
    threshold: data.auto_apply_threshold ?? 95,
    minProposals: data.auto_apply_min_proposals ?? 50,
    minApprovalRate: data.auto_apply_min_approval_rate ?? 0.9,
    earnedAt: data.auto_apply_earned_at,
    proposalCount: data.calibration_proposal_count ?? 0,
    approvalRate: data.calibration_approval_rate,
  };
}

/**
 * Check if a CREATE proposal should auto-apply.
 * Returns true only if:
 * 1. Auto-apply is enabled for the workspace (earned through calibration)
 * 2. The proposal confidence meets or exceeds the threshold
 */
export async function shouldAutoApply(
  workspaceId: string,
  proposalConfidence: number
): Promise<boolean> {
  const settings = await getAutoApplySettings(workspaceId);

  if (!settings.enabled) return false;
  if (proposalConfidence < settings.threshold) return false;

  return true;
}

/**
 * Update calibration snapshot and check if auto-apply should be earned.
 * Called periodically (e.g., after each approval/rejection).
 */
export async function updateCalibrationSnapshot(
  workspaceId: string
): Promise<{ earned: boolean; proposalCount: number; approvalRate: number | null }> {
  const admin = createAdminClient();
  const metrics = await getCalibrationMetrics(workspaceId, 90); // Last 90 days

  const proposalCount = metrics.byTier.create.approved + metrics.byTier.create.rejected;
  const approvalRate = metrics.approvalRate;

  // Check if we should earn auto-apply
  const settings = await getAutoApplySettings(workspaceId);
  const meetsThreshold =
    proposalCount >= settings.minProposals &&
    approvalRate !== null &&
    approvalRate >= settings.minApprovalRate;

  const shouldEarn = meetsThreshold && !settings.earnedAt;

  // Upsert settings
  const { error } = await admin
    .from("workspace_capture_settings")
    .upsert({
      workspace_id: workspaceId,
      calibration_proposal_count: proposalCount,
      calibration_approval_rate: approvalRate,
      calibration_updated_at: new Date().toISOString(),
      ...(shouldEarn
        ? { auto_apply_enabled: true, auto_apply_earned_at: new Date().toISOString() }
        : {}),
    });

  if (error) {
    console.error("[record-capture-outcome] Failed to update calibration:", error.message);
  }

  return {
    earned: shouldEarn,
    proposalCount,
    approvalRate,
  };
}

// ============= Calibration Metrics =============

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
