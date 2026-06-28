import { scoreToBand } from "@/app/_lib/health/core";
import {
  WORK_ARCHETYPE_DISPLAY_LABEL,
  workTypeToArchetype,
} from "./archetypes";
import { scoreDelivery } from "./score-delivery";
import { scorePipeline } from "./score-pipeline";
import { scoreRecurring } from "./score-recurring";
import { scoreTransactional } from "./score-transactional";
import { scoreUtilization } from "./score-utilization";
import type {
  HealthFactor,
  WorkArchetype,
  WorkHealthBand,
  WorkHealthResult,
  WorkHealthSignals,
} from "./types";
import { WORK_HEALTH_VERSION } from "./types";

function hasUsableSignals(signals: WorkHealthSignals): boolean {
  return (
    signals.lastContactAt != null ||
    signals.linkedPeopleCount > 0 ||
    signals.stageEnteredAt != null ||
    signals.updatedAt != null
  );
}

function insufficientResult(archetype: WorkArchetype): WorkHealthResult {
  return {
    score: null,
    band: "Insufficient",
    archetype,
    factors: [],
    version: WORK_HEALTH_VERSION,
    label: WORK_ARCHETYPE_DISPLAY_LABEL[archetype],
  };
}

function completedResult(archetype: WorkArchetype, status: string): WorkHealthResult {
  return {
    score: 85,
    band: "Healthy",
    archetype,
    factors: [
      {
        key: "delivery_status",
        label: "Delivery status",
        subScore: 100,
        weight: 1,
        direction: "positive",
        detail: status === "completed" ? "Work is complete" : "Work is archived",
      },
    ],
    version: WORK_HEALTH_VERSION,
    label: WORK_ARCHETYPE_DISPLAY_LABEL[archetype],
  };
}

function healthBandFromCoreBand(coreBand: ReturnType<typeof scoreToBand>): WorkHealthBand {
  switch (coreBand) {
    case "healthy":
      return "Healthy";
    case "watch":
      return "Watch";
    case "risk":
      return "Needs attention";
    case "insufficient":
      return "Insufficient";
  }
}

export function scoreWorkHealth(
  signals: WorkHealthSignals,
  now: Date = new Date(),
): WorkHealthResult {
  const archetype = workTypeToArchetype(signals.workType);
  const status = signals.status.toLowerCase();
  const nowMs = now.getTime();

  if (status === "completed" || status === "archived") {
    return completedResult(archetype, status);
  }

  if (!hasUsableSignals(signals)) {
    return insufficientResult(archetype);
  }

  let scored: { score: number; factors: HealthFactor[] };
  switch (archetype) {
    case "recurring":
      scored = scoreRecurring(signals, nowMs);
      break;
    case "delivery":
      scored = scoreDelivery(signals, nowMs);
      break;
    case "utilization":
      scored = scoreUtilization(signals, nowMs);
      break;
    case "pipeline":
      scored = scorePipeline(signals, nowMs);
      break;
    case "transactional":
      scored = scoreTransactional(signals, nowMs);
      break;
  }

  const coreBand = scoreToBand(scored.score);

  return {
    score: scored.score,
    band: healthBandFromCoreBand(coreBand),
    archetype,
    factors: scored.factors,
    version: WORK_HEALTH_VERSION,
    label: WORK_ARCHETYPE_DISPLAY_LABEL[archetype],
  };
}

export { bandDisplayLabel } from "@/app/_lib/health/core";
