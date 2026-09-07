import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CaptureEnvelope } from "../../adapters/types";
import type {
  GateResultCandidate,
  GateResultNoise,
  GateResultSignal,
} from "../../types/gate-result";
import type { RuleCheckResult } from "../rules-manager";

const checkRulesMock = vi.fn<() => Promise<RuleCheckResult>>();
vi.mock("../rules-manager", () => ({
  checkRules: (...args: unknown[]) => checkRulesMock(...(args as [])),
}));

vi.mock("../../adapters/feedback-entity", () => ({
  extractFeedbackEntityForEnvelope: vi.fn(async (envelope: CaptureEnvelope) => {
    const sender = (envelope.extracted as Record<string, unknown>)
      ?.sender_email;
    return typeof sender === "string"
      ? { type: "sender_email", key: sender }
      : null;
  }),
}));

const runKnownEntityGateMock = vi.fn<() => Promise<GateResultSignal | null>>();
vi.mock("./known-entity-gate", () => ({
  runKnownEntityGate: (...args: unknown[]) => runKnownEntityGateMock(...(args as [])),
}));

const runAdmissionGateMock = vi.fn<() => Promise<GateResultCandidate | GateResultNoise>>();
vi.mock("./admission-gate", () => ({
  runAdmissionGate: (...args: unknown[]) => runAdmissionGateMock(...(args as [])),
  checkCalendarRelationship: vi.fn(async () => false),
  checkPaymentRelationship: vi.fn(async () => false),
  checkFileSharing: vi.fn(async () => false),
}));

const classifyColdInboundIntentMock = vi.fn();
vi.mock("./cold-intent", () => ({
  classifyColdInboundIntent: (...args: unknown[]) =>
    classifyColdInboundIntentMock(...args),
  // Mirrors the real threshold rule; the real function is unit-tested in
  // cold-intent.test.ts.
  intentEarnsAdmission: (r: {
    checked: boolean;
    genuineInquiry: boolean;
    confidence: number;
  }) => r.checked && r.genuineInquiry && r.confidence >= 0.6,
}));

const getCustomizePromptBlockMock = vi.fn<() => Promise<string | null>>();
vi.mock("@/app/_features/memory/customize/queries", () => ({
  getCustomizePromptBlock: (...args: unknown[]) =>
    getCustomizePromptBlockMock(...(args as [])),
}));

import { runGatePipeline } from "./index";
import { resolveGatePolicy } from "./gate-policy";

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

const denyRule: RuleCheckResult = {
  verdict: "deny",
  rule: {
    id: "rule-1",
    workspaceId: "ws-1",
    provider: null,
    area: null,
    ruleType: "deny",
    entityType: "sender_email",
    entityKey: "stranger@somewhere.com",
    reason: "Keep this sender out",
    source: "user",
    createdBy: null,
    createdAt: "2026-08-10T00:00:00Z",
  },
};

const allowRule: RuleCheckResult = {
  verdict: "allow",
  rule: {
    ...denyRule.rule!,
    ruleType: "allow",
    reason: "Always let this sender in",
  },
};

beforeEach(() => {
  checkRulesMock.mockReset().mockResolvedValue({ verdict: null });
  runKnownEntityGateMock.mockReset().mockResolvedValue(null);
  runAdmissionGateMock.mockReset().mockResolvedValue(candidateResult);
  getCustomizePromptBlockMock.mockReset().mockResolvedValue(null);
  classifyColdInboundIntentMock.mockReset().mockResolvedValue({
    checked: false,
    genuineInquiry: false,
    confidence: 0,
    reason: "Intent read skipped",
  });
});

