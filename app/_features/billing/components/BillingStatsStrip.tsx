"use client";

import { useMemo } from "react";
import { MetricsStrip, type Metric } from "@/app/_features/memory/components/MetricsStrip";
import type { BillingDirection, BillingRecord } from "../data";
import {
  computeBillingDashboardMetrics,
  formatBillingMetricMoney,
} from "../utils/billing-metrics";

type BillingStatsStripProps = {
  direction: BillingDirection;
  records: BillingRecord[];
};

export function BillingStatsStrip({ direction, records }: BillingStatsStripProps) {
  const metrics = useMemo(
    () => computeBillingDashboardMetrics(records, direction),
    [direction, records],
  );

  const currency = records.find((record) => record.direction === direction)?.currency ?? "USD";

  const stripMetrics: Metric[] =
    direction === "receivable"
      ? [
          {
            label: "MRR",
            value: formatBillingMetricMoney(metrics.mrrCents, currency),
          },
          {
            label: "Outstanding",
            value: formatBillingMetricMoney(metrics.outstandingCents, currency),
            tone: metrics.outstandingCents > 0 ? "watch" : "default",
          },
          {
            label: "Collected MTD",
            value: formatBillingMetricMoney(metrics.collectedMtdCents, currency),
            tone: metrics.collectedMtdCents > 0 ? "good" : "default",
          },
          {
            label: "Overdue",
            value: String(metrics.overdueCount),
            tone: metrics.overdueCount > 0 ? "risk" : "default",
          },
        ]
      : [
          {
            label: "Due soon",
            value: String(metrics.dueSoonCount),
            tone: metrics.dueSoonCount > 0 ? "watch" : "default",
          },
          {
            label: "Overdue",
            value: String(metrics.overdueCount),
            tone: metrics.overdueCount > 0 ? "risk" : "default",
          },
          {
            label: "Paid MTD",
            value: formatBillingMetricMoney(metrics.paidMtdCents, currency),
            tone: metrics.paidMtdCents > 0 ? "good" : "default",
          },
          {
            label: "Monthly burn",
            value: formatBillingMetricMoney(metrics.monthlyBurnCents, currency),
          },
        ];

  return <MetricsStrip metrics={stripMetrics} />;
}
