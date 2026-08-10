/**
 * Goal ai_progress writer — closes the "operator_goals.ai_progress has no
 * writer" contract gap (me blueprint, keeper-derived-surfaces #8a).
 *
 * Derives current progress for each ACTIVE operator goal DETERMINISTICALLY
 * from memory — no LLM. Salt writes ONLY `ai_progress` (system_derived);
 * goal content, status, targets, and manual progress stay user-only per the
 * me field contract.
 *
 * Derivation rules (per target_unit, settled 2026-07-03):
 * - "dollars": sum of `billing_records.amount_paid_cents` on receivables with
 *   status paid/partial, timestamped by paid_at → issued_at → created_at,
 *   inside the goal's timeframe window; converted to whole dollars.
 *   EXCEPTION: goal_type 'project_minimum' is a THRESHOLD (min project size),
 *   not a cumulative sum — summing revenue against it would be a lie, so it
 *   gets { unavailable: true }.
 * - "clients": count of `people` rows with relationship_type = 'client'
 *   (deleted_at null). Windowed periods (month/quarter/year in target_period)
 *   count clients whose created_at falls in the window — "new clients this
 *   period". Ongoing goals (no parseable period) count ALL current clients —
 *   "total clients". One rule per timeframe semantics, keyed off
 *   detectPeriodType(target_period).
 * - "projects": count of `projects` with status in (signed, active, completed)
 *   and deleted_at null. Windowed → coalesce(start_date, created_at) in the
 *   window; ongoing → all such projects.
 * - "hours": no truthful source today (time entries are legacy) →
 *   { unavailable: true, reason: "no time tracking source" }.
 *
 * Timeframe windows come from `target_period` via detectPeriodType:
 * "January 2026" (month), "Q3 2026" (quarter), "2026" (year); anything else
 * (incl. null) is ongoing/all-time. Windows are UTC [start, end).
 *
 * Refresh: Me page load schedules a fire-and-forget recompute when any active
 * goal's ai_progress.computed_at is missing or older than 6 hours (mirrors
 * the work-health stale-recompute pattern in work/health/recompute.ts).
 *
 * RLS: uses the admin client (server-only) — every query is tenant-scoped by
 * workspace_id.
 */
import "server-only";

import { createAdminClient } from "@/app/_lib/supabase/admin";
import { detectPeriodType } from "@/app/_features/me/utils/goal-periods";
import type { OperatorGoalUnit } from "@/app/_features/me/types";

export const GOAL_AI_PROGRESS_VERSION = 1;

/** Recompute only when computed_at is missing or older than this. */
const GOAL_AI_PROGRESS_MAX_AGE_HOURS = 6;

export type GoalAiProgressV1 = {
  version: 1;
  value: number | null;
  target: number | null;
  /** Clamped 0–100; null when value or target is unknown. */
  percent: number | null;
  unit: OperatorGoalUnit | null;
  computed_at: string;
  /** Short human description of what produced the value. */
  inputs: string;
  unavailable?: true;
  reason?: string;
};

type PeriodWindow = { start: Date; end: Date } | null;

const MONTH_INDEX: Record<string, number> = {
  January: 0, February: 1, March: 2, April: 3, May: 4, June: 5,
  July: 6, August: 7, September: 8, October: 9, November: 10, December: 11,
};