describe("runGatePipeline connector rules precedence", () => {
  it("explicit deny drops before any heuristic gate runs", async () => {
    checkRulesMock.mockResolvedValue(denyRule);

    const result = await runGatePipeline({
      workspaceId: "ws-1",
      userEmail: "me@myco.com",
      envelope: emailEnvelope(),
    });

    expect(result.finalAction).toBe("drop");
    expect(result.shouldIngest).toBe(false);
    expect(result.gateResults.rules).toEqual({
      action: "drop",
      gate: "rules",
      reason: "Keep this sender out",
      category: "blocked",
    });
    // Heuristics never ran.
    expect(result.gateResults.preIngest).toBeUndefined();
    expect(runKnownEntityGateMock).not.toHaveBeenCalled();
    expect(runAdmissionGateMock).not.toHaveBeenCalled();
  });

  it("explicit allow admits as signal, bypassing the memory-first hold", async () => {
    checkRulesMock.mockResolvedValue(allowRule);

    const result = await runGatePipeline({
      workspaceId: "ws-1",
      userEmail: "me@myco.com",
      envelope: emailEnvelope(),
    });

    expect(result.finalAction).toBe("signal");
    expect(result.shouldIngest).toBe(true);
    expect(result.gateResults.rules).toEqual({
      action: "signal",
      gate: "rules",
      reason: "Always let this sender in",
    });
    expect(runAdmissionGateMock).not.toHaveBeenCalled();
  });

  it("checks rules against the extracted feedback entity and sender name", async () => {
    await runGatePipeline({
      workspaceId: "ws-1",
      userEmail: "me@myco.com",
      envelope: emailEnvelope(),
    });

    expect(checkRulesMock).toHaveBeenCalledWith("ws-1", {
      provider: "gmail",
      area: "email",
      entity: { type: "sender_email", key: "stranger@somewhere.com" },
      patternCandidates: ["A Stranger"],
      entityCandidates: {
        subject_pattern: ["Hello"],
        title_pattern: ["Hello"],
        attendee: ["stranger@somewhere.com"],
        participant: ["stranger@somewhere.com"],
      },
    });
  });

  it("no rule match continues through the heuristic gates", async () => {
    const result = await runGatePipeline({
      workspaceId: "ws-1",
      userEmail: "me@myco.com",
      envelope: emailEnvelope(),
    });

    expect(result.passedGates).toContain("rules");
    expect(result.gateResults.rules).toBeUndefined();
  });
});

describe("runGatePipeline account-scoped captures", () => {
  function paymentEnvelope(overrides: Partial<CaptureEnvelope> = {}): CaptureEnvelope {
    return {
      sourceType: "stripe",
      captureType: "payment",
      externalId: "evt-1",
      title: "Invoice paid — $1,200.00",
      occurredAt: null,
      participants: [],
      threadId: null,
      extracted: { amount_cents: 120000, direction: "receivable" },
      raw: {},
      noise: null,
      ...overrides,
    } as CaptureEnvelope;
  }

  function fileEnvelope(overrides: Partial<CaptureEnvelope> = {}): CaptureEnvelope {
    return {
      sourceType: "googledrive",
      captureType: "file",
      externalId: "file-1",
      title: "Brand Proposal.pdf",
      occurredAt: null,
      participants: [
        {
          email: "drive-shares-dm-noreply@google.com",
          name: "Google Drive",
          role: "from",
        },
      ],
      threadId: null,
      extracted: { file_name: "Brand Proposal.pdf" },
      raw: {},
      noise: null,
      ...overrides,
    } as CaptureEnvelope;
  }

  it("a payment with no sender is evidence-eligible, never admission noise", async () => {
    runAdmissionGateMock.mockResolvedValue(noiseResult);

    const result = await runGatePipeline({
      workspaceId: "ws-1",
      userEmail: "me@myco.com",
      envelope: paymentEnvelope(),
    });

    expect(result.finalAction).toBe("candidate");
    expect(result.shouldIngest).toBe(true);
    // The email admission gate never runs for account-scoped captures.
    expect(runAdmissionGateMock).not.toHaveBeenCalled();
  });

  it("a Drive file from an automated share sender is evidence-eligible", async () => {
    runAdmissionGateMock.mockResolvedValue(noiseResult);

    const result = await runGatePipeline({
      workspaceId: "ws-1",
      userEmail: "me@myco.com",
      envelope: fileEnvelope(),
    });

    expect(result.finalAction).toBe("candidate");
    expect(runAdmissionGateMock).not.toHaveBeenCalled();
  });

  it("a note capture is evidence-eligible", async () => {
    const result = await runGatePipeline({
      workspaceId: "ws-1",
      userEmail: "me@myco.com",
      envelope: paymentEnvelope({ captureType: "note", sourceType: "notion" }),
    });

    expect(result.finalAction).toBe("candidate");
    expect(runAdmissionGateMock).not.toHaveBeenCalled();
  });

  it("a meeting with another person on it is evidence-eligible", async () => {
    const result = await runGatePipeline({
      workspaceId: "ws-1",
      userEmail: "me@myco.com",
      envelope: paymentEnvelope({
        sourceType: "googlecalendar",
        captureType: "meeting",
        participants: [
          { email: "me@myco.com", name: "Me", role: "from" },
          { email: "client@acme.com", name: "Client", role: "to" },
        ],
        extracted: { attendees_known: true },
      }),
    });

    expect(result.finalAction).toBe("candidate");
    expect(runAdmissionGateMock).not.toHaveBeenCalled();
  });

  it("the calendar keep-out still drops solo blocks before the bypass", async () => {
    const result = await runGatePipeline({
      workspaceId: "ws-1",
      userEmail: "me@myco.com",
      envelope: paymentEnvelope({
        sourceType: "googlecalendar",
        captureType: "meeting",
        participants: [{ email: "me@myco.com", name: "Me", role: "from" }],
        extracted: { attendees_known: true },
      }),
    });

    expect(result.finalAction).toBe("drop");
    expect(result.shouldIngest).toBe(false);
    expect(result.gateResults.calendarKeepOut?.reason).toMatch(/no one else/i);
  });

  it("an explicit deny rule still drops a file capture", async () => {
    checkRulesMock.mockResolvedValue(denyRule);

    const result = await runGatePipeline({
      workspaceId: "ws-1",
      userEmail: "me@myco.com",
      envelope: fileEnvelope(),
    });

    expect(result.finalAction).toBe("drop");
    expect(result.shouldIngest).toBe(false);
  });

  it("an explicit allow rule still admits a payment at full prominence", async () => {
    checkRulesMock.mockResolvedValue(allowRule);

    const result = await runGatePipeline({
      workspaceId: "ws-1",
      userEmail: "me@myco.com",
      envelope: paymentEnvelope(),
    });

    expect(result.finalAction).toBe("signal");
  });

  it("the known-entity fast track still wins for a file from a known sender", async () => {
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
      envelope: fileEnvelope(),
    });

    expect(result.finalAction).toBe("signal");
    expect(result.targetEntity?.entityId).toBe("person-1");
  });
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

