import "server-only";

import { randomUUID } from "node:crypto";
import { recordUsageEvent } from "./ledger";
import { COMPOSIO_TRIGGER_EVENT_MICROS } from "./play-cost";

/**
 * Record the COGS of one delivered Composio trigger event.
 *
 * Composio bills trigger events at delivery (egress), so the vendor charge
 * has already happened by the time our webhook handler runs — this is pure
 * cost recording, never admission. It must not block or fail ingest: like
 * every ledger write, errors are logged and swallowed.
 *
 * Idempotency keys on the Standard-Webhooks delivery id, so a redelivered
 * webhook lands one row. Deliveries without an id (shouldn't happen with
 * Standard Webhooks) record under a random key rather than being dropped.
 */
export async function recordComposioTriggerEvent(input: {
  workspaceId: string;
  triggerSlug: string;
  webhookDeliveryId: string | null;
}): Promise<void> {
  try {
    await recordUsageEvent({
      workspaceId: input.workspaceId,
      eventType: "composio_trigger_event",
      billable: false,
      idempotencyKey: input.webhookDeliveryId
        ? `trigger_${input.webhookDeliveryId}`
        : `trigger_${randomUUID()}`,
      costEstimateMicros: COMPOSIO_TRIGGER_EVENT_MICROS,
      costBreakdown: { composio: COMPOSIO_TRIGGER_EVENT_MICROS },
    });
  } catch (error) {
    console.error(
      "[record-trigger-usage] failed to record trigger event for workspace %s:",
      input.workspaceId,
      error instanceof Error ? error.message : error,
    );
  }
}
