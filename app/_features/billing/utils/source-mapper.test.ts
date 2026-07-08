import { describe, expect, it } from "vitest";
import { buildBillingSourceMeta } from "./source-mapper";
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
    extraction: { confidence: 90, needsReview: [] },
    ...overrides,
  };
}

describe("buildBillingSourceMeta", () => {
  it("prefers user-edited appUrl over captureSourceUrl for extractions", () => {
    const meta = buildBillingSourceMeta(
      makeBilling({
        captureSourceUrl: "https://mail.google.com/thread/abc",
        appUrl: "https://drive.google.com/file/xyz",
      }),
    );

    expect(meta.origin).toBe("extracted");
    expect(meta.sourceUrl).toBe("https://drive.google.com/file/xyz");
  });

  it("shows synced provider when user overrides extraction provider", () => {
    const meta = buildBillingSourceMeta(
      makeBilling({
        provider: "stripe",
        origin: "found",
        captureSourceUrl: "https://mail.google.com/thread/abc",
        extraction: { confidence: 90, needsReview: [] },
      }),
    );

    expect(meta.origin).toBe("found");
    expect(meta.provider).toBe("stripe");
  });

  it("does not show extraction after record is reclassified as found", () => {
    const meta = buildBillingSourceMeta(
      makeBilling({
        provider: "stripe",
        origin: "found",
        captureSourceUrl: "https://mail.google.com/thread/abc",
        extraction: { confidence: 90, needsReview: [] },
      }),
    );

    expect(meta.origin).toBe("found");
    expect(meta.provider).toBe("stripe");
  });

  it("falls back to captureSourceUrl when appUrl is unset", () => {
    const meta = buildBillingSourceMeta(
      makeBilling({
        captureSourceUrl: "https://mail.google.com/thread/abc",
      }),
    );

    expect(meta.sourceUrl).toBe("https://mail.google.com/thread/abc");
  });

  it("shows manual when user reclassified an extraction", () => {
    const meta = buildBillingSourceMeta(
      makeBilling({
        sourceReclassifiedAsManual: true,
        extraction: { confidence: 90, needsReview: [] },
        captureSourceUrl: "https://mail.google.com/thread/abc",
      }),
    );

    expect(meta.origin).toBe("created");
    expect(meta.provider).toBe("manual");
  });

  it("still shows extraction when provider remains manual", () => {
    const meta = buildBillingSourceMeta(
      makeBilling({
        captureSourceUrl: "https://mail.google.com/thread/abc",
      }),
    );

    expect(meta.origin).toBe("extracted");
  });
});
