import { beforeEach, describe, expect, it, vi } from "vitest";

const sendLlmMock = vi.fn();
vi.mock("server-only", () => ({}));
vi.mock("@/app/_lib/ai/gpt", () => ({
  sendLlm: (...args: unknown[]) => sendLlmMock(...args),
  committedSpend: vi.fn().mockReturnValue({ kind: "workspace", origin: "committed" }),
}));

import { generateRunSummary } from "./run-summary";

const baseInput = {
  workspaceId: "ws-1",
  userId: "user-1",
  playbookName: "Payment Received",
  triggerLabel: "Payment received in Stripe",
  targetLabel: "Meridian Studio",
  channel: "Gmail",
  evidenceLabels: [
    "Payment received in Stripe",
    "Checked Stripe for payment details",
  ],
  draftExcerpt: "Hi Alex, thank you for your payment of $300…",
};

describe("generateRunSummary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the model's summary, trimmed", async () => {
    sendLlmMock.mockResolvedValue(
      "  Stripe confirmed a $300 payment from Meridian Studio; a thank-you email is drafted in Gmail.  ",
    );
    const summary = await generateRunSummary(baseInput);
    expect(summary).toBe(
      "Stripe confirmed a $300 payment from Meridian Studio; a thank-you email is drafted in Gmail.",
    );
  });

  it("sends the run facts (trigger, target, evidence, draft excerpt) in the prompt", async () => {
    sendLlmMock.mockResolvedValue("summary");
    await generateRunSummary(baseInput);
    const messages = sendLlmMock.mock.calls[0]?.[0] as Array<{
      role: string;
      content: string;
    }>;
    const user = messages.find((m) => m.role === "user")?.content ?? "";
    expect(user).toContain("Payment Received");
    expect(user).toContain("Payment received in Stripe");
    expect(user).toContain("Meridian Studio");
    expect(user).toContain("Gmail");
    expect(user).toContain("Checked Stripe for payment details");
    expect(user).toContain("thank you for your payment");
  });

  it("uses the playRunSummary routing slot with a small token budget", async () => {
    sendLlmMock.mockResolvedValue("summary");
    await generateRunSummary(baseInput);
    const options = sendLlmMock.mock.calls[0]?.[2] as Record<string, unknown>;
    expect(options.routingKey).toBe("playRunSummary");
    expect(options.maxTokens).toBeLessThanOrEqual(200);
  });

  it("returns null when the model returns nothing", async () => {
    sendLlmMock.mockResolvedValue(null);
    expect(await generateRunSummary(baseInput)).toBeNull();
  });

  it("returns null when the model errors (caller falls back)", async () => {
    sendLlmMock.mockRejectedValue(new Error("over budget"));
    expect(await generateRunSummary(baseInput)).toBeNull();
  });

  it("strips surrounding quotes the model sometimes adds", async () => {
    sendLlmMock.mockResolvedValue('"A summary in quotes."');
    expect(await generateRunSummary(baseInput)).toBe("A summary in quotes.");
  });

  it("collapses the summary to a single paragraph", async () => {
    sendLlmMock.mockResolvedValue("First line.\n\nSecond paragraph.");
    expect(await generateRunSummary(baseInput)).toBe("First line. Second paragraph.");
  });
});