/** Parse a target_period string into a UTC [start, end) window, or null for ongoing. */
export function periodToWindow(targetPeriod: string | null): PeriodWindow {
  const type = detectPeriodType(targetPeriod);
  if (!targetPeriod || type === "ongoing") return null;

  if (type === "yearly") {
    const year = Number(targetPeriod);
    if (!Number.isInteger(year)) return null;
    return {
      start: new Date(Date.UTC(year, 0, 1)),
      end: new Date(Date.UTC(year + 1, 0, 1)),
    };
  }

  if (type === "quarterly") {
    const match = /^Q(\d)\s+(\d{4})$/.exec(targetPeriod);
    if (!match) return null;
    const quarter = Number(match[1]);
    const year = Number(match[2]);
    if (quarter < 1 || quarter > 4) return null;
    const startMonth = (quarter - 1) * 3;
    return {
      start: new Date(Date.UTC(year, startMonth, 1)),
      end: new Date(Date.UTC(year, startMonth + 3, 1)),
    };
  }

  // monthly: "January 2026"
  const match = /^([A-Z][a-z]+)\s+(\d{4})$/.exec(targetPeriod);
  if (!match) return null;
  const month = MONTH_INDEX[match[1]];
  const year = Number(match[2]);
  if (month == null) return null;
  return {
    start: new Date(Date.UTC(year, month, 1)),
    end: new Date(Date.UTC(year, month + 1, 1)),
  };
}

function inWindow(iso: string | null, window: PeriodWindow): boolean {
  if (!window) return true;
  if (!iso) return false;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return false;
  return t >= window.start.getTime() && t < window.end.getTime();
}

function clampPercent(value: number | null, target: number | null): number | null {
  if (value == null || target == null || target <= 0) return null;
  return Math.min(100, Math.max(0, Math.round((value / target) * 100)));
}

function windowLabel(targetPeriod: string | null, window: PeriodWindow): string {
  return window ? `in ${targetPeriod}` : "all-time";
}

function unavailableProgress(
  unit: OperatorGoalUnit | null,
  target: number | null,
  reason: string,
): GoalAiProgressV1 {
  return {
    version: GOAL_AI_PROGRESS_VERSION,
    value: null,
    target,
    percent: null,
    unit,
    computed_at: new Date().toISOString(),
    inputs: reason,
    unavailable: true,
    reason,
  };
}

type GoalRowForRecompute = {
  id: string;
  goal_type: string;
  target_value: number | null;
  target_unit: OperatorGoalUnit | null;
  target_period: string | null;
};

async function deriveDollars(
  admin: ReturnType<typeof createAdminClient>,
  workspaceId: string,
  window: PeriodWindow,
): Promise<{ value: number; inputs: string } | null> {
  const { data, error } = await admin
    .from("billing_records")
    .select("amount_paid_cents, paid_at, issued_at, created_at")
    .eq("workspace_id", workspaceId)
    .eq("direction", "receivable")
    .in("status", ["paid", "partial"]);

  if (error) {
    console.error("[goal-ai-progress] billing_records read failed", error);
    return null;
  }

  let cents = 0;
  for (const row of data ?? []) {
    const at = row.paid_at ?? row.issued_at ?? row.created_at;
    if (!inWindow(at, window)) continue;
    cents += row.amount_paid_cents ?? 0;
  }

  return {
    value: Math.round(cents / 100),
    inputs: "sum of paid receivable amounts (billing_records paid/partial)",
  };
}

async function deriveClients(
  admin: ReturnType<typeof createAdminClient>,
  workspaceId: string,
  window: PeriodWindow,
): Promise<{ value: number; inputs: string } | null> {
  let query = admin
    .from("people")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("relationship_type", "client")
    .is("deleted_at", null);

  if (window) {
    query = query
      .gte("created_at", window.start.toISOString())
      .lt("created_at", window.end.toISOString());
  }

  const { count, error } = await query;
  if (error) {
    console.error("[goal-ai-progress] people read failed", error);
    return null;
  }

  return {
    value: count ?? 0,
    inputs: window
      ? "count of people marked client, added in the period"
      : "count of all people marked client",
  };
}

async function deriveProjects(
  admin: ReturnType<typeof createAdminClient>,
  workspaceId: string,
  window: PeriodWindow,
): Promise<{ value: number; inputs: string } | null> {
  const { data, error } = await admin
    .from("work")
    .select("id, start_date, created_at")
    .eq("workspace_id", workspaceId)
    .in("status", ["signed", "active", "completed"])
    .is("deleted_at", null);

  if (error) {
    console.error("[goal-ai-progress] projects read failed", error);
    return null;
  }

  const value = (data ?? []).filter((p) =>
    inWindow(p.start_date ?? p.created_at, window),
  ).length;

  return {
    value,
    inputs: window
      ? "count of signed/active/completed projects started in the period"
      : "count of signed/active/completed projects",
  };
}

