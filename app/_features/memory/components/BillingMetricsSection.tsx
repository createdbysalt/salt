"use client";

import { DollarSign } from "lucide-react";
import { MemoryOverviewSection } from "./MemoryOverviewSection";
import { AccountRow } from "./AccountFieldEditors";

export interface BillingMetrics {
  mrrCents: number | null;
  lifetimeRevenueCents: number | null;
  outstandingCents: number | null;
  totalPaidCents: number | null;
  retainerLabel: string | null;
}

interface BillingMetricsSectionProps {
  metrics: BillingMetrics | null;
  showRetainer?: boolean;
  showMrr?: boolean;
}

function formatMoney(cents: number | null): string {
  if (cents === null || cents === 0) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function BillingMetricsSection({
  metrics,
  showRetainer = true,
  showMrr = true,
}: BillingMetricsSectionProps) {
  if (!metrics) return null;

  const hasAnyData =
    metrics.mrrCents ||
    metrics.lifetimeRevenueCents ||
    metrics.outstandingCents ||
    metrics.totalPaidCents ||
    metrics.retainerLabel;

  if (!hasAnyData) return null;

  return (
    <MemoryOverviewSection title="Billing">
      <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
        {showMrr && metrics.mrrCents !== null && (
          <AccountRow label="MRR">
            <span className="text-sm font-medium tabular-nums text-foreground">
              {formatMoney(metrics.mrrCents)}
            </span>
          </AccountRow>
        )}
        {showRetainer && metrics.retainerLabel && (
          <AccountRow label="Retainer">
            <span className="text-sm text-foreground/80">{metrics.retainerLabel}</span>
          </AccountRow>
        )}
        <AccountRow label="Lifetime revenue">
          <span className="text-sm tabular-nums text-foreground/80">
            {formatMoney(metrics.lifetimeRevenueCents)}
          </span>
        </AccountRow>
        <AccountRow label="Total paid">
          <span className="text-sm tabular-nums text-foreground/80">
            {formatMoney(metrics.totalPaidCents)}
          </span>
        </AccountRow>
        {(metrics.outstandingCents ?? 0) > 0 && (
          <AccountRow label="Outstanding">
            <span className="text-sm tabular-nums text-amber-600 dark:text-amber-400">
              {formatMoney(metrics.outstandingCents)}
            </span>
          </AccountRow>
        )}
      </dl>
    </MemoryOverviewSection>
  );
}
