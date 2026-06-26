import type { RelationshipType } from "@/app/_features/capture/services/system-plays/types";
import type { HealthBand, HealthFactor, HealthFactorDirection } from "@/app/_lib/health/core";
import { HEALTH_FRESHNESS_MS } from "@/app/_lib/health/core";

export type { HealthBand, HealthFactor, HealthFactorDirection };
export { HEALTH_FRESHNESS_MS };

export type RelationshipArchetype =
  | "revenue"
  | "pipeline"
  | "network"
  | "internal"
  | "neutral";

export interface HealthSignals {
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

export interface RelationshipHealthResult {
  score: number | null;
  band: HealthBand;
  archetype: RelationshipArchetype;
  factors: HealthFactor[];
  version: number;
  label: string;
}

export interface PersonHealthContext {
  relationshipType: RelationshipType | null;
  relationshipStatus: string | null;
}

export const RELATIONSHIP_HEALTH_VERSION = 1;
