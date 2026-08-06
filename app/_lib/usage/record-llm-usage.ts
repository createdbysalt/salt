import "server-only";

import { randomUUID } from "node:crypto";

import { recordUsageEvent } from "./ledger";
import { estimateLlmCost, type LlmTokenUsage } from "./llm-cost";

/**
 * Language-model spend recording (pricing G10 — cost meter).
 *
 * Called from inside `sendLlm` so that instrumenting a new feature is not a
 * thing anyone has to remember. This is the same lesson the play metering
 * rewrite learned the hard way: hooking the feature layer meant nine missed
 * paths and a year of Ask Salt sends billing as free. Meter the primitive and
 * every caller is covered on the day it is written.
 *
 * Always non-billable. Token spend is the cost *underneath* an outcome, never
 * the outcome itself — customers are billed per play, not per token.
 */

export interface RecordLlmCallInput {
  workspaceId: string;
  model: string;
  usage: LlmTokenUsage;
  /** Routing slot (`insights`, `playDraft`, …), for per-workload attribution. */
  routingKey?: string | null;
}

/**
 * Record one model call's COGS.
 *
 * Never throws and never blocks the caller's result. A metering failure must
 * not turn a working feature into a broken one — the ledger is an observer of
 * the request, not a participant in it.
 *
 * Each call gets a fresh idempotency key because each call is genuinely
 * distinct spend. That includes `sendLlm`'s fallback retry: the retry is a
 * second real request to a second real model and costs real money, so it must
 * not deduplicate against the attempt that failed.
 */
export async function recordLlmCall(input: RecordLlmCallInput): Promise<void> {
  try {
    const cost = estimateLlmCost({
      model: input.model,
      inputTokens: input.usage.inputTokens,
      outputTokens: input.usage.outputTokens,
    });

    const result = await recordUsageEvent({
      workspaceId: input.workspaceId,
      eventType: "llm_call",
      billable: false,
      idempotencyKey: `llm_${randomUUID()}`,
      costEstimateMicros: cost.totalMicros,
      costBreakdown: {
        ...cost.breakdown,
        ...(input.routingKey ? { tools: [`llm:${input.routingKey}`] } : {}),
      },
    });

    if (!result.ok) {
      console.error(
        `[usage] failed to record LLM spend for workspace ${input.workspaceId}:`,
        result.error,
      );
    }
  } catch (error) {
    console.error(
      `[usage] LLM metering threw for workspace ${input.workspaceId}:`,
      error,
    );
  }
}
