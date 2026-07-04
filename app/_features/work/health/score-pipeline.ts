import { factorDirection } from "@/app/_lib/health/core";
import { WORK_ARCHETYPE_CONFIG } from "./archetypes";
import type { HealthFactor, WorkHealthSignals } from "./types";
import {
  booleanSubScore,
  compositeScore,
  countSubScore,
  daysSince,
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

export function scorePipeline(
  signals: WorkHealthSignals,
  now: number,
): { score: number; factors: HealthFactor[] } {
  const config = WORK_ARCHETYPE_CONFIG.pipeline;
  const stageDays = daysSince(signals.stageEnteredAt, now);
  const contactDays = daysSince(signals.lastContactAt, now);

  const factors: HealthFactor[] = [
    buildFactor(
      "stage_velocity",
      "Stage velocity",
      stalenessSubScore(stageDays, 7, 14),
      0.3,
      stageDays == null
        ? "No stage transition recorded"
        : `${Math.round(stageDays)} days in current stage`,
    ),
    buildFactor(
      "followup_recency",
      "Follow-up recency",
      stalenessSubScore(contactDays, config.halfLifeDays, config.halfLifeDays * 2),
      0.25,
      contactDays == null
        ? "No follow-up recorded"
        : `${Math.round(contactDays)} days since last touch`,
    ),
    buildFactor(
      "decision_maker",
      "Decision maker engaged",
      booleanSubScore(signals.hasDecisionMakerEngaged),
      0.2,
      signals.hasDecisionMakerEngaged
        ? "Decision maker active"
        : "Decision maker not engaged",
    ),
    buildFactor(
      "meeting_scheduled",
      "Meeting scheduled",
      countSubScore(signals.upcomingMeetingCount, false),
      0.15,
      signals.upcomingMeetingCount > 0
        ? `${signals.upcomingMeetingCount} meeting(s) scheduled`
        : "No meetings scheduled",
    ),
    buildFactor(
      "competing_deals",
      "Deal clarity",
      competingDealsScore(signals),
      0.1,
      signals.competingProposalCount > 0
        ? `${signals.competingProposalCount} competing proposal(s)`
        : "No competing proposals",
    ),
  ];

  return { score: compositeScore(factors), factors };
}

function competingDealsScore(signals: WorkHealthSignals): number {
  if (signals.competingProposalCount === 0) return 100;
  if (signals.competingProposalCount === 1) return 70;
  return 45;
}
