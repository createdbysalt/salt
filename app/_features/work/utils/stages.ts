/**
 * Work Stage Progressions
 *
 * Progress derivation per work type. The stage SETS and LABELS are canon in
 * the taxonomy registry (`work_stage` vocabulary) — this module re-exports
 * them and keeps the progress logic.
 */

import {
  WORK_STAGE_SETS,
  WORK_STAGE_LABELS,
} from "@/app/_features/memory/taxonomy/registry";

export const WORK_TYPES = [
  "project",
  "retainer",
  "hourly",
  "proposal",
  "quick",
  "event",
] as const;

export type WorkType = (typeof WORK_TYPES)[number];

export const WORK_TYPE_LABELS: Record<WorkType, string> = {
  project: "Project",
  retainer: "Retainer",
  hourly: "Hourly",
  proposal: "Proposal",
  quick: "Quick Job",
  event: "Event",
};

export const WORK_TYPE_DESCRIPTIONS: Record<WorkType, string> = {
  project: "Fixed-price project with defined deliverables",
  retainer: "Ongoing monthly engagement",
  hourly: "Time-based billing",
  proposal: "Lead or opportunity in pipeline",
  quick: "Small one-off task",
  event: "Date-anchored event (wedding, shoot, conference)",
};

// Stage progressions per work type (canon lives in the taxonomy registry)
export const WORK_STAGES: Record<WorkType, readonly string[]> = WORK_STAGE_SETS;

// Stage labels for display (canon lives in the taxonomy registry)
export const STAGE_LABELS: Record<string, string> = WORK_STAGE_LABELS;

// Progress percentage per stage
const STAGE_PROGRESS: Record<WorkType, Record<string, number>> = {
  project: {
    inquiry: 5,
    discovery: 15,
    proposal: 25,
    signed: 30,
    kickoff: 35,
    active: 50,
    review: 75,
    delivered: 90,
    closed: 100,
  },
  retainer: {
    trial: 25,
    active: 50,
    renewal_due: 75,
    renewed: 50,
    churned: 100,
  },
  hourly: {
    active: 50,
    paused: 50,
    closed: 100,
  },
  proposal: {
    lead: 10,
    qualified: 25,
    pitched: 50,
    negotiating: 75,
    won: 100,
    lost: 0,
  },
  quick: {
    todo: 0,
    in_progress: 50,
    done: 100,
  },
  event: {
    inquiry: 5,
    booked: 15,
    planning: 30,
    pre_event: 50,
    event_day: 75,
    post_event: 90,
    closed: 100,
  },
};

// Terminal stages (work is complete)
export const TERMINAL_STAGES: Record<WorkType, readonly string[]> = {
  project: ["closed"],
  retainer: ["churned"],
  hourly: ["closed"],
  proposal: ["won", "lost"],
  quick: ["done"],
  event: ["closed"],
};

// Positive terminal stages (successfully completed)
export const POSITIVE_TERMINAL_STAGES: Record<WorkType, readonly string[]> = {
  project: ["closed"],
  retainer: [],
  hourly: ["closed"],
  proposal: ["won"],
  quick: ["done"],
  event: ["closed"],
};

/**
 * Calculate progress percentage from stage
 */
export function calculateProgressFromStage(
  workType: WorkType,
  stage: string | null
): number {
  if (!stage) return 0;
  return STAGE_PROGRESS[workType]?.[stage] ?? 0;
}

/**
 * Calculate progress for hourly work based on hours
 */
export function calculateHourlyProgress(
  hoursLogged: number | null,
  hoursEstimate: number | null
): number | null {
  if (!hoursEstimate || hoursEstimate <= 0) return null;
  if (!hoursLogged) return 0;
  return Math.min(100, Math.round((hoursLogged / hoursEstimate) * 100));
}

/**
 * Get the effective progress for a work item
 * Priority: manual override > hourly calculation > stage-based
 */
export function getEffectiveProgress(input: {
  workType: WorkType;
  stage: string | null;
  progressOverride: number | null;
  hoursLogged: number | null;
  hoursEstimate: number | null;
}): number {
  // Manual override takes priority
  if (input.progressOverride != null) {
    return input.progressOverride;
  }

  // For hourly work, calculate from hours if estimate exists
  if (input.workType === "hourly") {
    const hourlyProgress = calculateHourlyProgress(
      input.hoursLogged,
      input.hoursEstimate
    );
    if (hourlyProgress != null) {
      return hourlyProgress;
    }
  }

  // Fall back to stage-based calculation
  return calculateProgressFromStage(input.workType, input.stage);
}

/**
 * Check if a stage is valid for a work type
 */
export function isValidStage(workType: WorkType, stage: string): boolean {
  return WORK_STAGES[workType].includes(stage);
}

/**
 * Get the next stage in the progression
 */
export function getNextStage(
  workType: WorkType,
  currentStage: string
): string | null {
  const stages = WORK_STAGES[workType];
  const currentIndex = stages.indexOf(currentStage);
  if (currentIndex === -1 || currentIndex >= stages.length - 1) {
    return null;
  }
  return stages[currentIndex + 1];
}

/**
 * Get the previous stage in the progression
 */
export function getPreviousStage(
  workType: WorkType,
  currentStage: string
): string | null {
  const stages = WORK_STAGES[workType];
  const currentIndex = stages.indexOf(currentStage);
  if (currentIndex <= 0) {
    return null;
  }
  return stages[currentIndex - 1];
}

/**
 * Check if work is in a terminal stage
 */
export function isTerminalStage(workType: WorkType, stage: string): boolean {
  return TERMINAL_STAGES[workType].includes(stage);
}

/**
 * Get the default initial stage for a work type
 */
export function getInitialStage(workType: WorkType): string {
  return WORK_STAGES[workType][0];
}

/**
 * Format stage for display
 */
export function formatStage(stage: string | null): string {
  if (!stage) return "—";
  return STAGE_LABELS[stage] ?? stage.replace(/_/g, " ");
}

/**
 * Get stages as options for a dropdown
 */
export function getStageOptions(
  workType: WorkType
): Array<{ value: string; label: string }> {
  return WORK_STAGES[workType].map((stage) => ({
    value: stage,
    label: STAGE_LABELS[stage] ?? stage.replace(/_/g, " "),
  }));
}
