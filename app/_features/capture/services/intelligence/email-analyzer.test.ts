import { describe, expect, it, vi } from "vitest";
import { analyzeEmail, coerceEmailAnalysis } from "./email-analyzer";
import type { EmailToAnalyze } from "./email-analyzer";

function sampleEmail(overrides: Partial<EmailToAnalyze>): EmailToAnalyze {
  return {
    id: "test-id",
    from_email: "client@example.com",
    from_name: "Client",
    to_emails: ["hello@createdbysalt.com"],
    subject: "Project question",
    snippet: "",
    body_text: "",
    sent_at: new Date().toISOString(),
    thread_id: "thread-1",
    is_sent_by_user: false,
    has_prior_thread: true,
    ...overrides,
  };
}

describe("coerceEmailAnalysis", () => {
  it("defaults missing findings to an empty array", () => {
    const result = coerceEmailAnalysis({
      is_noise: true,
      noise_reason: "Newsletter",
    });

    expect(result.findings).toEqual([]);
    expect(result.is_noise).toBe(true);
    expect(result.noise_reason).toBe("Newsletter");
  });

  it("preserves valid findings", () => {
    const result = coerceEmailAnalysis({
      is_noise: false,
      findings: [
        {
          type: "revenue_buying",
          title: "Client asked for pricing",
          confidence: 90,
        },
      ],
    });

    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]?.type).toBe("revenue_buying");
  });

  it("handles empty or invalid input", () => {
    const result = coerceEmailAnalysis({});
    expect(result.findings).toEqual([]);
    expect(result.is_noise).toBe(false);
  });
});

describe("analyzeEmail noise short-circuit", () => {
  it("skips LLM for bulk marketing mail", async () => {
    const llmCall = vi.fn().mockResolvedValue("{}");

    const result = await analyzeEmail(
      sampleEmail({
        from_email: "promo@brand.com",
        subject: "Flash sale",
        headers: {
          "list-unsubscribe": "<mailto:unsub@brand.com>",
          "list-unsubscribe-post": "List-Unsubscribe=One-Click",
        },
      }),
      llmCall
    );

    expect(llmCall).not.toHaveBeenCalled();
    expect(result?.is_noise).toBe(true);
    expect(result?.findings).toEqual([]);
  });

  it("calls LLM for real client mail", async () => {
    const llmCall = vi.fn().mockResolvedValue(
      JSON.stringify({
        is_noise: false,
        findings: [],
      })
    );

    await analyzeEmail(
      sampleEmail({
        from_email: "joshheyes@findhope.tv",
        body_text: "Quick question — do I need one form per resource?",
      }),
      llmCall
    );

    expect(llmCall).toHaveBeenCalledOnce();
  });
});
