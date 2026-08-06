import "server-only";

import { createAdminClient } from "@/app/_lib/supabase/admin";
import type {
  LedgerWriteResult,
  RecordUsageEventInput,
  ReverseUsageEventInput,
} from "./types";

/**
 * The usage ledger (pricing G1) — the single write path for all billing.
 *
 * No component bills independently. Everything that consumes a bundle, costs
 * money, or needs to appear on a receipt goes through this module.
 *
 * Three properties hold by construction:
 *
 * 1. **Service-role only.** `usage_events` grants no write to `authenticated`,
 *    so the ledger cannot be forged from a browser session.
 * 2. **Idempotent.** A unique constraint on `(workspace_id, idempotency_key)`
 *    means a play that retries three times bills once. A duplicate is a
 *    successful outcome, not an error — callers must never retry on it.
 * 3. **Append-only.** A database trigger rejects UPDATE and DELETE even from
 *    service_role. Corrections are reversal rows that point at the row they
 *    cancel, so the audit trail is complete by construction.
 */

/** Postgres unique-violation. The idempotency constraint doing its job. */
const UNIQUE_VIOLATION = "23505";

export async function recordUsageEvent(
  input: RecordUsageEventInput,
): Promise<LedgerWriteResult> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("usage_events")
    .insert({
      workspace_id: input.workspaceId,
      seat_id: input.seatId ?? null,
      event_type: input.eventType,
      billable: input.billable,
      idempotency_key: input.idempotencyKey,
      cost_estimate_micros: Math.max(
        0,
        Math.round(input.costEstimateMicros ?? 0),
      ),
      cost_breakdown: input.costBreakdown ?? {},
      play_run_id: input.playRunId ?? null,
      external_effect: input.externalEffect ?? null,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      return { ok: true, status: "duplicate" };
    }
    console.error(
      "[usage-ledger] failed to record %s for workspace %s:",
      input.eventType,
      input.workspaceId,
      error.message,
    );
    return { ok: false, error: error.message };
  }

  return { ok: true, status: "recorded", eventId: data.id as string };
}

/**
 * Reverse a previously recorded event (G4 auto-credit).
 *
 * Writes a compensating row rather than mutating history. The reversal mirrors
 * the original's `billable` flag so netting is a simple subtraction, and it
 * carries its own idempotency key so a repeated credit is a no-op.
 *
 * Reversing an event that was never recorded is a successful no-op: a play
 * that failed before metering has nothing to credit.
 */
export async function reverseUsageEvent(
  input: ReverseUsageEventInput,
): Promise<LedgerWriteResult> {
  const supabase = createAdminClient();

  const { data: original, error: lookupError } = await supabase
    .from("usage_events")
    .select("id, event_type, billable, cost_estimate_micros, play_run_id")
    .eq("workspace_id", input.workspaceId)
    .eq("idempotency_key", input.originalIdempotencyKey)
    .maybeSingle();

  if (lookupError) {
    console.error(
      `[usage-ledger] reversal lookup failed for ${input.originalIdempotencyKey}:`,
      lookupError.message,
    );
    return { ok: false, error: lookupError.message };
  }

  if (!original) {
    return { ok: true, status: "duplicate" };
  }

  const { data, error } = await supabase
    .from("usage_events")
    .insert({
      workspace_id: input.workspaceId,
      event_type: original.event_type,
      billable: original.billable,
      idempotency_key: `reversal_${input.originalIdempotencyKey}`,
      // The credit itself costs nothing; the original row keeps the COGS so
      // the margin monitor still sees money that was genuinely spent.
      cost_estimate_micros: 0,
      cost_breakdown: {},
      play_run_id: original.play_run_id,
      reverses_event_id: original.id,
      reversal_reason: input.reason,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      return { ok: true, status: "duplicate" };
    }
    console.error(
      `[usage-ledger] failed to reverse ${input.originalIdempotencyKey}:`,
      error.message,
    );
    return { ok: false, error: error.message };
  }

  return { ok: true, status: "recorded", eventId: data.id as string };
}

/**
 * Net billable plays for a workspace in a window.
 *
 * Derived from the ledger on every read rather than kept in a counter column.
 * A stored counter is both a tamper target and a drift source; deriving it
 * keeps the ledger authoritative and makes the nightly G1 reconciliation a
 * comparison against Stripe rather than a three-way merge.
 */
export async function countBillablePlays(
  workspaceId: string,
  periodStart: string,
  periodEnd?: string | null,
): Promise<number> {
  const supabase = createAdminClient();

  let query = supabase
    .from("usage_events")
    .select("id, reverses_event_id")
    .eq("workspace_id", workspaceId)
    .eq("event_type", "play_executed")
    .eq("billable", true)
    .gte("created_at", periodStart);

  if (periodEnd) {
    query = query.lt("created_at", periodEnd);
  }

  const { data, error } = await query;

  if (error) {
    console.error(
      `[usage-ledger] failed to count plays for workspace ${workspaceId}:`,
      error.message,
    );
    return 0;
  }

  const rows = data ?? [];
  const executed = rows.filter((row) => row.reverses_event_id === null).length;
  const credited = rows.length - executed;

  return Math.max(0, executed - credited);
}

/** Stable idempotency key for a play run. Retries of a run reuse it. */
export function playIdempotencyKey(playRunId: string): string {
  return `play_${playRunId}`;
}
