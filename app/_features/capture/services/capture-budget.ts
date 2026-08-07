import "server-only";

/**
 * Per-workspace daily capture budget (capture-pipeline repair, Phase 6).
 *
 * Caps how many capture rows a workspace can ingest per rolling 24h. Past
 * the budget, captures still land (visibility + later rescue) but are
 * stamped as noise at insert: no enrichment fetch, no evidence processing,
 * and — via the no_signal scan policy — no LLM spend. The crossing is
 * surfaced as a throttled `capture_budget_exceeded` connector_sync_events
 * row so it shows up in the same health surface as webhook outcomes.
 *
 * The limit is global with an env override; per-workspace limits are a
 * follow-up if a real workspace ever needs one.
 */

import { createAdminClient } from "@/app/_lib/supabase/admin";

export const DEFAULT_DAILY_CAPTURE_BUDGET = 500;

const BUDGET_WINDOW_HOURS = 24;
/** One warning row per workspace per hour — never per capture. */
const WARNING_THROTTLE_HOURS = 1;

type AdminClient = ReturnType<typeof createAdminClient>;

export function getDailyCaptureBudgetLimit(): number {
  const raw = process.env.CAPTURE_DAILY_CAPTURE_BUDGET;
  if (!raw) return DEFAULT_DAILY_CAPTURE_BUDGET;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0
    ? parsed
    : DEFAULT_DAILY_CAPTURE_BUDGET;
}

export interface CaptureBudgetStatus {
  limit: number;
  count: number;
  exceeded: boolean;
}

export async function getCaptureBudgetStatus(
  workspaceId: string,
  admin?: AdminClient,
): Promise<CaptureBudgetStatus> {
  const limit = getDailyCaptureBudgetLimit();
  const client = admin ?? createAdminClient();
  const cutoff = new Date(
    Date.now() - BUDGET_WINDOW_HOURS * 60 * 60 * 1000,
  ).toISOString();

  let count: number | null;
  let error: { message: string } | null;
  try {
    const result = await client
      .from("capture_events")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .gte("created_at", cutoff);
    count = result.count;
    error = result.error;
  } catch (thrown) {
    error = {
      message: thrown instanceof Error ? thrown.message : String(thrown),
    };
    count = null;
  }

  if (error) {
    // Fail open: a broken budget check must never block ingestion.
    console.error(
      "[capture-budget] count failed for workspace %s:",
      workspaceId,
      error.message,
    );
    return { limit, count: 0, exceeded: false };
  }

  const current = count ?? 0;
  return { limit, count: current, exceeded: current >= limit };
}

/**
 * Surface the budget crossing in connector_sync_events, throttled to one
 * row per workspace per hour. Fire-safe: observability never breaks ingest.
 */
export async function recordBudgetExceededWarning(
  workspaceId: string,
  status: CaptureBudgetStatus,
  admin?: AdminClient,
): Promise<void> {
  const client = admin ?? createAdminClient();
  const throttleCutoff = new Date(
    Date.now() - WARNING_THROTTLE_HOURS * 60 * 60 * 1000,
  ).toISOString();

  try {
    const { data: recent } = await client
      .from("connector_sync_events")
      .select("id")
      .eq("kind", "capture_budget_exceeded")
      .eq("detail->>workspaceId", workspaceId)
      .gte("created_at", throttleCutoff)
      .limit(1);

    if (recent && recent.length > 0) return;

    await client.from("connector_sync_events").insert({
      kind: "capture_budget_exceeded",
      subject_slug: "daily_capture_budget",
      detail: {
        workspaceId,
        count: status.count,
        limit: status.limit,
        windowHours: BUDGET_WINDOW_HOURS,
      } as never,
    });
  } catch (error) {
    console.error("[capture-budget] failed to record budget warning", {
      workspaceId,
      error,
    });
  }
}
