import "server-only";

import { anyToolHasExternalEffect } from "@/app/_lib/composio/external-effect";
import { playIdempotencyKey, recordUsageEvent, reverseUsageEvent } from "./ledger";
import { estimatePlayCost, exceedsPricingFloor } from "./play-cost";
import type { LedgerWriteResult, UsageReversalReason } from "./types";

/**
 * Play metering (pricing §1) — called at the single point of execution success.
 *
 * Billability is derived, never judged: a play is billable when at least one
 * tool it executed carries `external_effect`. A play that only touched Memory
 * or ran read steps is still recorded, with `billable: false`, because
 * LEARN-layer spend must stay visible to the margin monitor (G10) even though
 * it never reaches an invoice.
 *
 * Shadow metering (§4): every execution is recorded, nothing is enforced. No
 * caller checks a bundle before running a play, and none should until shadow
 * data has set the real bundle boundaries.
 */

export interface RecordPlayUsageInput {
  workspaceId: string;
  playRunId: string;
  /** Tool slugs actually executed, in order. Empty for internal-only plays. */
  toolSlugs: readonly string[];
  /** Model slots for language-model steps that ran. */
  llmSlots?: readonly (string | null | undefined)[];
  /** Reserved for the deferred team model (G6). */
  seatId?: string | null;
}

export async function recordPlayExecution(
  input: RecordPlayUsageInput,
): Promise<LedgerWriteResult> {
  const externalEffect = await anyToolHasExternalEffect(input.toolSlugs);
  const cost = estimatePlayCost({
    toolSlugs: input.toolSlugs,
    llmSlots: input.llmSlots,
  });

  if (exceedsPricingFloor(cost.totalMicros)) {
    // G10: $0.50 is the lowest effective revenue per play in the model (Max,
    // $149 across 300). A play costing more than it earns is a pricing-floor
    // breach. Recorded either way — the alert is the point.
    console.warn(
      `[usage] play ${input.playRunId} cost ${cost.totalMicros} micro-USD, above the pricing floor`,
    );
  }

  return recordUsageEvent({
    workspaceId: input.workspaceId,
    seatId: input.seatId ?? null,
    eventType: "play_executed",
    billable: externalEffect,
    idempotencyKey: playIdempotencyKey(input.playRunId),
    costEstimateMicros: cost.totalMicros,
    costBreakdown: cost.breakdown,
    playRunId: input.playRunId,
    externalEffect,
  });
}

/**
 * Credit a play back (G4).
 *
 * Failed plays never reach `recordPlayExecution`, so this exists for the
 * cases where a play succeeded and was credited afterwards: a thumbs-down
 * within 72 hours, or a support credit. Crediting a play that was never
 * metered is a no-op.
 */
export async function creditPlayExecution(
  workspaceId: string,
  playRunId: string,
  reason: UsageReversalReason,
): Promise<LedgerWriteResult> {
  return reverseUsageEvent({
    workspaceId,
    originalIdempotencyKey: playIdempotencyKey(playRunId),
    reason,
  });
}
