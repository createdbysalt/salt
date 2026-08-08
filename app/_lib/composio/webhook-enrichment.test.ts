import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const executeComposioAction = vi.fn();

vi.mock("./actions", () => ({
  executeComposioAction: (...args: unknown[]) => executeComposioAction(...args),
}));

// The raw client must never be needed by this module; the mock exists so a
// regression back to direct client use fails the assertions below instead of
// erroring on missing env.
const rawExecute = vi.fn();
vi.mock("./client", () => ({
  getComposioClient: () => ({ tools: { execute: rawExecute } }),
}));

describe("enrichWebhookPayload", () => {
  beforeEach(() => {
    executeComposioAction.mockReset();
    rawExecute.mockReset();
  });

  it("routes enrichment through the metered gate with unattended context", async () => {
    executeComposioAction.mockResolvedValue({
      response_data: { subject: "Hello", bodyPreview: "Hi there" },
    });
    const { enrichWebhookPayload } = await import("./webhook-enrichment");

    const result = await enrichWebhookPayload(
      "OUTLOOK_MESSAGE_TRIGGER",
      { id: "m1" },
      "ca-123",
      "ws-1"
    );

    expect(executeComposioAction).toHaveBeenCalledTimes(1);
    expect(executeComposioAction).toHaveBeenCalledWith(
      "OUTLOOK_OUTLOOK_GET_MESSAGE",
      { message_id: "m1", user_id: "me" },
      "ca-123",
      "ws-1",
      expect.objectContaining({
        skipAuthCheck: true,
        unattended: true,
        workspaceId: "ws-1",
      })
    );
    expect(rawExecute).not.toHaveBeenCalled();
    expect(result.enriched).toBe(true);
    expect(result.payload).toEqual({ subject: "Hello", bodyPreview: "Hi there" });
  });

  it("skips enrichment when the payload already has content", async () => {
    const { enrichWebhookPayload } = await import("./webhook-enrichment");

    const payload = { subject: "Already full", id: "m2" };
    const result = await enrichWebhookPayload(
      "OUTLOOK_MESSAGE_TRIGGER",
      payload,
      "ca-123",
      "ws-1"
    );

    expect(executeComposioAction).not.toHaveBeenCalled();
    expect(result.enriched).toBe(false);
    expect(result.payload).toBe(payload);
  });

  it("returns the original payload when the gate refuses (budget/rate limit)", async () => {
    executeComposioAction.mockRejectedValue(
      new Error("Workspace budget exhausted")
    );
    const { enrichWebhookPayload } = await import("./webhook-enrichment");

    const payload = { id: "m3" };
    const result = await enrichWebhookPayload(
      "OUTLOOK_MESSAGE_TRIGGER",
      payload,
      "ca-123",
      "ws-1"
    );

    expect(executeComposioAction).toHaveBeenCalledTimes(1);
    expect(result.enriched).toBe(false);
    expect(result.payload).toBe(payload);
    expect(result.error).toContain("budget");
  });

  it("leaves triggers without an enrichment spec untouched", async () => {
    const { enrichWebhookPayload } = await import("./webhook-enrichment");

    const payload = { id: "m4" };
    const result = await enrichWebhookPayload(
      "GMAIL_NEW_GMAIL_MESSAGE",
      payload,
      "ca-123",
      "ws-1"
    );

    expect(executeComposioAction).not.toHaveBeenCalled();
    expect(result.enriched).toBe(false);
    expect(result.payload).toBe(payload);
  });

  it("tolerates fully-unwrapped tool results from the gate", async () => {
    executeComposioAction.mockResolvedValue({ subject: "Plain result" });
    const { enrichWebhookPayload } = await import("./webhook-enrichment");

    const result = await enrichWebhookPayload(
      "OUTLOOK_SENT_MESSAGE_TRIGGER",
      { message_id: "m5" },
      "ca-123",
      "ws-1"
    );

    expect(result.enriched).toBe(true);
    expect(result.payload).toEqual({ subject: "Plain result" });
  });
});