describe("runGatePipeline Lane 1 discriminator (cold-inbound intent read)", () => {
  it("a genuine inquiry earns REAL-TIME admission past the Memory-first hold", async () => {
    runAdmissionGateMock.mockResolvedValue(noiseResult);
    classifyColdInboundIntentMock.mockResolvedValue({
      checked: true,
      genuineInquiry: true,
      confidence: 0.9,
      reason: "Asks about wedding photography availability on June 14",
    });

    const result = await runGatePipeline({
      workspaceId: "ws-1",
      userEmail: "me@myco.com",
      envelope: emailEnvelope({
        title: "Are you free June 14?",
        extracted: {
          subject: "Are you free June 14?",
          snippet: "Hi! We're getting married June 14 and love your work…",
          sender_email: "bride@gmail.com",
          isSentByUser: false,
        },
      }),
      coldIntentRead: true,
    });

    expect(result.finalAction).toBe("candidate");
    expect(result.shouldIngest).toBe(true);
    expect(result.coldIntent?.genuineInquiry).toBe(true);
    expect(result.gateResults.admission?.action).toBe("candidate");
    expect(
      (result.gateResults.admission as GateResultCandidate).signals.some(
        (s) => s.type === "intent_inquiry",
      ),
    ).toBe(true);
  });

  it("a negative intent read holds the mail exactly as before, with the outcome recorded", async () => {
    runAdmissionGateMock.mockResolvedValue(noiseResult);
    classifyColdInboundIntentMock.mockResolvedValue({
      checked: true,
      genuineInquiry: false,
      confidence: 0.95,
      reason: "Mass-personalized sales outreach",
    });

    const result = await runGatePipeline({
      workspaceId: "ws-1",
      userEmail: "me@myco.com",
      envelope: emailEnvelope(),
      coldIntentRead: true,
    });

    expect(result.finalAction).toBe("held");
    // Recorded for Activity / failure-mode telemetry even though held.
    expect(result.coldIntent?.checked).toBe(true);
    expect(result.coldIntent?.genuineInquiry).toBe(false);
  });

  it("a failed/skipped read (checked=false) can never admit — fail-neutral", async () => {
    runAdmissionGateMock.mockResolvedValue(noiseResult);
    classifyColdInboundIntentMock.mockResolvedValue({
      checked: false,
      genuineInquiry: true,
      confidence: 1,
      reason: "Intent read unavailable",
    });

    const result = await runGatePipeline({
      workspaceId: "ws-1",
      userEmail: "me@myco.com",
      envelope: emailEnvelope(),
      coldIntentRead: true,
    });

    expect(result.finalAction).toBe("held");
  });

  it("backfill paths (flag unset) never pay for an intent read", async () => {
    runAdmissionGateMock.mockResolvedValue(noiseResult);

    const result = await runGatePipeline({
      workspaceId: "ws-1",
      userEmail: "me@myco.com",
      envelope: emailEnvelope(),
    });

    expect(result.finalAction).toBe("held");
    expect(classifyColdInboundIntentMock).not.toHaveBeenCalled();
    expect(result.coldIntent).toBeUndefined();
  });

  it("admission-candidate + genuine intent stacks the signal instead of replacing", async () => {
    runAdmissionGateMock.mockResolvedValue(candidateResult);
    classifyColdInboundIntentMock.mockResolvedValue({
      checked: true,
      genuineInquiry: true,
      confidence: 0.8,
      reason: "Service inquiry",
    });

    const result = await runGatePipeline({
      workspaceId: "ws-1",
      userEmail: "me@myco.com",
      envelope: emailEnvelope(),
      coldIntentRead: true,
    });

    expect(result.finalAction).toBe("candidate");
    const admission = result.gateResults.admission as GateResultCandidate;
    expect(admission.confidence).toBe(85); // 45 + 40
    expect(admission.signals.map((s) => s.type)).toContain("intent_inquiry");
  });

  it("Track A (M4): the workspace's person/work customizations ride the intent read", async () => {
    getCustomizePromptBlockMock.mockResolvedValue(
      '<workspace-customizations>\n- "Never treat my accountant as a client"\n</workspace-customizations>',
    );
    classifyColdInboundIntentMock.mockResolvedValue({
      checked: true,
      genuineInquiry: true,
      confidence: 0.8,
      reason: "Service inquiry",
    });

    await runGatePipeline({
      workspaceId: "ws-1",
      userEmail: "me@myco.com",
      envelope: emailEnvelope(),
      coldIntentRead: true,
    });

    expect(getCustomizePromptBlockMock).toHaveBeenCalledWith("ws-1", [
      "person",
      "work",
    ]);
    expect(classifyColdInboundIntentMock).toHaveBeenCalledWith(
      expect.objectContaining({
        customizeContext: expect.stringContaining(
          "Never treat my accountant as a client",
        ),
      }),
    );
  });

  it("Track A (M4): a customization-load failure never blocks the read", async () => {
    getCustomizePromptBlockMock.mockRejectedValue(new Error("db down"));
    classifyColdInboundIntentMock.mockResolvedValue({
      checked: true,
      genuineInquiry: true,
      confidence: 0.8,
      reason: "Service inquiry",
    });

    const result = await runGatePipeline({
      workspaceId: "ws-1",
      userEmail: "me@myco.com",
      envelope: emailEnvelope(),
      coldIntentRead: true,
    });

    expect(result.finalAction).toBe("candidate");
    expect(classifyColdInboundIntentMock).toHaveBeenCalledWith(
      expect.objectContaining({ customizeContext: null }),
    );
  });
});

