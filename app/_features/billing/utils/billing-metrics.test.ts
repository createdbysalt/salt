import { describe, expect, it } from "vitest";
import type { BillingRecord } from "../data";
import { billingRecordFixtures } from "../fixtures/billing-record-fixtures";
import {
  computeBillingDashboardMetrics,
  isBillingRecordOverdue,
} from "./billing-metrics";

function receivable(overrides: Partial<BillingRecord> = {}): BillingRecord {
  return {
    ...billingRecordFixtures.stripeInvoice,
    ...overrides,
  };
}

function payable(overrides: Partial<BillingRecord> = {}): BillingRecord {
  return {
    ...billingRecordFixtures.manualPdf,
    ...overrides,
  };
}

describe("computeBillingDashboardMetrics", () => {
  const now = new Date("2026-06-15T12:00:00.000Z");

  it("computes receivable dashboard metrics", () => {
    const metrics = computeBillingDashboardMetrics(
      [
        receivable(),
        receivable({
          id: "paid-inv",
          status: "paid",
          amountCents: 100_000,
          amountPaidCents: 100_000,
          paidAt: "2026-06-10T12:00:00.000Z",
          org: { id: "paid-org", name: "Paid Org" },
          mrrCents: undefined,
        }),
        receivable({
          id: "overdue-inv",
          status: "overdue",
          amountCents: 50_000,
          org: { id: "late-org", name: "Late Org" },
          mrrCents: undefined,
        }),
      ],
      "receivable",
      now,
    );

    expect(metrics.mrrCents).toBe(1_200_000);
    expect(metrics.outstandingCents).toBe(480_000 + 50_000);
    expect(metrics.collectedMtdCents).toBe(100_000);
    expect(metrics.overdueCount).toBe(1);
  });

  it("computes payable dashboard metrics", () => {
    const metrics = computeBillingDashboardMetrics(
      [
        payable({
          status: "due",
          dueAt: "2026-06-20T12:00:00.000Z",
        }),
        payable({
          id: "payable-paid",
          status: "paid",
          amountCents: 20_000,
          paidAt: "2026-06-05T12:00:00.000Z",
        }),
        payable({
          id: "payable-recurring",
          status: "due",
          amountCents: 12_000,
          dueAt: "2026-06-22T12:00:00.000Z",
          recurrence: { seriesId: "saas-1", cadence: "monthly" },
          category: "software",
        }),
      ],
      "payable",
      now,
    );

    expect(metrics.dueSoonCount).toBe(2);
    expect(metrics.paidMtdCents).toBe(20_000);
    expect(metrics.monthlyBurnCents).toBe(12_000);
  });
});

describe("isBillingRecordOverdue", () => {
  it("treats past-due unpaid records as overdue", () => {
    expect(
      isBillingRecordOverdue(
        receivable({
          status: "due",
          dueAt: "2026-06-01T12:00:00.000Z",
        }),
        new Date("2026-06-15T12:00:00.000Z"),
      ),
    ).toBe(true);
  });
});
