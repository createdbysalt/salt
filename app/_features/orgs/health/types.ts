import type { RelationshipStatus } from "@/app/_features/relationships/types";
import type { HealthBand, HealthFactor } from "@/app/_lib/health/core";
import { HEALTH_FRESHNESS_MS } from "@/app/_lib/health/core";

export type { HealthBand, HealthFactor };
export { HEALTH_FRESHNESS_MS };

export type OrgArchetype = "revenue" | "pipeline" | "network" | "neutral";

export interface OrgHealthSignals {
  hasCaptureActivity: boolean;
  hasRevenueSignals: boolean;
  lastActivityAt: string | null;
  captureCountLast30d: number;
  captureCountPrior30d: number;
  hasBidirectionalContact: boolean;
  youInitiatedWithoutReplyDays: number | null;
  hasUpcomingMeeting: boolean;
  overdueInvoiceCount: number;
  hasActiveRetainer: boolean;
  overdueMilestoneCount: number;
  cancelledMeetingsLast30d: number;
  orgContactCount: number;
  keyContactQuiet: boolean;
  intelligenceFindingCount: number;
}

export interface OrgHealthResult {
  score: number | null;
  band: HealthBand;
  archetype: OrgArchetype;
  factors: HealthFactor[];
  version: number;
  label: string;
}

export interface OrgHealthContext {
  relationshipStatus: RelationshipStatus | null;
}

export const ORG_HEALTH_VERSION = 1;