describe("runGatePipeline gate policy (Customize surfaces, S3)", () => {
  function automatedEnvelope(): CaptureEnvelope {
    // Deliberately NOT a known SaaS vendor domain: these tests pin the
    // automated-senders policy behavior without the subscription let-through
    // (vendor receipts on known domains get their own tests below).
    return emailEnvelope({
      participants: [
        { email: "receipts@randomstore.io", name: null, role: "from" },
      ],
      extracted: {
        subject: "Your receipt",
        sender_email: "receipts@randomstore.io",
        isSentByUser: false,
      },
    });
  }

  function vendorReceiptEnvelope(): CaptureEnvelope {
    return emailEnvelope({
      participants: [
        { email: "receipts@clickup.com", name: null, role: "from" },
      ],
      extracted: {
        subject: "Your ClickUp receipt",
        sender_email: "receipts@clickup.com",
        isSentByUser: false,
      },
    });
  }

  it("strangers = dropped drops stranger mail before paying for a cold-intent read", async () => {
    const result = await runGatePipeline({
      workspaceId: "ws-1",
      userEmail: "me@myco.com",
      envelope: emailEnvelope(),
      coldIntentRead: true,
      gatePolicy: resolveGatePolicy({ email: { strangers: "dropped" } }),
    });

    expect(result.finalAction).toBe("drop");
    expect(result.shouldIngest).toBe(false);
    expect(result.gateResults.policy).toEqual({
      action: "drop",
      gate: "policy",
      reason: "Workspace policy: mail from strangers is dropped",
      category: "blocked",
    });
    expect(classifyColdInboundIntentMock).not.toHaveBeenCalled();
  });

  it("strangers = let_in bypasses the hold — stranger mail lands at full prominence", async () => {
    const result = await runGatePipeline({
      workspaceId: "ws-1",
      userEmail: "me@myco.com",
      envelope: emailEnvelope(),
      gatePolicy: resolveGatePolicy({ email: { strangers: "let_in" } }),
    });

    expect(result.finalAction).toBe("candidate");
    expect(result.shouldIngest).toBe(true);
    expect(result.gateResults.policy).toBeUndefined();
  });

  it("no policy (defaults) still holds stranger mail", async () => {
    const result = await runGatePipeline({
      workspaceId: "ws-1",
      userEmail: "me@myco.com",
      envelope: emailEnvelope(),
    });

    expect(result.finalAction).toBe("held");
  });

  it("default policy drops automated mail at pre-ingest", async () => {
    const result = await runGatePipeline({
      workspaceId: "ws-1",
      userEmail: "me@myco.com",
      envelope: automatedEnvelope(),
    });

    expect(result.finalAction).toBe("drop");
    expect(result.shouldIngest).toBe(false);
    expect(result.gateResults.preIngest?.category).toBe("automated");
  });

  it("automatedSenders = watched lets automated mail past the drop but still holds it", async () => {
    const result = await runGatePipeline({
      workspaceId: "ws-1",
      userEmail: "me@myco.com",
      envelope: automatedEnvelope(),
      gatePolicy: resolveGatePolicy({
        email: { automated_senders: "watched" },
      }),
    });

    expect(result.gateResults.preIngest).toBeNull();
    expect(result.finalAction).toBe("held");
  });

  it("automatedSenders = let_in admits automated mail past both the drop and the hold", async () => {
    const result = await runGatePipeline({
      workspaceId: "ws-1",
      userEmail: "me@myco.com",
      envelope: automatedEnvelope(),
      gatePolicy: resolveGatePolicy({
        email: { automated_senders: "let_in" },
      }),
    });

    expect(result.gateResults.preIngest).toBeNull();
    expect(result.finalAction).toBe("candidate");
    expect(result.shouldIngest).toBe(true);
  });

  it("marketing detections still drop even when automatedSenders = let_in", async () => {
    const envelope = emailEnvelope({
      raw: {
        messageId: "msg-1",
        headers: { "List-Unsubscribe": "<mailto:unsub@example.com>" },
      },
    });

    const result = await runGatePipeline({
      workspaceId: "ws-1",
      userEmail: "me@myco.com",
      envelope,
      gatePolicy: resolveGatePolicy({
        email: { automated_senders: "let_in" },
      }),
    });

    expect(result.finalAction).toBe("drop");
    expect(result.gateResults.preIngest?.category).toBe("marketing");
  });

  it("strangers = dropped does not drop mail the user sent", async () => {
    const envelope = emailEnvelope();
    (envelope.extracted as Record<string, unknown>).isSentByUser = true;

    const result = await runGatePipeline({
      workspaceId: "ws-1",
      userEmail: "me@myco.com",
      envelope,
      gatePolicy: resolveGatePolicy({ email: { strangers: "dropped" } }),
    });

    expect(result.finalAction).toBe("candidate");
  });

  it("trackSubscriptions (default tracked) lets known-vendor receipts past the drop and the hold", async () => {
    const result = await runGatePipeline({
      workspaceId: "ws-1",
      userEmail: "me@myco.com",
      envelope: vendorReceiptEnvelope(),
    });

    expect(result.gateResults.preIngest).toBeNull();
    expect(result.finalAction).toBe("candidate");
    expect(result.shouldIngest).toBe(true);
  });

  it("trackSubscriptions = ignored keeps known-vendor receipts dropped", async () => {
    const result = await runGatePipeline({
      workspaceId: "ws-1",
      userEmail: "me@myco.com",
      envelope: vendorReceiptEnvelope(),
      gatePolicy: resolveGatePolicy({
        email: { track_subscriptions: "ignored" },
      }),
    });

    expect(result.finalAction).toBe("drop");
    expect(result.gateResults.preIngest?.category).toBe("automated");
  });

  it("marketing detections on vendor domains still drop when subscriptions are tracked", async () => {
    const envelope = vendorReceiptEnvelope();
    envelope.raw = {
      ...(envelope.raw as Record<string, unknown>),
      headers: { "List-Unsubscribe": "<mailto:unsub@clickup.com>" },
    };

    const result = await runGatePipeline({
      workspaceId: "ws-1",
      userEmail: "me@myco.com",
      envelope,
    });

    expect(result.finalAction).toBe("drop");
    expect(result.gateResults.preIngest?.category).toBe("marketing");
  });
});
