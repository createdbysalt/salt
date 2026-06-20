import { describe, expect, it } from "vitest";
import {
  decodeHtmlEntities,
  detectHeuristicFindings,
  extractPaymentPayer,
  isPaymentRailSender,
  mergeEmailAnalyses,
} from "./email-heuristics";
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

describe("detectHeuristicFindings", () => {
  it("flags MFI-style client questions", () => {
    const findings = detectHeuristicFindings(
      sampleEmail({
        from_email: "joshheyes@findhope.tv",
        subject: "Re: MFI Canada Resource Hub",
        body_text:
          "Hey Gabi, Quick question for you. Do I need to instruct people to submit one form per resource?",
      })
    );

    expect(findings.some((f) => f.type === "pending_question")).toBe(true);
  });

  it("does not flag marketing FAQ copy as a client question", () => {
    const findings = detectHeuristicFindings(
      sampleEmail({
        from_email: "deals@brand.com",
        subject: "50% off — shop now",
        body_text: "Limited time offer. View in browser. Unsubscribe anytime.",
        headers: {
          "list-unsubscribe": "<mailto:unsub@brand.com>",
        },
      })
    );

    expect(findings.some((f) => f.type === "pending_question")).toBe(false);
  });

  it("requires known person or bidirectional thread for pending_reply", () => {
    const withoutContext = detectHeuristicFindings(
      sampleEmail({
        subject: "Re: Project update",
        body_text: "Following up on the timeline.",
        has_prior_thread: true,
      })
    );
    expect(withoutContext.some((f) => f.type === "pending_reply")).toBe(false);

    const withKnownPerson = detectHeuristicFindings(
      sampleEmail({
        subject: "Re: Project update",
        body_text: "Following up on the timeline.",
        has_prior_thread: true,
      }),
      { knownPerson: true }
    );
    expect(withKnownPerson.some((f) => f.type === "pending_reply")).toBe(true);
  });

  it("flags QuickBooks payment notifications", () => {
    const findings = detectHeuristicFindings(
      sampleEmail({
        from_email: "businessservices@intuit.com",
        subject: "Money on the way!",
        body_text: "Your QuickBooks Payments deposit is on the way.",
      })
    );

    expect(findings.some((f) => f.type === "revenue_closing")).toBe(true);
  });

  it("does not flag outbound sent mail", () => {
    const findings = detectHeuristicFindings(
      sampleEmail({
        is_sent_by_user: true,
        subject: "Homepage prototype ready for your review",
        body_text: "Hi Liam, The homepage prototype is ready.",
      })
    );

    expect(findings).toHaveLength(0);
  });
});

describe("mergeEmailAnalyses", () => {
  it("respects LLM noise when heuristics are low-confidence", () => {
    const merged = mergeEmailAnalyses(
      [
        {
          type: "pending_reply",
          title: "Reply needed",
          confidence: 72,
        },
      ],
      {
        findings: [],
        is_noise: true,
        noise_reason: "Newsletter",
      }
    );

    expect(merged.is_noise).toBe(true);
    expect(merged.findings).toHaveLength(0);
  });

  it("allows high-confidence revenue heuristics to override LLM noise", () => {
    const merged = mergeEmailAnalyses(
      [
        {
          type: "revenue_closing",
          title: "Payment from Acme",
          confidence: 88,
        },
      ],
      {
        findings: [],
        is_noise: true,
        noise_reason: "Automated",
      }
    );

    expect(merged.is_noise).toBe(false);
    expect(merged.findings.some((f) => f.type === "revenue_closing")).toBe(true);
  });
});

describe("decodeHtmlEntities", () => {
  it("decodes named and numeric entities in one pass", () => {
    expect(decodeHtmlEntities("&amp;#39;hello&quot;")).toBe("&#39;hello\"");
    expect(decodeHtmlEntities("&#39;Salt&apos;")).toBe("'Salt'");
  });
});

describe("payment rail helpers", () => {
  it("treats QuickBooks as a payment rail, not the client", () => {
    expect(isPaymentRailSender("businessservices@intuit.com")).toBe(true);
  });

  it("extracts payer name from payment copy when present", () => {
    const payer = extractPaymentPayer(
      "You received $500.00 from Acme Studio for Invoice 1042."
    );
    expect(payer?.name).toBe("Acme Studio");
  });
});
