import "server-only";

import { createAdminClient } from "@/app/_lib/supabase/admin";
import { getWorkspaceEntitlement } from "./entitlements";
import { recordUsageEvent } from "./ledger";
import { estimateLlmCost, type LlmTokenUsage } from "./llm-cost";
import { getTierCapacity } from "./tiers";

/**
 * Ask Salt metering and fair-use admission (pricing G2).
 *
 * Ask Salt is the largest uncapped spend surface in the product. A single user
 * message runs up to twelve model steps with tool calls, and until this module
 * existed nothing observed that, let alone bounded it. Plays are metered
 * because they are billable; Ask Salt is metered because it is *expensive* —
 * the events are recorded non-billable so they never consume a play bundle,
 * but they do carry COGS into the margin report.
 *
 * The limit is enforced from the ledger rather than an in-process counter.
 * `app/_lib/rate-limit` keeps its buckets in module memory, which on serverless
 * means one bucket per warm instance and a fresh allowance on every cold start
 * — adequate for burst protection, useless as a spend ceiling. The ledger is
 * shared, durable, and already the source of truth for the bill.
 */

/** Fair use is a rolling window so a midnight reset cannot be used to burst. */
const WINDOW_HOURS = 24;

export interface AskSaltAllowance {
  allowed: boolean;
  /** Queries already recorded inside the window. */
  used: number;
  /** Ceiling for this workspace, from its (possibly grandfathered) tier. */
  limit: number;
  /** When the window frees up — the oldest counted query plus 24h. */
  resetAt: string;
}

interface AskSaltUsageRow {
  created_at: string;
}

/**
 * Ask Salt queries recorded for a workspace inside the rolling window.
 *
 * Returns the timestamps rather than a bare count so the caller can report an
 * honest reset time. `{ count: "exact", head: true }` would be cheaper but
 * could only ever answer "you are blocked", not "until when".
 */
async function loadWindow(
  workspaceId: string,
  windowStart: Date,
): Promise<AskSaltUsageRow[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("usage_events")
    .select("created_at")
    .eq("workspace_id", workspaceId)
    .eq("event_type", "ask_salt_query")
    .gte("created_at", windowStart.toISOString())
    .order("created_at", { ascending: true });

  if (error) {
    console.error(
      `[usage] Ask Salt window lookup failed for workspace ${workspaceId}:`,
      error.message,
    );
    // Fail open. A billing-telemetry outage must not take Ask Salt down; the
    // spend still lands in the ledger via recordAskSaltUsage, so the gap is
    // visible after the fact rather than silently uncounted.
    return [];
  }

  return (data ?? []) as AskSaltUsageRow[];
}

/**
 * Resolve whether a workspace may run another Ask Salt turn.
 *
 * The ceiling is the tier's published per-seat fair-use figure multiplied by
 * its included connected seats, matching how plays pool at the workspace. Seat
 * identity is not tracked yet (team model deferred to G6), and pooling is the
 * reading that cannot wrongly block a legitimate solo operator.
 */
export async function checkAskSaltAllowance(
  workspaceId: string,
  now: Date = new Date(),
): Promise<AskSaltAllowance> {
  const windowStart = new Date(now.getTime() - WINDOW_HOURS * 60 * 60 * 1000);

  // Entitlement first: it resolves the pricing version, so a grandfathered
  // workspace is measured against the fair-use figure it was actually sold.
  const entitlement = await getWorkspaceEntitlement(workspaceId, now);
  const capacity = getTierCapacity(entitlement.tier, entitlement.pricingVersion);
  const limit = capacity.askSaltDailyLimit * capacity.connectedSeatsIncluded;

  const rows = await loadWindow(workspaceId, windowStart);
  const used = rows.length;

  const oldest = rows[0]?.created_at;
  const resetAt = oldest
    ? new Date(new Date(oldest).getTime() + WINDOW_HOURS * 60 * 60 * 1000)
    : new Date(now.getTime() + WINDOW_HOURS * 60 * 60 * 1000);

  return {
    allowed: used < limit,
    used,
    limit,
    resetAt: resetAt.toISOString(),
  };
}

export interface RecordAskSaltUsageInput {
  workspaceId: string;
  /**
   * Stable per assistant turn. The provider response id is used so a retried
   * stream cannot bill the same turn twice.
   */
  idempotencyKey: string;
  model: string;
  usage: LlmTokenUsage;
  /** Model round-trips in the turn — `steps.length`, not always 1. */
  calls?: number;
}

/**
 * Record the COGS of one completed Ask Salt turn.
 *
 * Always non-billable: Ask Salt is included at every tier and must never
 * consume a play bundle. `billable: false` is what keeps it out of the
 * customer's invoice while still counting toward margin and the fair-use
 * window above.
 *
 * Never throws. This runs in a stream callback after the response has already
 * been delivered to the user, so a ledger failure is logged and dropped rather
 * than surfaced — there is no request left to fail.
 */
export async function recordAskSaltUsage(
  input: RecordAskSaltUsageInput,
): Promise<void> {
  try {
    const cost = estimateLlmCost({
      model: input.model,
      inputTokens: input.usage.inputTokens,
      outputTokens: input.usage.outputTokens,
      calls: input.calls,
    });

    const result = await recordUsageEvent({
      workspaceId: input.workspaceId,
      eventType: "ask_salt_query",
      billable: false,
      idempotencyKey: input.idempotencyKey,
      costEstimateMicros: cost.totalMicros,
      costBreakdown: cost.breakdown,
    });

    if (!result.ok) {
      console.error(
        `[usage] failed to record Ask Salt spend for workspace ${input.workspaceId}:`,
        result.error,
      );
    }
  } catch (error) {
    console.error(
      `[usage] Ask Salt metering threw for workspace ${input.workspaceId}:`,
      error,
    );
  }
}
