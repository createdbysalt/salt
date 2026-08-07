import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CaptureEnvelope } from "../../adapters/types";
import type { GateResultCandidate, GateResultNoise, GateResultSignal } from "../../types/gate-result";

vi.mock("../blocklist-manager", () => ({
  isBlocked: vi.fn(async () => ({ blocked: false })),
}));

const runKnownEntityGateMock = vi.fn<() => Promise<GateResultSignal | null>>();
vi.mock("./known-entity-gate", () => ({
  runKnownEntityGate: (...args: unknown[]) => runKnownEntityGateMock(...(args as [])),
  checkPriorInteraction: vi.fn(async () => false),
}));

const runAdmissionGateMock = vi.fn<() => Promise<GateResultCandidate | GateResultNoise>>();
vi.mock("./admission-gate", () => ({
  runAdmissionGate: (...args: unknown[]) => runAdmissionGateMock(...(args as [])),
  checkCalendarRelationship: vi.fn(async () => false),
  checkPaymentRelationship: vi.fn(async () => false),
  checkFileSharing: vi.fn(async () => false),
}));

import { runGatePipeline } from "./index";

function emailEnvelope(overrides: Partial<CaptureEnvelope> = {}): CaptureEnvelope {
  return {
    sourceType: "gmail",
    captureType: "message",
    externalId: "msg-1",
    title: "Hello",
    occurredAt: null,
    participants: [{ email: "stranger@somewhere.com", name: "A Stranger", role: "from" }],
    threadId: "t-1",
    extracted: {
      subject: "Hello",
      sender_email: "stranger@somewhere.com",
      isSentByUser: false,
    },
    raw: { messageId: "msg-1" },
    noise: null,
    ...overrides,
  } as CaptureEnvelope;
}

const candidateResult: GateResultCandidate = {
  action: "candidate",
  gate: "admission",
  confidence: 45,
  signals: [],
  reason: "Some engagement",
};

const noiseResult: GateResultNoise = {
  action: "noise",
  gate: "admission",
  reason: "Cold inbound",
  category: "cold_inbound",
};

beforeEach(() => {
  runKnownEntityGateMock.mockReset().mockResolvedValue(null);
  runAdmissionGateMock.mockReset().mockResolvedValue(candidateResult);
});

describe("runGatePipeline Memory-first email policy", () => {
  it("holds unknown-sender inbound email even when admission says candidate", async () => {
    const result = await runGatePipeline({
      workspaceId: "ws-1",
      userEmail: "me@myco.com",
      envelope: emailEnvelope(),
    });

    expect(result.finalAction).toBe("held");
    expect(result.shouldIngest).toBe(true);
    // Admission result is preserved so discovery can score the held sender.
    expect(result.gateResults.admission).toEqual(candidateResult);
  });

  it("holds unknown-sender inbound email when admission says noise", async () => {
    runAdmissionGateMock.mockResolvedValue(noiseResult);

    const result = await runGatePipeline({
      workspaceId: "ws-1",
      userEmail: "me@myco.com",
      envelope: emailEnvelope(),
    });

    expect(result.finalAction).toBe("held");
  });

  it("never holds mail the user sent — outbound powers the reply loop", async () => {
    const envelope = emailEnvelope();
    (envelope.extracted as Record<string, unknown>).isSentByUser = true;

    const result = await runGatePipeline({
      workspaceId: "ws-1",
      userEmail: "me@myco.com",
      envelope,
    });

    expect(result.finalAction).toBe("candidate");
  });

  it("keeps the known-entity fast track — Memory-matched mail is a signal", async () => {
    runKnownEntityGateMock.mockResolvedValue({
      action: "signal",
      gate: "known-entity",
      target: {
        surface: "people",
        entityId: "person-1",
        matchType: "email",
        confidence: 0.95,
      },
      reason: "Known person",
    });

    const result = await runGatePipeline({
      workspaceId: "ws-1",
      userEmail: "me@myco.com",
      envelope: emailEnvelope(),
    });

    expect(result.finalAction).toBe("signal");
    expect(result.targetEntity?.entityId).toBe("person-1");
  });

  it("does not hold non-email captures — billing stays a candidate", async () => {
    const envelope = emailEnvelope({
      sourceType: "stripe",
      captureType: "payment",
      participants: [{ email: "customer@somewhere.com", name: null, role: "from" }],
      extracted: { amount: 250, currency: "usd" },
    });

    const result = await runGatePipeline({
      workspaceId: "ws-1",
      userEmail: "me@myco.com",
      envelope,
    });

    expect(result.finalAction).toBe("candidate");
  });

  it("does not hold non-email message sources like Slack", async () => {
    const envelope = emailEnvelope({
      sourceType: "slack",
      participants: [{ email: null, name: "U123", role: "from" }],
      extracted: { text: "hey", isSentByUser: false },
    });

    const result = await runGatePipeline({
      workspaceId: "ws-1",
      userEmail: "me@myco.com",
      envelope,
    });

    expect(result.finalAction).toBe("candidate");
  });
});
