import { describe, expect, it } from "vitest";
import {
  attachEvidenceSourceLinks,
  memoryRecordHref,
} from "./evidence-source-links";

const PAY = "https://invoice.stripe.com/i/acct_test/in_frank";

describe("memoryRecordHref", () => {
  it("routes a billing record to the Memory invoice page", () => {
    expect(memoryRecordHref("billing", "br-1")).toBe("/billing/br-1");
  });

  it("returns null without an id", () => {
    expect(memoryRecordHref("billing", null)).toBeNull();
  });
});

describe("attachEvidenceSourceLinks", () => {
  const frankContext = {
    targetType: "billing",
    targetId: "br-frank",
    invoiceContext: {
      invoice: { number: "INV-2026-1589", pay_url: PAY },
    },
  };

  it("links Memory and Stripe on an invoice-reminder walkthrough", () => {
    const items = attachEvidenceSourceLinks(
      [
        { label: "Billing due date passed", appId: "salt" },
        { label: "Read invoice context from Memory", appId: "salt" },
        {
          label: "Researched Stripe, QuickBooks, Gmail for verify unpaid",
          appId: "salt",
        },
        { label: "Classified the tier results", appId: "salt" },
      ],
      frankContext
    );

    expect(items[0]?.url).toBe("/billing/br-frank");
    expect(items[1]?.links?.map((link) => link.href)).toEqual([
      "/billing/br-frank",
      PAY,
    ]);
    expect(items[2]?.url).toBe(PAY);
    expect(items[3]?.url).toBe("/billing/br-frank");
  });

  it("finds a hosted Stripe pay URL in verify-unpaid text", () => {
    const items = attachEvidenceSourceLinks(
      [{ label: "Researched Stripe, Gmail for verify unpaid", appId: "salt" }],
      {
        targetType: "billing",
        targetId: "br-frank",
        verifyText: `Still open. Pay here: ${PAY}`,
      }
    );
    expect(items[0]?.url).toBe(PAY);
  });

  it("keeps an existing calendar URL and does not invent a pay link", () => {
    const items = attachEvidenceSourceLinks(
      [
        {
          label: "Saw the kickoff call at 2:00 PM",
          appId: "google-calendar",
          url: "https://calendar.google.com/event/1",
        },
      ],
      { targetType: "person", targetId: "p-1" }
    );
    expect(items[0]?.url).toBe("https://calendar.google.com/event/1");
    expect(items[0]?.links?.some((link) => link.href.includes("invoice.stripe"))).toBe(
      false
    );
  });
});
