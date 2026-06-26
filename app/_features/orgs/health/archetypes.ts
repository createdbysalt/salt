import type { RelationshipStatus } from "@/app/_features/relationships/types";
import { factorDirection } from "@/app/_lib/health/core";
import type { OrgArchetype } from "./types";

export { factorDirection };

export interface ArchetypeWeight {
  key: string;
  label: string;
  weight: number;
}

export interface ArchetypeConfig {
  halfLifeDays: number;
  weights: ArchetypeWeight[];
}

export const ORG_ARCHETYPE_CONFIG: Record<OrgArchetype, ArchetypeConfig> = {
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
  neutral: {
    halfLifeDays: 21,
    weights: [{ key: "contact_recency", label: "Engagement", weight: 1 }],
  },
};

export const ORG_ARCHETYPE_DISPLAY_LABEL: Record<OrgArchetype, string> = {
  revenue: "Account health",
  pipeline: "Pipeline health",
  network: "Partner strength",
  neutral: "Account health",
};

export function orgStatusToArchetype(status: RelationshipStatus | null): OrgArchetype {
  if (status === "client" || status === "past_client") return "revenue";
  if (status === "prospect") return "pipeline";
  if (status === "partner" || status === "vendor") return "network";
  return "neutral";
}

export function validateOrgArchetypeWeights(): void {
  for (const [archetype, config] of Object.entries(ORG_ARCHETYPE_CONFIG)) {
    const sum = config.weights.reduce((total, item) => total + item.weight, 0);
    if (Math.abs(sum - 1) > 0.001) {
      throw new Error(`Org archetype ${archetype} weights must sum to 1, got ${sum}`);
    }
    for (const item of config.weights) {
      if (config.weights.length > 1 && item.weight > 0.5) {
        throw new Error(`Org archetype ${archetype} signal ${item.key} exceeds 50% weight`);
      }
    }
  }
}

validateOrgArchetypeWeights();
