import { describe, it, expect } from "vitest";
import { extractCaptureSignals } from "./signal-extractor";
import type { CaptureEnvelope } from "../../adapters/types";

function billingEnvelope(extracted: Record<string, unknown>): CaptureEnvelope {
  return {
    sourceType: "stripe",
    captureType: "payment",
    externalId: "in_test",
    title: "Stripe: invoice.payment_succeeded",
    occurredAt: "2026-08-06T10:00:00Z",
    participants: [],
    threadId: null,
    extracted,
    raw: {},
    noise: null,
  };
}

describe("extractBillingSignals amount semantics", () => {
  it("fires billing_large_amount at >= $1,000 using the canonical amount", () => {
    const signals = extractCaptureSignals(
      billingEnvelope({ amount: 1000, status: "paid" }),
      null
    );
    expect(signals).toContain("billing_large_amount");
  });

  it("does not fire billing_large_amount below $1,000", () => {
    const signals = extractCaptureSignals(
      billingEnvelope({ amount: 999.99, status: "paid" }),
      null
    );
    expect(signals).not.toContain("billing_large_amount");
  });

  it("falls back to amount_paid for rows written before the amount alias", () => {
    const signals = extractCaptureSignals(
      billingEnvelope({ amount_paid: 2500, status: "paid" }),
      null
    );
    expect(signals).toContain("billing_large_amount");
  });

  it("falls back to amount_due when nothing was paid yet", () => {
    const signals = extractCaptureSignals(
      billingEnvelope({ amount_due: 5000, status: "open" }),
      null
    );
    expect(signals).toContain("billing_large_amount");
  });
});
