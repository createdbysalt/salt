import { describe, expect, it } from "vitest";
import {
  buildPaymentStatusReasons,
  dueCountdownLabel,
  resolvePaymentSidebarDisplay,
} from "./payment-display";

const NOW = new Date("2026-06-15T12:00:00.000Z");

describe("dueCountdownLabel", () => {
  it("uses draft labels instead of overdue math for drafts", () => {
    expect(
      dueCountdownLabel({
        dueAt: "2026-06-01T12:00:00.000Z",
        status: "draft",
        direction: "payable",
        now: NOW,
      }),
    ).toBe("Payable draft");

    expect(
      dueCountdownLabel({
        dueAt: "2026-06-01T12:00:00.000Z",
        status: "draft",
        direction: "receivable",
        now: NOW,
      }),
    ).toBe("Invoice draft");
  });
});

describe("resolvePaymentSidebarDisplay", () => {
  it("does not show overdue urgency for payable drafts", () => {
    const display = resolvePaymentSidebarDisplay({
      direction: "payable",
      status: "draft",
      balanceCents: 1014,
      amountCents: 1014,
      currency: "USD",
      dueAt: "2026-06-01T12:00:00.000Z",
      amountFormatted: "$10.14",
      amountPaidFormatted: "$0.00",
      balanceFormatted: "$10.14",
      worthAttention: { reason: "Draft record is ready for review." },
      now: NOW,
    });

    expect(display.heroLabel).toBe("Payable draft");
    expect(display.heroSubtitle).toBe("Review before tracking payment");
    expect(display.tone).toBe("draft");
    expect(display.isSettled).toBe(false);
  });

  it("shows receivable settlement copy when paid", () => {
    const display = resolvePaymentSidebarDisplay({
      direction: "receivable",
      status: "paid",
      balanceCents: 0,
      amountCents: 480000,
      currency: "USD",
      dueAt: "2026-06-01T12:00:00.000Z",
      amountFormatted: "$4,800.00",
      amountPaidFormatted: "$4,800.00",
      balanceFormatted: "$0.00",
      now: NOW,
    });

    expect(display.isSettled).toBe(true);
    expect(display.heroSubtitle).toBe("Payment received");
  });
});

describe("buildPaymentStatusReasons", () => {
  it("avoids outstanding reasons for drafts", () => {
    const reasons = buildPaymentStatusReasons({
      direction: "payable",
      status: "draft",
      balanceCents: 1014,
      currency: "USD",
      dueAt: "2026-06-01T12:00:00.000Z",
      now: NOW,
    });

    expect(reasons).toHaveLength(1);
    expect(reasons[0]?.label).toBe("Payable draft");
    expect(reasons.some((reason) => reason.label === "Outstanding")).toBe(false);
  });
});