async function deriveGoalProgress(
  admin: ReturnType<typeof createAdminClient>,
  workspaceId: string,
  goal: GoalRowForRecompute,
): Promise<GoalAiProgressV1 | null> {
  const target = goal.target_value ?? null;
  const unit = goal.target_unit ?? null;

  if (unit == null) {
    return unavailableProgress(unit, target, "custom goal — no measurable unit");
  }

  if (goal.goal_type === "project_minimum") {
    return unavailableProgress(
      unit,
      target,
      "threshold goal (minimum project size), not cumulative",
    );
  }

  if (unit === "hours") {
    return unavailableProgress(unit, target, "no time tracking source");
  }

  const window = periodToWindow(goal.target_period);
  const derived =
    unit === "dollars"
      ? await deriveDollars(admin, workspaceId, window)
      : unit === "clients"
        ? await deriveClients(admin, workspaceId, window)
        : await deriveProjects(admin, workspaceId, window);

  if (!derived) return null;

  return {
    version: GOAL_AI_PROGRESS_VERSION,
    value: derived.value,
    target,
    percent: clampPercent(derived.value, target),
    unit,
    computed_at: new Date().toISOString(),
    inputs: `${derived.inputs}, ${windowLabel(goal.target_period, window)}`,
  };
}

/**
 * Staleness gate: recompute when there is no computed_at yet, or the last
 * computation is older than 6 hours. Accepts the raw ai_progress JSON.
 */
export function isGoalAiProgressStale(
  aiProgress: unknown,
  maxAgeHours = GOAL_AI_PROGRESS_MAX_AGE_HOURS,
): boolean {
  if (!aiProgress || typeof aiProgress !== "object") return true;
  const computedAt = (aiProgress as { computed_at?: unknown }).computed_at;
  if (typeof computedAt !== "string") return true;
  const at = new Date(computedAt).getTime();
  if (Number.isNaN(at)) return true;
  return Date.now() - at > maxAgeHours * 60 * 60 * 1000;
}

/**
 * Recompute ai_progress for every ACTIVE goal in the workspace. Writes ONLY
 * the ai_progress column — never goal content, status, targets, or progress
 * (user-only per the me field contract).
 */
export async function recomputeGoalAiProgress(workspaceId: string): Promise<number> {
  const admin = createAdminClient();

  const { data: goals, error } = await admin
    .from("operator_goals")
    .select("id, goal_type, target_value, target_unit, target_period")
    .eq("workspace_id", workspaceId)
    .eq("status", "active");

  if (error) {
    console.error("[goal-ai-progress] goals read failed", error);
    return 0;
  }

  let written = 0;
  for (const goal of goals ?? []) {
    const progress = await deriveGoalProgress(admin, workspaceId, {
      id: goal.id,
      goal_type: goal.goal_type,
      target_value: goal.target_value != null ? Number(goal.target_value) : null,
      target_unit: goal.target_unit,
      target_period: goal.target_period,
    });
    if (!progress) continue;

    const { error: updateError } = await admin
      .from("operator_goals")
      .update({ ai_progress: progress })
      .eq("id", goal.id)
      .eq("workspace_id", workspaceId);

    if (updateError) {
      console.error("[goal-ai-progress] write failed", { goalId: goal.id }, updateError);
    } else {
      written += 1;
    }
  }

  return written;
}

/** Fire-and-forget wrapper matching scheduleWorkHealthRecompute. */
export function scheduleGoalAiProgressRecompute(workspaceId: string): void {
  void recomputeGoalAiProgress(workspaceId)
    .then((written) => {
      console.log("[goal-ai-progress] recompute complete", workspaceId, written);
    })
    .catch((error) => {
      console.error("[goal-ai-progress] scheduled recompute failed", { workspaceId }, error);
    });
}
