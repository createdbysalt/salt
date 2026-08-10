/**
 * Memory Tools Types
 *
 * Protected tools for Memory record mutations. These enforce workspace
 * confidence thresholds regardless of caller (playbook, Ask Salt, UI).
 *
 * Key insight: Protection lives in the tools, not the callers.
 */

import type { LearningEntityType, EvidenceType } from "@/app/_lib/learning";
import type { Database } from "@/app/_lib/supabase/database.types";

// Re-export for convenience
export type { LearningEntityType, EvidenceType };

// ============================================================================
// Entity Type → Table Routing (shared by all protected tools)
// ============================================================================

/**
 * The Memory tables the protected tools read/mutate, keyed by entity type.
 * "me" is intentionally absent — operator fields route to profiles/workspaces.
 *
 * Typed via Pick so a renamed table fails compilation here, not at call sites.
 */
export type MemoryEntityTable = keyof Pick<
  Database["public"]["Tables"],
  "people" | "organizations" | "work" | "billing_records" | "meetings" | "files"
>;

/**
 * Update payload for a public table. Used to type dynamic single-field
 * payloads at the write boundary (the tools validate field names against
 * allowlists before building the payload).
 */
export type TableUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];

const MEMORY_ENTITY_TABLES: Partial<Record<LearningEntityType, MemoryEntityTable>> = {
  person: "people",
  organization: "organizations",
  work: "work",
  billing: "billing_records",
  meeting: "meetings",
  // App type is `"resource"`; table stays `public.files` until a hard rename.
  resource: "files",
};

/**
 * Resolve the table for an entity type. Returns null for entity types that
 * have no single backing table ("me").
 */
export function getMemoryEntityTable(
  entityType: LearningEntityType
): MemoryEntityTable | null {
  return MEMORY_ENTITY_TABLES[entityType] ?? null;
}

/** Route key for switch routing inside memory tools (same as LearningEntityType). */
export type MemoryToolRouteKey = LearningEntityType;

export function toMemoryToolRouteKey(entityType: LearningEntityType): MemoryToolRouteKey {
  return entityType;
}

/**
 * Source context for tool calls - who/what is making the change.
 *
 * "care" is the Memory Care system (app/_features/memory/care) — the
 * background capabilities that keep Memory complete, clean, connected, and
 * noted. "playbook" is legacy provenance from the retired system playbooks;
 * act-layer playbooks never mutate Memory directly.
 */
export type ToolSource = "care" | "playbook" | "ask_salt" | "manual" | "enrichment" | "cron";

/**
 * Result action from a protected tool call.
 */
export type UpdateAction = "applied" | "accumulated" | "rejected" | "contradicted";

// ============================================================================
// Evidence Chain (Trust Layer)
// ============================================================================

/**
 * Type of evidence in the chain.
 */
export type EvidenceChainItemType =
  | "signal"           // A computed signal (has_payment_received)
  | "rule"             // A matched fill_rule
  | "user_statement"   // User said something in Ask Salt
  | "inference"        // LLM inference
  | "external"         // External data source (Stripe, calendar)
  | "manual";          // User directly edited

/**
 * A single item in the evidence chain showing what led to a decision.
 * This is stored with provenance and displayed in the UI.
 */
export interface EvidenceChainItem {
  type: EvidenceChainItemType;
  key: string;
  value: unknown;
  confidence: number;
  source: string;
  label?: string;
  timestamp?: string;
}

// ============================================================================
// memoryUpdateField
// ============================================================================

export interface UpdateFieldInput {
  workspaceId: string;
  entityType: LearningEntityType;
  entityId: string;
  field: string;
  value: unknown;
  confidence: number;
  because: string;
  source: ToolSource;
  sourceDetails?: {
    playbookSlug?: string;
    captureId?: string;
    externalId?: string;
    ruleId?: string;
  };
  /** The evidence chain that led to this decision - for trust/explainability */
  evidenceChain?: EvidenceChainItem[];
  /**
   * Optional floor that can only RAISE the effective bar (e.g. the Memory
   * Care tiered bars for sensitive/destructive fields). The tool applies
   * `max(workspaceThreshold, minThreshold)` — callers can never lower the
   * workspace threshold through this field.
   */
  minThreshold?: number;
}

export interface UpdateFieldResult {
  action: UpdateAction;
  threshold: number;
  confidence: number;
  aggregatedConfidence?: number;
  evidenceId?: string;
  appliedAt?: string;
  message: string;
}

// ============================================================================
// memoryAccumulateEvidence
// ============================================================================

export interface AccumulateInput {
  workspaceId: string;
  entityType: LearningEntityType;
  entityId: string;
  field: string;
  value: unknown;
  confidence: number;
  evidenceType: EvidenceType;
  because: string;
  source: ToolSource;
  sourceDetails?: {
    playbookSlug?: string;
    captureId?: string;
    externalId?: string;
  };
}

export interface AccumulateResult {
  evidenceId: string;
  aggregatedConfidence: number;
  evidenceCount: number;
  sourceTypeCount: number;
  meetsThreshold: boolean;
  threshold: number;
}

// ============================================================================
// memoryGetFacts
// ============================================================================

export interface GetFactsInput {
  workspaceId: string;
  entityType: LearningEntityType;
  entityId: string;
  fields?: string[];
}

export interface EntityFact {
  field: string;
  value: unknown;
  confidence: number;
  source: string;
  updatedAt: string;
}

export interface GetFactsResult {
  entityType: LearningEntityType;
  entityId: string;
  facts: Record<string, EntityFact>;
  signals: Record<string, boolean | number | string>;
}

// ============================================================================
// memoryGetEvidence
// ============================================================================

export interface GetEvidenceInput {
  workspaceId: string;
  entityType: LearningEntityType;
  entityId: string;
  field?: string;
}

export interface PendingEvidence {
  field: string;
  proposedValue: unknown;
  aggregatedConfidence: number;
  evidenceCount: number;
  sourceTypes: string[];
  oldestAt: string;
  newestAt: string;
  meetsThreshold: boolean;
  threshold: number;
}

export interface GetEvidenceResult {
  entityType: LearningEntityType;
  entityId: string;
  pending: PendingEvidence[];
}

// ============================================================================
// memoryResolveEvidence
// ============================================================================

export interface ResolveEvidenceInput {
  workspaceId: string;
  evidenceIds: string[];
  resolution: "applied" | "dismissed" | "superseded";
  details?: Record<string, unknown>;
}

export interface ResolveEvidenceResult {
  resolved: number;
  resolution: string;
}

// ============================================================================
// Workspace Threshold Settings
// ============================================================================

export interface ThresholdSettings {
  defaultThreshold: number;
  fieldOverrides: Record<string, number>;
  entityTypeOverrides: Record<LearningEntityType, number>;
}

export const DEFAULT_THRESHOLD_SETTINGS: ThresholdSettings = {
  defaultThreshold: 85,
  fieldOverrides: {},
  entityTypeOverrides: {} as Record<LearningEntityType, number>,
};
