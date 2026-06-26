import { deriveWorkProgress } from "../utils/progress";
import type { WorkHealthBand, WorkHealthFactor, WorkHealthResult, WorkHealthSignals } from "./types";
import { WORK_HEALTH_VERSION } from "./types";

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const STALLED_STAGE_DAYS = 21;
const QUIET_ACTIVITY_DAYS = 30;
const DEADLINE_WATCH_DAYS = 7;

function daysSince(value: string | null, now: Date): number | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return (now.getTime() - parsed.getTime()) / MS_PER_DAY;
}

function daysUntil(value: string | null, now: Date): number | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return (parsed.getTime() - now.getTime()) / MS_PER_DAY;
}

function scoreToBand(score: number): WorkHealthBand {
  if (score >= 75) return "Healthy";
  if (score >= 55) return "Watch";
  return "Needs attention";
}

export function scoreWorkHealth(
  signals: WorkHealthSignals,
  now: Date = new Date(),
): WorkHealthResult {
  const status = signals.status.toLowerCase();
  const factors: WorkHealthFactor[] = [];

  if (status === "completed" || status === "archived") {
    return {
      score: 85,
      band: "Healthy",
      factors: [
        {
          factor: "Delivery status",
          impact: 0,
          reason: status === "completed" ? "Work is complete" : "Work is archived",
        },
      ],
      version: WORK_HEALTH_VERSION,
    };
  }

  let score = 75;

  if (status === "active") {
    const stageAgeDays = daysSince(signals.stageEnteredAt, now);
    if (stageAgeDays != null && stageAgeDays > STALLED_STAGE_DAYS) {
      const penalty = Math.min(25, Math.round(stageAgeDays - STALLED_STAGE_DAYS));
      score -= penalty;
      factors.push({
        factor: "Stage age",
        impact: -penalty,
        reason: `${Math.round(stageAgeDays)} days in current stage`,
      });
    }
  }

  const { overdue } = deriveWorkProgress({
    status: signals.status,
    startDate: null,
    deadline: signals.deadline,
    stageEnteredAt: signals.stageEnteredAt,
    now,
  });

  if (overdue) {
    score -= 25;
    factors.push({
      factor: "Deadline",
      impact: -25,
      reason: "Deadline has passed",
    });
  } else {
    const daysToDeadline = daysUntil(signals.deadline, now);
    if (daysToDeadline != null && daysToDeadline >= 0 && daysToDeadline <= DEADLINE_WATCH_DAYS) {
      score -= 10;
      factors.push({
        factor: "Deadline",
        impact: -10,
        reason: `Due in ${Math.ceil(daysToDeadline)} day(s)`,
      });
    }
  }

  if (signals.linkedPeopleCount === 0) {
    score -= 10;
    factors.push({
      factor: "Team coverage",
      impact: -10,
      reason: "No people linked to this work",
    });
  }

  const activityAgeDays = daysSince(signals.updatedAt, now);
  if (activityAgeDays != null && activityAgeDays > QUIET_ACTIVITY_DAYS) {
    const penalty = Math.min(20, Math.round(activityAgeDays - QUIET_ACTIVITY_DAYS));
    score -= penalty;
    factors.push({
      factor: "Recent activity",
      impact: -penalty,
      reason: `${Math.round(activityAgeDays)} days since last update`,
    });
  } else if (activityAgeDays == null) {
    score -= 5;
    factors.push({
      factor: "Recent activity",
      impact: -5,
      reason: "No activity recorded",
    });
  }

  if (signals.overdueInvoiceCount > 0) {
    score -= 20;
    factors.push({
      factor: "Open balance",
      impact: -20,
      reason: `${signals.overdueInvoiceCount} overdue invoice(s)`,
    });
  }

  score = Math.max(0, Math.min(100, score));

  return {
    score,
    band: scoreToBand(score),
    factors,
    version: WORK_HEALTH_VERSION,
  };
}
