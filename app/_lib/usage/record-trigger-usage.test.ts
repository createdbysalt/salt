import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const recordUsageEvent = vi.fn();
vi.mock("./ledger", () => ({
  recordUsageEvent: (...args: unknown[]) => recordUsageEvent(...args),
}));

describe("recordComposioTriggerEvent", () => {
  beforeEach(() => {
    recordUsageEvent.mockReset();
    recordUsageEvent.mockResolvedValue({ ok: true, status: "recorded" });
  });

  it("records a non-billable trigger-event row keyed on the delivery id", async () => {
    const { recordComposioTriggerEvent } = await import("./record-trigger-usage");

    await recordComposioTriggerEvent({
      workspaceId: "ws-1",
      triggerSlug: "GMAIL_NEW_GMAIL_MESSAGE",
      webhookDeliveryId: "msg_2abc",
    });

    expect(recordUsageEvent).toHaveBeenCalledTimes(1);
    expect(recordUsageEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: "ws-1",
        eventType: "composio_trigger_event",
        billable: false,
        idempotencyKey: "trigger_msg_2abc",
        costEstimateMicros: 1_000,
      })
    );
  });

  it("still records (random key) when the delivery id is missing", async () => {
    const { recordComposioTriggerEvent } = await import("./record-trigger-usage");

    await recordComposioTriggerEvent({
      workspaceId: "ws-1",
      triggerSlug: "GMAIL_NEW_GMAIL_MESSAGE",
      webhookDeliveryId: null,
    });

    const input = recordUsageEvent.mock.calls[0][0] as { idempotencyKey: string };
    expect(input.idempotencyKey).toMatch(/^trigger_/);
  });

  it("never throws into the webhook handler when the ledger fails", async () => {
    recordUsageEvent.mockRejectedValue(new Error("ledger down"));
    const { recordComposioTriggerEvent } = await import("./record-trigger-usage");

    await expect(
      recordComposioTriggerEvent({
        workspaceId: "ws-1",
        triggerSlug: "GMAIL_NEW_GMAIL_MESSAGE",
        webhookDeliveryId: "msg_x",
      })
    ).resolves.toBeUndefined();
  });
});
