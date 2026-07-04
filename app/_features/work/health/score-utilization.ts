import { factorDirection } from "@/app/_lib/health/core";
import { WORK_ARCHETYPE_CONFIG } from "./archetypes";
import type { HealthFactor, WorkHealthSignals } from "./types";
import {
  compositeScore,
  daysSince,
  recencySubScore,
  stalenessSubScore,
  trendSubScore,
} from "./utils";

function buildFactor(
  key: string,
  label: string,
  subScore: number,
  weight: number,
  detail?: string,
): HealthFactor {
  return {
    key,
    label,
    subScore,
    weight,
    direction: factorDirection(subScore),
    detail,
  };
}

export function scoreUtilization(
  signals: WorkHealthSignals,
  now: number,
): { score: number; factors: HealthFactor[] } {
  const config = WORK_ARCHETYPE_CONFIG.utilization;
  const contactDays = daysSince(signals.lastContactAt, now);
  const invoiceDays = daysSince(signals.lastInvoiceAt, now);

  const factors: HealthFactor[] = [
    buildFactor(
      "hours_momentum",
      "Hours momentum",
      trendSubScore(signals.hoursLoggedLast14d ?? 0, signals.hoursLoggedPrior14d ?? 0),
      0.25,
      hoursMomentumDetail(signals),
    ),
    buildFactor(
      "billing_recency",
      "Billing cadence",
      stalenessSubScore(invoiceDays, 30, 60),
      0.25,
      invoiceDays == null
        ? "No invoices sent"
        : `${Math.round(invoiceDays)} days since last invoice`,
    ),
    buildFactor(
      "estimate_alignment",
      "Estimate alignment",
      estimateAlignmentScore(signals),
      0.2,
      estimateAlignmentDetail(signals),
    ),
    buildFactor(
      "contact_recency",
      "Recent contact",
      recencySubScore(contactDays, config.halfLifeDays),
      0.2,
      contactDays == null
        ? "No contact recorded"
        : `${Math.round(contactDays)} days since last touch`,
    ),
    buildFactor(
      "rate_sustainability",
      "Rate health",
      rateHealthScore(signals),
      0.1,
      rateHealthDetail(signals),
    ),
  ];

  return { score: compositeScore(factors), factors };
}

function hoursMomentumDetail(signals: WorkHealthSignals): string {
  const last = signals.hoursLoggedLast14d ?? 0;
  const prior = signals.hoursLoggedPrior14d ?? 0;
  if (last === 0 && prior === 0) return "No hours logged recently";
  return `${last}h last 14d vs ${prior}h prior`;
}

function estimateAlignmentScore(signals: WorkHealthSignals): number {
  if (signals.hoursEstimate == null || signals.hoursLoggedTotal == null) return 50; // No data = neutral
  if (signals.hoursEstimate === 0) return 50;
  const ratio = signals.hoursLoggedTotal / signals.hoursEstimate;
  if (ratio <= 0.5) return 100;
  if (ratio <= 0.8) return 85;
  if (ratio <= 1.0) return 70;
  if (ratio <= 1.2) return 50;
  return 25;
}

function estimateAlignmentDetail(signals: WorkHealthSignals): string {
  if (signals.hoursEstimate == null) return "No estimate set";
  if (signals.hoursLoggedTotal == null) return "No hours logged";
  const pct = Math.round((signals.hoursLoggedTotal / signals.hoursEstimate) * 100);
  return `${pct}% of estimate logged`;
}

function rateHealthScore(signals: WorkHealthSignals): number {
  if (signals.hourlyRateCents == null) return 50; // No data = neutral
  if (signals.hourlyRateCents >= 15000) return 100;
  if (signals.hourlyRateCents >= 10000) return 85;
  if (signals.hourlyRateCents >= 7500) return 70;
  if (signals.hourlyRateCents >= 5000) return 50;
  return 35;
}

function rateHealthDetail(signals: WorkHealthSignals): string {
  if (signals.hourlyRateCents == null) return "No hourly rate set";
  const rate = signals.hourlyRateCents / 100;
  return `$${rate}/hr`;
}
