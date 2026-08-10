import "server-only";

/**
 * Per-workspace daily capture budget (capture-pipeline repair, Phase 6;
 * DB-enforced since Sources plan 3.1b).
 *
 * Caps how many capture rows a workspace can ingest per rolling 24h. Past
 * the budget, captures still land (visibility + later rescue) but are
 * stamped as noise at insert: no enrichment fetch, no evidence processing,
 * and — via the no_signal scan policy — no LLM spend. The crossing is
 * surfaced as a throttled `capture_budget_exceeded` connector_sync_events
 * row so it shows up in the same health surface as webhook outcomes.
 *
 * ENFORCEMENT IS IN THE DATABASE, NOT HERE. The `capture_budget_enforcer`
 * BEFORE INSERT trigger on capture_events (migration 20260808000000) takes a
 * per-workspace advisory lock, re-counts in the same transaction as the
 * insert, and stamps the row noise past the cap — closing the TOCTOU window
 * a count-then-insert check cannot. This module is the cheap racy *peek*:
 * the webhook route uses it to skip the paid hydration fetch for rows that
 * will be stamped anyway, and ingestEnvelope uses it for the warning row.
 * Callers must branch on the INSERTED row's gate_action, never on this peek.
 *
 * The limit lives in `capture_budget_config` (single row, service_role
 * only) — one limit, one owner; the trigger and this peek read the same row.
 *
 * Scope (mirrored in the trigger): connector intake only — origin = 'found'
 * with a source_type. Only rows that consume enrichment/scan budget count:
 * noise, drop, and held rows are free by construction and are excluded —
 * otherwise a spam wave would exhaust the budget and get legitimate mail
 * stamped noise (failure mode #1: the booking email dies because
 * newsletters burned the cap). Legacy NULL-gate rows (pre-gate backfill
 * path) did consume enrichment and keep counting.
 */

import { createAdminClient } from "@/app/_lib/supabase/admin";

export const DEFAULT_DAILY_CAPTURE_BUDGET = 500;

const DEFAULT_WINDOW_HOURS = 24;
/** One warning row per workspace per hour — never per capture. */
const WARNING_THROTTLE_HOURS = 1;

type AdminClient = ReturnType<typeof createAdminClient>;

interface BudgetConfig {
  limit: number;
  windowHours: number;
}

async function readBudgetConfig(client: AdminClient): Promise<BudgetConfig> {
  try {
    const { data, error } = await client
      .from("capture_budget_config")
      .select("daily_limit, window_hours")
      .maybeSingle();
    if (error || !data) {
      if (error) {
        console.error(
          "[capture-budget] config read failed:",
          error.message,
        );
      }
      return {
        limit: DEFAULT_DAILY_CAPTURE_BUDGET,
        windowHours: DEFAULT_WINDOW_HOURS,
      };
    }
    return {
      limit: data.daily_limit ?? DEFAULT_DAILY_CAPTURE_BUDGET,
      windowHours: data.window_hours ?? DEFAULT_WINDOW_HOURS,
    };
  } catch (thrown) {
    console.error(
      "[capture-budget] config read threw:",
      thrown instanceof Error ? thrown.message : thrown,
    );
    return {
      limit: DEFAULT_DAILY_CAPTURE_BUDGET,
      windowHours: DEFAULT_WINDOW_HOURS,
    };
  }
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
  const client = admin ?? createAdminClient();
  const config = await readBudgetConfig(client);
  const cutoff = new Date(
    Date.now() - config.windowHours * 60 * 60 * 1000,
  ).toISOString();

  let count: number | null;
  let error: { message: string } | null;
  try {
    const result = await client
      .from("capture_events")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("origin", "found")
      .not("source_type", "is", null)
      .gte("created_at", cutoff)
      // Budget-consuming rows only; NULL gate_action (pre-gate backfills)
      // consumed enrichment and must count.
      .or("gate_action.is.null,gate_action.not.in.(noise,drop,held)");
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
    return { limit: config.limit, count: 0, exceeded: false };
  }

  const current = count ?? 0;
  return {
    limit: config.limit,
    count: current,
    exceeded: current >= config.limit,
  };
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
        windowHours: DEFAULT_WINDOW_HOURS,
      } as never,
    });
  } catch (error) {
    console.error("[capture-budget] failed to record budget warning", {
      workspaceId,
      error,
    });
  }
}
