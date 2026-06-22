import type { RelationshipType } from "@/app/_features/capture/services/system-plays/types";

export type RelationshipArchetype =
  | "revenue"
  | "pipeline"
  | "network"
  | "internal"
  | "neutral";

export type HealthBand = "healthy" | "watch" | "risk" | "insufficient";

export type HealthFactorDirection = "positive" | "negative" | "neutral";

export interface HealthFactor {
  key: string;
  label: string;
  subScore: number;
  weight: number;
  direction: HealthFactorDirection;
  detail?: string;
}

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

export const HEALTH_FRESHNESS_MS = 6 * 60 * 60 * 1000;
