import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const sendLlmMock = vi.fn();
vi.mock("@/app/_lib/ai", () => ({
  sendLlm: (...args: unknown[]) => sendLlmMock(...args),
  backgroundSpend: (workspaceId: string) => ({
    kind: "workspace",
    workspaceId,
    origin: "background",
  }),
}));

import {
  classifyColdInboundIntent,
  intentEarnsAdmission,
  COLD_INTENT_ADMIT_CONFIDENCE,
} from "./cold-intent";

const INPUT = {
  workspaceId: "ws-1",
  senderEmail: "bride@gmail.com",
  senderName: "Jamie",
  subject: "Are you free June 14?",
  snippet: "We're getting married and love your work",
};

beforeEach(() => {
  sendLlmMock.mockReset();
});

describe("classifyColdInboundIntent", () => {
  it("parses a genuine-inquiry verdict", async () => {
    sendLlmMock.mockResolvedValue(
      '{"genuine_inquiry": true, "confidence": 0.92, "reason": "Wedding booking inquiry"}',
    );

    const result = await classifyColdInboundIntent(INPUT);

    expect(result).toEqual({
      checked: true,
      genuineInquiry: true,
      confidence: 0.92,
      reason: "Wedding booking inquiry",
    });
  });

  it("extracts JSON from surrounding prose/fences and clamps confidence", async () => {
    sendLlmMock.mockResolvedValue(
      'Sure! ```json\n{"genuine_inquiry": false, "confidence": 3, "reason": "Newsletter"}\n```',
    );

    const result = await classifyColdInboundIntent(INPUT);

    expect(result.checked).toBe(true);
    expect(result.genuineInquiry).toBe(false);
    expect(result.confidence).toBe(1);
  });

  it("never pays when there is nothing to classify", async () => {
    const result = await classifyColdInboundIntent({
      ...INPUT,
      subject: null,
      snippet: "   ",
    });

    expect(sendLlmMock).not.toHaveBeenCalled();
    expect(result.checked).toBe(false);
  });

  it("fails neutral when spend is refused (sendLlm null contract)", async () => {
    sendLlmMock.mockResolvedValue(null);

    const result = await classifyColdInboundIntent(INPUT);

    expect(result.checked).toBe(false);
    expect(result.genuineInquiry).toBe(false);
  });

  it("fails neutral on unparseable output", async () => {
    sendLlmMock.mockResolvedValue("definitely a real inquiry, trust me");

    const result = await classifyColdInboundIntent(INPUT);

    expect(result.checked).toBe(false);
  });

  it("fails neutral when sendLlm throws", async () => {
    sendLlmMock.mockRejectedValue(new Error("provider down"));

    const result = await classifyColdInboundIntent(INPUT);

    expect(result.checked).toBe(false);
  });

  it("spends as workspace background with the cheap routing key", async () => {
    sendLlmMock.mockResolvedValue(
      '{"genuine_inquiry": true, "confidence": 0.8, "reason": "ok"}',
    );

    await classifyColdInboundIntent(INPUT);

    const [, spend, options] = sendLlmMock.mock.calls[0] as [
      unknown,
      { kind: string; workspaceId: string; origin: string },
      { routingKey: string; maxTokens: number },
    ];
    expect(spend).toEqual({
      kind: "workspace",
      workspaceId: "ws-1",
      origin: "background",
    });
    expect(options.routingKey).toBe("coldIntent");
    expect(options.maxTokens).toBeLessThanOrEqual(200);
  });
});

describe("intentEarnsAdmission", () => {
  it("requires checked AND genuine AND threshold confidence", () => {
    const base = { checked: true, genuineInquiry: true, reason: "r" };
    expect(
      intentEarnsAdmission({ ...base, confidence: COLD_INTENT_ADMIT_CONFIDENCE }),
    ).toBe(true);
    expect(intentEarnsAdmission({ ...base, confidence: 0.59 })).toBe(false);
    expect(
      intentEarnsAdmission({ ...base, genuineInquiry: false, confidence: 1 }),
    ).toBe(false);
    expect(
      intentEarnsAdmission({ ...base, checked: false, confidence: 1 } as never),
    ).toBe(false);
  });
});
