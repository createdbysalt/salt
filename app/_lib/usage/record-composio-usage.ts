import "server-only";

import { randomUUID } from "node:crypto";
import { recordUsageEvent } from "./ledger";
import { COMPOSIO_ACTION_MICROS } from "./play-cost";

/**
 * Record the COGS of one successful Composio tool call.
 *
 * Called from inside `executeComposioAction` — the single gate — never from a
 * feature. By the time this runs the vendor charge has already happened, so
 * this is pure cost recording, never admission (`canSpend` gates before the
 * call). Like every ledger write, errors are logged and swallowed: metering
 * failure must not fail the work that spent the money.
 *
 * One row per successful vendor charge, keyed on a random UUID: tool calls
 * have no natural idempotency token, failed calls are free (never recorded),
 * and the SDK (≥0.14) no longer retries non-idempotent POSTs — so success at
 * the gate maps 1:1 to a billed call.
 *
 * Play-attributed executions are excluded by the caller: their Composio COGS
 * is already estimated in the run's `play_executed` row, and recording both
 * would double-count against the margin monitor.
 */
export async function recordComposioActionCall(input: {
  workspaceId: string;
  toolSlug: string;
}): Promise<void> {
  try {
    await recordUsageEvent({
      workspaceId: input.workspaceId,
      eventType: "composio_action",
      billable: false,
      idempotencyKey: `composio_${randomUUID()}`,
      costEstimateMicros: COMPOSIO_ACTION_MICROS,
      costBreakdown: {
        composio: COMPOSIO_ACTION_MICROS,
        tools: [input.toolSlug],
      },
    });
  } catch (error) {
    console.error(
      "[record-composio-usage] failed to record tool call %s for workspace %s:",
      input.toolSlug,
      input.workspaceId,
      error instanceof Error ? error.message : error,
    );
  }
}
