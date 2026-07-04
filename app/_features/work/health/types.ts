import type { HealthBand, HealthFactor, HealthFactorDirection } from "@/app/_lib/health/core";
import { HEALTH_FRESHNESS_MS } from "@/app/_lib/health/core";

export type { HealthBand, HealthFactor, HealthFactorDirection };
export { HEALTH_FRESHNESS_MS };

export const WORK_HEALTH_VERSION = 7;

export type WorkArchetype =
  | "recurring"
  | "delivery"
  | "utilization"
  | "pipeline"
  | "transactional";

export type WorkHealthBand = "Healthy" | "Watch" | "Needs attention" | "Insufficient";

export interface WorkHealthFactor {
  factor: string;
  impact: number;
  reason: string;
}

export interface WorkHealthSignals {
  status: string;
  workType: string | null;
  paymentType: string | null;
  stageEnteredAt: string | null;
  deadline: string | null;
  startDate: string | null;
  updatedAt: string | null;
  linkedPeopleCount: number;
  overdueInvoiceCount: number;

  renewalDate: string | null;
  upcomingMeetingCount: number;
  hoursEstimate: number | null;
  hoursLoggedTotal: number | null;
  hoursLoggedLast14d: number | null;
  hoursLoggedPrior14d: number | null;
  lastInvoiceAt: string | null;
  lastContactAt: string | null;
  milestoneCount: number;
  completedMilestoneCount: number;
  overdueMilestoneCount: number;
  budgetCents: number | null;
  spentCents: number | null;
  blockerCount: number;
  hasDecisionMakerEngaged: boolean;
  competingProposalCount: number;
  clientConfirmed: boolean;
  isPaid: boolean;
  hourlyRateCents: number | null;
  retainerMrrCents: number | null;
}

export interface WorkHealthResult {
  score: number | null;
  band: WorkHealthBand;
  archetype: WorkArchetype;
  factors: HealthFactor[];
  version: number;
  label: string;
}

export interface WorkHealthContext {
  workType: string | null;
  status: string;
}
