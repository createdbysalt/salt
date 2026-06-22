import type { RelationshipType } from "@/app/_features/capture/services/system-plays/types";
import type { HealthFactorDirection, RelationshipArchetype } from "./types";

export interface ArchetypeWeight {
  key: string;
  label: string;
  weight: number;
}

export interface ArchetypeConfig {
  halfLifeDays: number;
  weights: ArchetypeWeight[];
}

export const ARCHETYPE_CONFIG: Record<RelationshipArchetype, ArchetypeConfig> = {
  revenue: {
    halfLifeDays: 14,
    weights: [
      { key: "contact_recency", label: "Recent contact", weight: 0.25 },
      { key: "overdue_invoices", label: "Invoice status", weight: 0.15 },
      { key: "active_retainer", label: "Active retainer", weight: 0.15 },
      { key: "upcoming_meeting", label: "Upcoming meeting", weight: 0.15 },
      { key: "overdue_milestones", label: "Project delivery", weight: 0.1 },
      { key: "meeting_reliability", label: "Meeting reliability", weight: 0.1 },
      { key: "stakeholder_breadth", label: "Stakeholder coverage", weight: 0.1 },
    ],
  },
  pipeline: {
    halfLifeDays: 18,
    weights: [
      { key: "contact_recency", label: "Recent contact", weight: 0.3 },
      { key: "scheduled_meeting", label: "Scheduled meeting", weight: 0.2 },
      { key: "reply_staleness", label: "Reply momentum", weight: 0.2 },
      { key: "email_volume_trend", label: "Email momentum", weight: 0.15 },
      { key: "stakeholder_breadth", label: "Buying committee", weight: 0.15 },
    ],
  },
  network: {
    halfLifeDays: 75,
    weights: [
      { key: "contact_recency", label: "Contact cadence", weight: 0.5 },
      { key: "bidirectional_ratio", label: "Two-way engagement", weight: 0.5 },
    ],
  },
  internal: {
    halfLifeDays: 30,
    weights: [
      { key: "contact_recency", label: "Collaboration recency", weight: 0.5 },
      { key: "collaboration_active", label: "Active collaboration", weight: 0.5 },
    ],
  },
  neutral: {
    halfLifeDays: 21,
    weights: [{ key: "contact_recency", label: "Engagement", weight: 1 }],
  },
};

export const ARCHETYPE_DISPLAY_LABEL: Record<RelationshipArchetype, string> = {
  revenue: "Client health",
  pipeline: "Pipeline health",
  network: "Network strength",
  internal: "Team strength",
  neutral: "Relationship health",
};

export const BAND_DISPLAY_LABEL: Record<"healthy" | "watch" | "risk", string> = {
  healthy: "Healthy",
  watch: "Watch",
  risk: "At risk",
};

export function relationshipTypeToArchetype(input: {
  relationshipType: RelationshipType | string | null;
  relationshipStatus?: string | null;
}): RelationshipArchetype {
  const type = input.relationshipType;
  const status = input.relationshipStatus;

  if (type === "client" || type === "past_client" || status === "past_client") {
    return "revenue";
  }
  if (type === "prospect" || status === "prospect") return "pipeline";
  if (type === "partner" || type === "vendor" || type === "personal") return "network";
  if (type === "team") return "internal";
  return "neutral";
}

export function factorDirection(subScore: number): HealthFactorDirection {
  if (subScore >= 70) return "positive";
  if (subScore <= 40) return "negative";
  return "neutral";
}

export function validateArchetypeWeights(): void {
  for (const [archetype, config] of Object.entries(ARCHETYPE_CONFIG)) {
    const sum = config.weights.reduce((total, item) => total + item.weight, 0);
    if (Math.abs(sum - 1) > 0.001) {
      throw new Error(`Archetype ${archetype} weights must sum to 1, got ${sum}`);
    }
    for (const item of config.weights) {
      if (config.weights.length > 1 && item.weight > 0.5) {
        throw new Error(`Archetype ${archetype} signal ${item.key} exceeds 50% weight`);
      }
    }
  }
}

validateArchetypeWeights();
