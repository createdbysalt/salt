import { describe, expect, it } from "vitest";
import {
  buildBillingSourcePickerOptions,
  resolveBillingSourceOptionId,
} from "./billing-source-options";
import type { BillingDetailViewModel } from "../detail-types";

function makeBilling(
  overrides: Partial<BillingDetailViewModel> = {},
): BillingDetailViewModel {
  return {
    id: "bill-1",
    direction: "receivable",
    directionLabel: "Receivable",
    title: "Invoice 1001",
    number: "1001",
    provider: "manual",
    providerDisplay: { label: "Manual", color: "#64748B" },
    origin: "added",
    sourceLabel: "Manual",
    originLabel: "Added manually",
    source: "user",
    amount: "$100.00",
    amountCents: 10_000,
    amountPaid: "$0.00",
    amountPaidCents: 0,
    balance: "$100.00",
    balanceCents: 10_000,
    currency: "USD",
    status: "draft",
    statusLabel: "Draft",
    statusTone: "neutral",
    dueAt: "2026-07-01T00:00:00.000Z",
    dueLabel: "Jul 1, 2026",
    dueCountdownLabel: "Due in 30 days",
    issuedAt: "2026-06-01T00:00:00.000Z",
    issuedLabel: "Jun 1, 2026",
    issuedRelativeLabel: "4 weeks ago",
    appActionLabel: "Open",
    partyLabel: "Acme Co",
    personId: null,
    lineItems: [],
    activity: [],
    connections: [],
    tags: [],
    metrics: [],
    statusReasons: [],
    summary: "Invoice summary",
    paymentFlowLabel: "Awaiting payment",
    paymentSidebar: {
      heroLabel: "Due",
      heroAmount: "$100.00",
      heroSubtitle: "Due in 30 days",
      tone: "watch",
      showWorthAttention: false,
      isSettled: false,
    },
    ...overrides,
  };
}

describe("billing source picker options", () => {
  it("includes Salt when the record has extraction history", () => {
    const options = buildBillingSourcePickerOptions(
      makeBilling({ captureSourceUrl: "https://mail.google.com/thread/abc" }),
    );

    expect(options.map((option) => option.id)).toContain("salt");
    expect(options.map((option) => option.id)).toContain("manual");
    expect(options.map((option) => option.id)).toContain("stripe");
  });

  it("resolves salt vs manual separately", () => {
    const extraction = makeBilling({
      captureSourceUrl: "https://mail.google.com/thread/abc",
      extraction: { confidence: 90, needsReview: [] },
    });

    expect(resolveBillingSourceOptionId(extraction)).toBe("salt");
    expect(
      resolveBillingSourceOptionId({
        ...extraction,
        sourceReclassifiedAsManual: true,
      }),
    ).toBe("manual");
  });
});
