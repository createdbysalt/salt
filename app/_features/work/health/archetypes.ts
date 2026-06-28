import { factorDirection } from "@/app/_lib/health/core";
import type { WorkType } from "../types";
import type { WorkArchetype } from "./types";

export { factorDirection };

export interface ArchetypeWeight {
  key: string;
  label: string;
  weight: number;
}

export interface WorkArchetypeConfig {
  halfLifeDays: number;
  weights: ArchetypeWeight[];
}

export const WORK_ARCHETYPE_CONFIG: Record<WorkArchetype, WorkArchetypeConfig> = {
  recurring: {
    halfLifeDays: 21,
    weights: [
      { key: "renewal_proximity", label: "Renewal timeline", weight: 0.25 },
      { key: "meeting_cadence", label: "Meeting cadence", weight: 0.2 },
      { key: "scope_alignment", label: "Scope alignment", weight: 0.15 },
      { key: "payment_health", label: "Payment health", weight: 0.15 },
      { key: "contact_recency", label: "Recent contact", weight: 0.15 },
      { key: "stakeholder_engagement", label: "Stakeholder coverage", weight: 0.1 },
    ],
  },
  delivery: {
    halfLifeDays: 14,
    weights: [
      { key: "deadline_health", label: "Deadline health", weight: 0.20 },
      { key: "milestone_progress", label: "Milestone progress", weight: 0.15 },
      { key: "budget_burn", label: "Budget alignment", weight: 0.15 },
      { key: "contact_recency", label: "Recent contact", weight: 0.15 },
      { key: "client_contacts", label: "Client contacts", weight: 0.15 },
      { key: "blockers", label: "Blockers", weight: 0.20 },
    ],
  },
  utilization: {
    halfLifeDays: 14,
    weights: [
      { key: "hours_momentum", label: "Hours momentum", weight: 0.25 },
      { key: "billing_recency", label: "Billing cadence", weight: 0.25 },
      { key: "estimate_alignment", label: "Estimate alignment", weight: 0.2 },
      { key: "contact_recency", label: "Recent contact", weight: 0.2 },
      { key: "rate_sustainability", label: "Rate health", weight: 0.1 },
    ],
  },
  pipeline: {
    halfLifeDays: 10,
    weights: [
      { key: "stage_velocity", label: "Stage velocity", weight: 0.3 },
      { key: "followup_recency", label: "Follow-up recency", weight: 0.25 },
      { key: "decision_maker", label: "Decision maker engaged", weight: 0.2 },
      { key: "meeting_scheduled", label: "Meeting scheduled", weight: 0.15 },
      { key: "competing_deals", label: "Deal clarity", weight: 0.1 },
    ],
  },
  transactional: {
    halfLifeDays: 7,
    weights: [
      { key: "completion_speed", label: "Completion speed", weight: 0.4 },
      { key: "payment_status", label: "Payment status", weight: 0.4 },
      { key: "contact_confirmation", label: "Client confirmation", weight: 0.2 },
    ],
  },
};

export const WORK_ARCHETYPE_DISPLAY_LABEL: Record<WorkArchetype, string> = {
  recurring: "Retainer health",
  delivery: "Project health",
  utilization: "Utilization health",
  pipeline: "Pipeline health",
  transactional: "Quick work health",
};

export { BAND_DISPLAY_LABEL } from "@/app/_lib/health/core";

export function workTypeToArchetype(workType: WorkType | string | null): WorkArchetype {
  switch (workType) {
    case "retainer":
      return "recurring";
    case "project":
    case "event":
      return "delivery";
    case "hourly":
      return "utilization";
    case "proposal":
      return "pipeline";
    case "quick":
      return "transactional";
    default:
      return "delivery";
  }
}

export function validateArchetypeWeights(): void {
  for (const [archetype, config] of Object.entries(WORK_ARCHETYPE_CONFIG)) {
    const sum = config.weights.reduce((total, item) => total + item.weight, 0);
    if (Math.abs(sum - 1) > 0.001) {
      throw new Error(`Work archetype ${archetype} weights must sum to 1, got ${sum}`);
    }
    for (const item of config.weights) {
      if (config.weights.length > 1 && item.weight > 0.5) {
        throw new Error(`Work archetype ${archetype} signal ${item.key} exceeds 50% weight`);
      }
    }
  }
}

validateArchetypeWeights();
