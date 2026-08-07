/**
 * Memory Care — shared types.
 *
 * Memory Care is the background system that keeps Memory complete, clean,
 * connected, and noted. It replaces the retired "system playbooks" (Keeper)
 * with four always-on capabilities that emit proposals into a single
 * confidence-gated decision pipeline.
 *
 * Memory Care is not a playbook. It does not appear in the Playbooks tab,
 * does not create approval queues (`play_runs`), and is configured from
 * Memory → Rules rather than playbook settings.
 */

import type { MemoryFieldTier } from "@/app/_lib/learning/field-tiers";
import type { EvidenceType } from "@/app/_lib/learning";

/**
 * The four care capabilities. These slugs are persisted in
 * `profile_playbook_settings.playbook_slug` for per-capability enablement,
 * so they double as the settings keys.
 */
export const CARE_CAPABILITIES = [
  "records",
  "hygiene",
  "connections",
  "notes",
] as const;

export type CareCapability = (typeof CARE_CAPABILITIES)[number];

export const CARE_CAPABILITY_META: Record<
  CareCapability,
  { name: string; description: string }
> = {
  records: {
    name: "Records",
    description: "Keeps people, org, work, and billing records complete",
  },
  hygiene: {
    name: "Hygiene",
    description: "Merges duplicates and fixes formatting",
  },
  connections: {
    name: "Connections",
    description: "Discovers relationships between entities",
  },
  notes: {
    name: "Notes",
    description: "Synthesizes understanding into durable notes",
  },
};

/**
 * Settings keys used in `profile_playbook_settings.playbook_slug`.
 * Legacy `keeper-*` slugs are read as fallbacks for backward compatibility
 * (see settings.ts) but new writes always use these keys.
 */
export const CARE_SETTINGS_SLUGS: Record<CareCapability, string> = {
  records: "memory-records",
  hygiene: "memory-hygiene",
  connections: "memory-connections",
  notes: "memory-notes",
};

/** Legacy slugs that map onto each capability, oldest first. */
export const CARE_LEGACY_SLUGS: Record<CareCapability, string[]> = {
  records: ["keeper-people-records", "keeper-company-records"],
  hygiene: ["keeper-hygiene"],
  connections: ["keeper-connections"],
  notes: ["keeper-notes"],
};

/** Slug for the workspace-level auto-apply threshold row. */
export const CARE_THRESHOLD_SLUG = "memory-care";

/** Legacy threshold slugs read as fallbacks. */
export const CARE_LEGACY_THRESHOLD_SLUGS = [
  "keeper-system",
  "memory-records",
] as const;

export const DEFAULT_CARE_THRESHOLD = 85;

/** A proposal emitted by a capability into the decision pipeline. */
export interface CareProposal {
  workspaceId: string;
  capability: CareCapability;
  /**
   * Entity surface of the target record. Accepts any surface string (the
   * pipeline maps to a LearningEntityType internally); tier classification
   * only has specific rules for person/organization/work/billing/me.
   */
  entityType: string;
  entityId: string;
  entityLabel?: string;
  field: string;
  proposedValue: string | null;
  currentValue?: unknown;
  confidence: number;
  because: string;
  ruleId?: string;
  evidenceType: EvidenceType;
  evidenceDetails?: Record<string, unknown>;
  sourceType: string;
  sourceCaptureId?: string;
}

export type CareDecisionAction = "apply" | "watch" | "refuse";

export interface CareDecision {
  action: CareDecisionAction;
  tier: MemoryFieldTier;
  /** Aggregated confidence across all pending evidence for the field. */
  aggregatedConfidence: number;
  /** The bar the proposal was held to. */
  bar: number;
  reason: string;
  evidenceId?: string;
  learningId?: string;
}

/** Context passed to a capability run (signal-triggered or scheduled). */
export interface CareRunContext {
  workspaceId: string;
  triggerSignal?: string;
  entityType?: string;
  entityId?: string;
  entityLabel?: string;
  triggerData?: Record<string, unknown>;
}

/** Result of running one capability for one workspace. */
export interface CareRunResult {
  success: boolean;
  error?: string;
  summary?: string;
  skipped?: string;
  data?: Record<string, unknown>;
}
