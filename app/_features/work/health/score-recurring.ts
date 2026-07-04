import { factorDirection } from "@/app/_lib/health/core";
import { WORK_ARCHETYPE_CONFIG } from "./archetypes";
import type { HealthFactor, WorkHealthSignals } from "./types";
import {
  booleanSubScore,
  compositeScore,
  countSubScore,
  daysSince,
  recencySubScore,
  stalenessSubScore,
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

export function scoreRecurring(
  signals: WorkHealthSignals,
  now: number,
): { score: number; factors: HealthFactor[] } {
  const config = WORK_ARCHETYPE_CONFIG.recurring;
  const contactDays = daysSince(signals.lastContactAt, now);
  const renewalDays = signals.renewalDate ? daysUntil(signals.renewalDate, now) : null;

  const factors: HealthFactor[] = [
    buildFactor(
      "renewal_proximity",
      "Renewal timeline",
      renewalProximityScore(renewalDays),
      0.25,
      renewalDays == null
        ? "No renewal date set"
        : renewalDays < 0
          ? "Renewal overdue"
          : `${Math.round(renewalDays)} days until renewal`,
    ),
    buildFactor(
      "meeting_cadence",
      "Meeting cadence",
      countSubScore(signals.upcomingMeetingCount, false),
      0.2,
      signals.upcomingMeetingCount > 0
        ? `${signals.upcomingMeetingCount} meeting(s) scheduled`
        : "No upcoming meetings",
    ),
    buildFactor(
      "scope_alignment",
      "Scope alignment",
      scopeAlignmentScore(signals),
      0.15,
      scopeAlignmentDetail(signals),
    ),
    buildFactor(
      "payment_health",
      "Payment health",
      booleanSubScore(signals.overdueInvoiceCount === 0),
      0.15,
      signals.overdueInvoiceCount > 0
        ? `${signals.overdueInvoiceCount} overdue invoice(s)`
        : "Payments on track",
    ),
    buildFactor(
      "contact_recency",
      "Recent contact",
      recencySubScore(contactDays, config.halfLifeDays),
      0.15,
      contactDays == null
        ? "No contact recorded"
        : `${Math.round(contactDays)} days since last touch`,
    ),
    buildFactor(
      "client_contacts",
      "Client contacts",
      countSubScore(signals.linkedPeopleCount, false),
      0.1,
      signals.linkedPeopleCount > 0
        ? `${signals.linkedPeopleCount} contact(s) connected`
        : "No contacts connected",
    ),
  ];

  return { score: compositeScore(factors), factors };
}

function daysUntil(isoDate: string, now: number): number {
  const target = new Date(isoDate).getTime();
  return (target - now) / 86400000;
}

function renewalProximityScore(daysUntilRenewal: number | null): number {
  if (daysUntilRenewal == null) return 40;
  if (daysUntilRenewal < 0) return 15;
  if (daysUntilRenewal <= 7) return 35;
  if (daysUntilRenewal <= 30) return 60;
  if (daysUntilRenewal <= 60) return 85;
  return 100;
}

function scopeAlignmentScore(signals: WorkHealthSignals): number {
  if (signals.hoursEstimate == null || signals.hoursLoggedTotal == null) {
    return 50; // No data = neutral
  }
  const ratio = signals.hoursLoggedTotal / signals.hoursEstimate;
  if (ratio <= 0.5) return 100;
  if (ratio <= 0.8) return 90;
  if (ratio <= 1.0) return 75;
  if (ratio <= 1.2) return 45;
  return 20;
}

function scopeAlignmentDetail(signals: WorkHealthSignals): string {
  if (signals.hoursEstimate == null) return "No hours estimate";
  if (signals.hoursLoggedTotal == null) return "No hours logged";
  const pct = Math.round((signals.hoursLoggedTotal / signals.hoursEstimate) * 100);
  return `${pct}% of estimated hours used`;
}
