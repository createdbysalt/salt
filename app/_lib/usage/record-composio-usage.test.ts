import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const recordUsageEvent = vi.fn();
vi.mock("./ledger", () => ({
  recordUsageEvent: (...args: unknown[]) => recordUsageEvent(...args),
}));

describe("recordComposioActionCall", () => {
  beforeEach(() => {
    recordUsageEvent.mockReset();
    recordUsageEvent.mockResolvedValue({ ok: true, status: "recorded" });
  });

  it("records a non-billable composio_action row with slug attribution", async () => {
    const { recordComposioActionCall } = await import("./record-composio-usage");

    await recordComposioActionCall({
      workspaceId: "ws-1",
      toolSlug: "OUTLOOK_GET_MESSAGE",
    });

    expect(recordUsageEvent).toHaveBeenCalledTimes(1);
    expect(recordUsageEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: "ws-1",
        eventType: "composio_action",
        billable: false,
        costEstimateMicros: 4_000,
        costBreakdown: {
          composio: 4_000,
          tools: ["OUTLOOK_GET_MESSAGE"],
        },
      })
    );
  });

  it("keys each call uniquely — one row per billed vendor call", async () => {
    const { recordComposioActionCall } = await import("./record-composio-usage");

    await recordComposioActionCall({ workspaceId: "ws-1", toolSlug: "GMAIL_FETCH_EMAILS" });
    await recordComposioActionCall({ workspaceId: "ws-1", toolSlug: "GMAIL_FETCH_EMAILS" });

    const keys = recordUsageEvent.mock.calls.map(
      (call) => (call[0] as { idempotencyKey: string }).idempotencyKey,
    );
    expect(keys[0]).toMatch(/^composio_/);
    expect(keys[1]).toMatch(/^composio_/);
    expect(keys[0]).not.toBe(keys[1]);
  });

  it("never throws into the gate when the ledger fails", async () => {
    recordUsageEvent.mockRejectedValue(new Error("ledger down"));
    const { recordComposioActionCall } = await import("./record-composio-usage");

    await expect(
      recordComposioActionCall({
        workspaceId: "ws-1",
        toolSlug: "GMAIL_FETCH_EMAILS",
      })
    ).resolves.toBeUndefined();
  });
});
