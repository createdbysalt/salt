/**
 * Outcome Tracking
 *
 * Detects and records what happened after each play to feed the GROW loop.
 * Outcomes are used for confidence calibration and playbook evolution.
 *
 * Part of the LEARN → ACT → GROW loop (Phase 6).
 */

import { createAdminClient } from "@/app/_lib/supabase/admin";

export type OutcomeType = "positive" | "negative" | "neutral" | "timeout";

export type OutcomeExpected =
  | "reply"
  | "payment"
  | "booking"
  | "confirmation"
  | "click"
  | "none";

export interface RecordOutcomeInput {
  workspaceId: string;
  playRunId: string;
  outcomeType: OutcomeType;
  outcomeValue?: Record<string, unknown>;
}

export interface SetExpectedOutcomeInput {
  workspaceId: string;
  playRunId: string;
  outcomeExpected: OutcomeExpected;
  outcomeWindowHours?: number;
}

const DEFAULT_OUTCOME_WINDOWS: Record<OutcomeExpected, number> = {
  reply: 72,
  payment: 168,
  booking: 48,
  confirmation: 24,
  click: 24,
  none: 0,
};

export async function setExpectedOutcome(
  input: SetExpectedOutcomeInput
): Promise<{ success: boolean; error?: string }> {
  const admin = createAdminClient();

  const windowHours =
    input.outcomeWindowHours ??
    DEFAULT_OUTCOME_WINDOWS[input.outcomeExpected] ??
    72;

  const { error } = await admin
    .from("play_runs")
    .update({
      outcome_expected: input.outcomeExpected,
      outcome_window_hours: windowHours,
    })
    .eq("id", input.playRunId)
    .eq("workspace_id", input.workspaceId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function recordOutcome(
  input: RecordOutcomeInput
): Promise<{ success: boolean; error?: string }> {
  const admin = createAdminClient();
  const now = new Date().toISOString();

  const { error } = await admin
    .from("play_runs")
    .update({
      outcome_type: input.outcomeType,
      outcome_at: now,
    })
    .eq("id", input.playRunId)
    .eq("workspace_id", input.workspaceId);

  if (error) {
    return { success: false, error: error.message };
  }

  await admin.from("activity_entries").insert({
    workspace_id: input.workspaceId,
    play_run_id: input.playRunId,
    action: "outcome_recorded",
    title: `Outcome: ${input.outcomeType}`,
    metadata: {
      outcome_type: input.outcomeType,
      outcome_value: input.outcomeValue,
    },
  });

  return { success: true };
}

export interface PendingOutcomePlay {
  id: string;
  workspaceId: string;
  title: string;
  outcomeExpected: OutcomeExpected;
  outcomeWindowHours: number;
  ranAt: string;
  targetType: string | null;
  targetId: string | null;
  metadata: Record<string, unknown>;
}

export async function findPlaysAwaitingOutcome(
  workspaceId: string
): Promise<PendingOutcomePlay[]> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("play_runs")
    .select("id, workspace_id, title, outcome_expected, outcome_window_hours, ran_at, target_type, target_id, metadata")
    .eq("workspace_id", workspaceId)
    .not("outcome_expected", "is", null)
    .is("outcome_type", null)
    .not("ran_at", "is", null)
    .order("ran_at", { ascending: false })
    .limit(100);

  if (error || !data) {
    console.error("Failed to find plays awaiting outcome:", error);
    return [];
  }

  return data.map((row) => ({
    id: row.id,
    workspaceId: row.workspace_id,
    title: row.title,
    outcomeExpected: row.outcome_expected as OutcomeExpected,
    outcomeWindowHours: row.outcome_window_hours ?? 72,
    ranAt: row.ran_at,
    targetType: row.target_type,
    targetId: row.target_id,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
  }));
}

export async function checkAndTimeoutExpiredPlays(
  workspaceId: string
): Promise<{ timedOut: number; errors: string[] }> {
  const admin = createAdminClient();
  const now = new Date();
  const errors: string[] = [];
  let timedOut = 0;

  const pending = await findPlaysAwaitingOutcome(workspaceId);

  for (const play of pending) {
    const ranAt = new Date(play.ranAt);
    const windowMs = play.outcomeWindowHours * 60 * 60 * 1000;
    const expiresAt = new Date(ranAt.getTime() + windowMs);

    if (now > expiresAt) {
      const result = await recordOutcome({
        workspaceId,
        playRunId: play.id,
        outcomeType: "timeout",
      });

      if (result.success) {
        timedOut++;
      } else {
        errors.push(`${play.id}: ${result.error}`);
      }
    }
  }

  return { timedOut, errors };
}

export interface OutcomeSignal {
  signalType: "email_reply" | "payment_received" | "meeting_booked" | "user_undo";
  workspaceId: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  relatedEmail?: string;
  metadata?: Record<string, unknown>;
}

export async function processOutcomeSignal(
  signal: OutcomeSignal
): Promise<{ matched: number; errors: string[] }> {
  const admin = createAdminClient();
  const errors: string[] = [];
  let matched = 0;

  const expectedType = signalToExpectedOutcome(signal.signalType);
  if (!expectedType) {
    return { matched: 0, errors: ["Unknown signal type"] };
  }

  let query = admin
    .from("play_runs")
    .select("id, workspace_id, title, metadata")
    .eq("workspace_id", signal.workspaceId)
    .eq("outcome_expected", expectedType)
    .is("outcome_type", null);

  if (signal.relatedEntityId && signal.relatedEntityType) {
    query = query
      .eq("target_type", signal.relatedEntityType)
      .eq("target_id", signal.relatedEntityId);
  }

  const { data: plays, error } = await query.limit(10);

  if (error || !plays) {
    return { matched: 0, errors: [error?.message ?? "Query failed"] };
  }

  for (const play of plays) {
    const outcomeType: OutcomeType =
      signal.signalType === "user_undo" ? "negative" : "positive";

    const result = await recordOutcome({
      workspaceId: play.workspace_id,
      playRunId: play.id,
      outcomeType,
      outcomeValue: signal.metadata,
    });

    if (result.success) {
      matched++;
    } else {
      errors.push(`${play.id}: ${result.error}`);
    }
  }

  return { matched, errors };
}

function signalToExpectedOutcome(
  signalType: OutcomeSignal["signalType"]
): OutcomeExpected | null {
  switch (signalType) {
    case "email_reply":
      return "reply";
    case "payment_received":
      return "payment";
    case "meeting_booked":
      return "booking";
    case "user_undo":
      return null;
    default:
      return null;
  }
}

export interface CalibrationData {
  bucket: string;
  predictedConfidence: number;
  actualSuccessRate: number;
  sampleSize: number;
}

export async function getCalibrationData(
  workspaceId: string,
  days: number = 30
): Promise<CalibrationData[]> {
  const admin = createAdminClient();
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data, error } = await admin
    .from("play_runs")
    .select("confidence, outcome_type")
    .eq("workspace_id", workspaceId)
    .not("outcome_type", "is", null)
    .gte("outcome_at", since.toISOString());

  if (error || !data) {
    console.error("Failed to get calibration data:", error);
    return [];
  }

  const buckets = new Map<string, { positive: number; total: number; sumConfidence: number }>();

  for (const play of data) {
    const conf = play.confidence ?? 50;
    const bucketKey = getBucketKey(conf);

    let bucket = buckets.get(bucketKey);
    if (!bucket) {
      bucket = { positive: 0, total: 0, sumConfidence: 0 };
      buckets.set(bucketKey, bucket);
    }

    bucket.total++;
    bucket.sumConfidence += conf;
    if (play.outcome_type === "positive") {
      bucket.positive++;
    }
  }

  return Array.from(buckets.entries())
    .map(([key, bucket]) => ({
      bucket: key,
      predictedConfidence: bucket.sumConfidence / bucket.total,
      actualSuccessRate: (bucket.positive / bucket.total) * 100,
      sampleSize: bucket.total,
    }))
    .sort((a, b) => a.predictedConfidence - b.predictedConfidence);
}

function getBucketKey(confidence: number): string {
  if (confidence < 50) return "0-49";
  if (confidence < 60) return "50-59";
  if (confidence < 70) return "60-69";
  if (confidence < 80) return "70-79";
  if (confidence < 90) return "80-89";
  return "90-100";
}
