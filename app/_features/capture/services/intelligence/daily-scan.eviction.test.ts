import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Plays canon Phase 2: intelligence findings never write ghost play_runs.
 *
 * - revenue_risk: lands in intelligence_findings stamped `needs_you`
 *   (never auto-handled) so it renders in HQ "Heads up".
 * - unknown-sender signals: create nothing and record the honest
 *   `signal_unrouted` capture outcome — no fake finding_id for Sources
 *   Activity to misreport as "confirmed".
 */

const { insertCalls } = vi.hoisted(() => ({
  insertCalls: [] as Array<{ table: string; payload: Record<string, unknown> }>,
}));

vi.mock("@/app/_lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn((table: string) => ({
      insert: vi.fn((payload: Record<string, unknown>) => {
        insertCalls.push({ table, payload });
        return {
          select: vi.fn(() => ({
            single: vi.fn(async () => ({
              data: { id: "finding-row-1" },
              error: null,
            })),
          })),
        };
      }),
    })),
  })),
}));

import { createAdminClient } from "@/app/_lib/supabase/admin";
import {
  createFindingsFromAnalysis,
  routeUnknownSenderSignal,
  type DailyScanResult,
} from "./daily-scan";
import type { EmailAnalysis, EmailToAnalyze } from "./email-analyzer";

function makeEmail(overrides: Partial<EmailToAnalyze> = {}): EmailToAnalyze {
  return {
    id: "capture-1",
    from_email: "anna@studio.com",
    from_name: "Anna",
    to_emails: ["me@usesalt.io"],
    subject: "Budget update",
    snippet: "We need to pause",
    body_text: "We need to pause the project for a quarter.",
    sent_at: "2026-08-08T10:00:00.000Z",
    thread_id: "thread-1",
    is_sent_by_user: false,
    has_prior_thread: true,
    ...overrides,
  };
}

function makeResult(): DailyScanResult {
  return {
    workspaceId: "ws-1",
    emailsProcessed: 0,
    findingsCreated: 0,
    peopleResolved: 0,
    fieldsApplied: 0,
    fieldsAccumulated: 0,
    errors: [],
  };
}

function analysisWith(
  finding: EmailAnalysis["findings"][number]
): EmailAnalysis {
  return { findings: [finding], is_noise: false };
}

const riskFinding = {
  type: "revenue_risk" as const,
  title: "Client wants to pause",
  content: "Budget got cut for the quarter.",
  evidence_quote: "We need to pause the project",
  confidence: 95,
};

beforeEach(() => {
  vi.clearAllMocks();
  insertCalls.length = 0;
});

describe("createFindingsFromAnalysis — revenue_risk", () => {
  it("lands in intelligence_findings stamped needs_you even at auto-handle confidence", async () => {
    const result = makeResult();

    const findingId = await createFindingsFromAnalysis({
      workspaceId: "ws-1",
      captureId: "capture-1",
      email: makeEmail(),
      personId: "person-1",
      analysis: analysisWith(riskFinding),
      dryRun: false,
      supabase: createAdminClient(),
      result,
    });

    expect(insertCalls).toHaveLength(1);
    const [{ table, payload }] = insertCalls;
    expect(table).toBe("intelligence_findings");
    expect(payload.finding_type).toBe("revenue_risk");
    // Asymmetry fix: confidence 95 would auto-handle under the generic rule,
    // but risk must always get human attention.
    expect(payload.state).toBe("needs_you");
    expect(payload.person_id).toBe("person-1");
    expect(payload.confidence).toBe(95);
    expect(findingId).toBe("finding-row-1");
    expect(result.findingsCreated).toBe(1);
    expect(result.errors).toHaveLength(0);
  });

  it("non-risk findings keep the generic auto-handle rule", async () => {
    const result = makeResult();

    await createFindingsFromAnalysis({
      workspaceId: "ws-1",
      captureId: "capture-1",
      email: makeEmail(),
      personId: "person-1",
      analysis: analysisWith({
        type: "revenue_buying",
        title: "Buying intent",
        content: "What would it cost?",
        confidence: 95,
      }),
      dryRun: false,
      supabase: createAdminClient(),
      result,
    });

    expect(insertCalls).toHaveLength(1);
    expect(insertCalls[0].payload.state).toBe("auto_handled");
  });
});

describe("routeUnknownSenderSignal", () => {
  const routingArgs = () => ({
    workspaceId: "ws-1",
    captureId: "capture-1",
    email: makeEmail(),
    analysis: analysisWith({
      type: "revenue_buying" as const,
      title: "Buying intent from unknown sender",
      content: "Interested in working with you.",
      evidence_quote: "What would it cost?",
      confidence: 80,
    }),
    paymentPayerHint: null,
    dryRun: false,
    supabase: createAdminClient(),
    result: makeResult(),
  });

  it("creates nothing and returns the honest signal_unrouted outcome", async () => {
    const args = routingArgs();

    const routing = await routeUnknownSenderSignal(args);

    // No play_runs row, no replacement record — no writes at all.
    expect(insertCalls).toHaveLength(0);
    // No fake finding_id — Sources Activity must not claim "confirmed".
    expect(routing).toEqual({ outcome: "signal_unrouted", findingId: null });
    // Honest accounting: nothing was created.
    expect(args.result.findingsCreated).toBe(0);
    expect(args.result.errors).toHaveLength(0);
  });

  it("dryRun does not fake a created finding either", async () => {
    const args = { ...routingArgs(), dryRun: true };

    const routing = await routeUnknownSenderSignal(args);

    expect(insertCalls).toHaveLength(0);
    expect(routing).toEqual({ outcome: "signal_unrouted", findingId: null });
    expect(args.result.findingsCreated).toBe(0);
  });
});
