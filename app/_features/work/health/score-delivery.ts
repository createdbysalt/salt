import { factorDirection } from "@/app/_lib/health/core";
import { WORK_ARCHETYPE_CONFIG } from "./archetypes";
import type { HealthFactor, WorkHealthSignals } from "./types";
import {
  booleanSubScore,
  compositeScore,
  countSubScore,
  daysSince,
  recencySubScore,
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

export function scoreDelivery(
  signals: WorkHealthSignals,
  now: number,
): { score: number; factors: HealthFactor[] } {
  const config = WORK_ARCHETYPE_CONFIG.delivery;
  const contactDays = daysSince(signals.lastContactAt, now);
  const deadlineDays = signals.deadline ? daysUntil(signals.deadline, now) : null;

  const factors: HealthFactor[] = [
    buildFactor(
      "deadline_health",
      "Deadline health",
      deadlineHealthScore(deadlineDays),
      0.25,
      deadlineHealthDetail(deadlineDays, signals.deadline),
    ),
    buildFactor(
      "budget_burn",
      "Budget alignment",
      budgetBurnScore(signals),
      0.15,
      budgetBurnDetail(signals),
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
      0.15,
      signals.linkedPeopleCount > 0
        ? `${signals.linkedPeopleCount} contact(s) connected`
        : "No contacts connected",
    ),
    buildFactor(
      "blockers",
      "Blockers",
      blockerScore(signals.blockerCount),
      0.20,
      blockerDetail(signals.blockerCount),
    ),
  ];

  // Only include milestone factor when payment type is milestone
  if (signals.paymentType === "milestone") {
    factors.splice(1, 0, buildFactor(
      "milestone_progress",
      "Milestone progress",
      milestoneProgressScore(signals),
      0.10,
      milestoneProgressDetail(signals),
    ));
  }

  return { score: compositeScore(factors), factors };
}

function daysUntil(isoDate: string, now: number): number {
  const target = new Date(isoDate).getTime();
  return (target - now) / 86400000;
}

function deadlineHealthScore(daysUntilDeadline: number | null): number {
  if (daysUntilDeadline == null) return 60;
  if (daysUntilDeadline < 0) return 15;
  if (daysUntilDeadline <= 3) return 30;
  if (daysUntilDeadline <= 7) return 55;
  if (daysUntilDeadline <= 14) return 75;
  return 100;
}

function deadlineHealthDetail(daysUntilDeadline: number | null, deadline: string | null): string {
  if (deadline == null) return "No deadline set";
  if (daysUntilDeadline == null) return "Invalid deadline";
  if (daysUntilDeadline < 0) return `Overdue by ${Math.abs(Math.round(daysUntilDeadline))} days`;
  if (daysUntilDeadline <= 1) return "Due tomorrow";
  return `${Math.round(daysUntilDeadline)} days until deadline`;
}

function milestoneProgressScore(signals: WorkHealthSignals): number {
  if (signals.milestoneCount === 0) return 50; // No data = neutral

  // Overdue milestones are a significant negative signal
  if (signals.overdueMilestoneCount > 0) {
    const overdueRatio = signals.overdueMilestoneCount / signals.milestoneCount;
    if (overdueRatio >= 0.5) return 15;
    if (overdueRatio >= 0.25) return 30;
    return 45;
  }

  const completionRatio = signals.completedMilestoneCount / signals.milestoneCount;
  if (completionRatio >= 0.9) return 100;
  if (completionRatio >= 0.7) return 85;
  if (completionRatio >= 0.5) return 70;
  if (completionRatio >= 0.25) return 50;
  return 30;
}

function milestoneProgressDetail(signals: WorkHealthSignals): string {
  if (signals.milestoneCount === 0) return "No milestones set up";
  if (signals.overdueMilestoneCount > 0) {
    return `${signals.overdueMilestoneCount} overdue, ${signals.completedMilestoneCount}/${signals.milestoneCount} paid`;
  }
  return `${signals.completedMilestoneCount}/${signals.milestoneCount} milestones paid`;
}

function budgetBurnScore(signals: WorkHealthSignals): number {
  if (signals.budgetCents == null || signals.spentCents == null) return 50; // No data = neutral
  if (signals.budgetCents === 0) return 50;
  const ratio = signals.spentCents / signals.budgetCents;
  if (ratio <= 0.5) return 100;
  if (ratio <= 0.8) return 85;
  if (ratio <= 1.0) return 65;
  if (ratio <= 1.2) return 35;
  return 15;
}

function budgetBurnDetail(signals: WorkHealthSignals): string {
  if (signals.budgetCents == null) return "No budget set";
  if (signals.spentCents == null) return "No spend tracked";
  const pct = Math.round((signals.spentCents / signals.budgetCents) * 100);
  return `${pct}% of budget spent`;
}

function blockerScore(blockerCount: number): number {
  if (blockerCount === 0) return 100;
  if (blockerCount === 1) return 45;
  if (blockerCount === 2) return 25;
  return 10;
}

function blockerDetail(blockerCount: number): string {
  if (blockerCount === 0) return "No blockers";
  if (blockerCount === 1) return "1 blocker identified";
  return `${blockerCount} blockers identified`;
}
