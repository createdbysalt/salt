/**
 * Keeper Execution Router (Confidence-Gated Execution)
 *
 * Routes keeper mutations through three paths based on confidence and stakes:
 * - Path A: Auto-execute (high confidence + low stakes)
 * - Path B: Accumulate (below threshold, gather more evidence)
 * - Path C: Approval required (high stakes regardless of confidence)
 *
 * Design decisions (from 2026-07-10):
 * - User controls threshold via keeper_auto_execute_threshold (default 85)
 * - First-time classifications always need approval
 * - Ask-first fields (from keeper-field-contracts) always need approval
 */

import { createAdminClient } from "@/app/_lib/supabase/admin";
import type { KeeperEntityType } from "./evidence-accumulator";

// ============================================================================
// Types
// ============================================================================

export type ExecutionPath =
  | { path: "auto_execute"; confidence: number; reason: string }
  | { path: "accumulate"; currentConfidence: number; threshold: number; reason: string }
  | { path: "approval_required"; reason: string };

export interface ExecutionRouterInput {
  workspaceId: string;
  entityType: KeeperEntityType;
  entityId: string;
  fieldPath: string;
  proposedValue: unknown;
  currentValue: unknown;
  aggregatedConfidence: number;
  isFirstTimeClassification?: boolean;
}

// ============================================================================
// Field Contracts — Ask-First Fields
// ============================================================================

/**
 * Fields that ALWAYS require approval regardless of confidence.
 * From keeper-field-contracts.md.
 */
const ASK_FIRST_FIELDS: Record<KeeperEntityType, string[]> = {
  person: [
    "industry",           // Requires user judgment
    "preferred_channel",  // User preference
  ],
  organization: [
    "industry",
    "industry_parent",
  ],
  work: [
    "work_type",          // Project vs Retainer requires context
    "billing_model",      // Financial impact
  ],
  meeting: [],
  file: [],
  me: [
    "business_model",     // Core business decisions
    "pricing_model",
  ],
  billing: [
    "total",              // Never auto-modify amounts
    "amount_paid",
  ],
};

/**
 * Fields that represent entity classification (first assignment needs approval).
 */
const CLASSIFICATION_FIELDS: Record<KeeperEntityType, string[]> = {
  person: ["record_status"],       // lead → client
  organization: ["record_status"],
  work: ["work_status"],           // opportunity → active
  meeting: [],
  file: [],
  me: [],
  billing: ["status"],
};

/**
 * Destructive field changes that need approval.
 * Changes TO these values are high-stakes.
 */
const DESTRUCTIVE_VALUES: Record<string, unknown[]> = {
  "record_status": ["past_client", "archived", "lost"],
  "work_status": ["completed", "cancelled", "lost"],
  "status": ["void", "cancelled"],
};

// ============================================================================
// Router Logic
// ============================================================================

function isAskFirstField(entityType: KeeperEntityType, fieldPath: string): boolean {
  return ASK_FIRST_FIELDS[entityType]?.includes(fieldPath) ?? false;
}

function isClassificationField(entityType: KeeperEntityType, fieldPath: string): boolean {
  return CLASSIFICATION_FIELDS[entityType]?.includes(fieldPath) ?? false;
}

function isDestructiveChange(fieldPath: string, proposedValue: unknown): boolean {
  const destructiveValues = DESTRUCTIVE_VALUES[fieldPath];
  if (!destructiveValues) return false;
  return destructiveValues.some((v) => JSON.stringify(v) === JSON.stringify(proposedValue));
}

function isFirstTimeClassification(
  entityType: KeeperEntityType,
  fieldPath: string,
  currentValue: unknown,
): boolean {
  if (!isClassificationField(entityType, fieldPath)) return false;
  // First-time = current value is null, undefined, or a "default" state
  return currentValue == null || currentValue === "" || currentValue === "unknown";
}

/**
 * Get the workspace's auto-execute threshold.
 */
export async function getWorkspaceThreshold(workspaceId: string): Promise<number> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("workspaces")
    .select("keeper_auto_execute_threshold")
    .eq("id", workspaceId)
    .single();

  if (error) {
    console.error("Failed to get workspace threshold:", error);
    return 85; // Default fallback
  }

  return data?.keeper_auto_execute_threshold ?? 85;
}

/**
 * Determine the execution path for a keeper mutation.
 *
 * Returns one of:
 * - auto_execute: High confidence + low stakes → execute immediately
 * - accumulate: Below threshold → store evidence, wait for more
 * - approval_required: High stakes → queue for user approval
 */
export async function determineExecutionPath(
  input: ExecutionRouterInput,
): Promise<ExecutionPath> {
  const {
    workspaceId,
    entityType,
    entityId,
    fieldPath,
    proposedValue,
    currentValue,
    aggregatedConfidence,
  } = input;

  // 1. Ask-first fields ALWAYS need approval
  if (isAskFirstField(entityType, fieldPath)) {
    return {
      path: "approval_required",
      reason: `Field "${fieldPath}" requires user confirmation (ask-first policy)`,
    };
  }

  // 2. First-time classifications ALWAYS need approval
  const firstTime = input.isFirstTimeClassification ??
    isFirstTimeClassification(entityType, fieldPath, currentValue);

  if (firstTime) {
    return {
      path: "approval_required",
      reason: `First-time classification of ${entityType} requires confirmation`,
    };
  }

  // 3. Destructive changes need approval
  if (isDestructiveChange(fieldPath, proposedValue)) {
    return {
      path: "approval_required",
      reason: `Changing "${fieldPath}" to "${String(proposedValue)}" is a destructive operation`,
    };
  }

  // 4. Get user's threshold
  const threshold = await getWorkspaceThreshold(workspaceId);

  // 5. Check confidence against threshold
  if (aggregatedConfidence >= threshold) {
    return {
      path: "auto_execute",
      confidence: aggregatedConfidence,
      reason: `Confidence ${aggregatedConfidence}% meets threshold ${threshold}%`,
    };
  }

  // 6. Below threshold → accumulate more evidence
  return {
    path: "accumulate",
    currentConfidence: aggregatedConfidence,
    threshold,
    reason: `Confidence ${aggregatedConfidence}% below threshold ${threshold}% — accumulating evidence`,
  };
}

/**
 * Batch check for multiple fields.
 * Useful when processing a capture that affects multiple entity fields.
 */
export async function determineExecutionPaths(
  workspaceId: string,
  inputs: Array<Omit<ExecutionRouterInput, "workspaceId">>,
): Promise<Map<string, ExecutionPath>> {
  const results = new Map<string, ExecutionPath>();

  for (const input of inputs) {
    const key = `${input.entityType}:${input.entityId}:${input.fieldPath}`;
    const path = await determineExecutionPath({
      workspaceId,
      ...input,
    });
    results.set(key, path);
  }

  return results;
}

// ============================================================================
// Integration Helpers
// ============================================================================

/**
 * Check if a field should be auto-applied without going through the router.
 * Used for truly low-stakes fields that never need accumulation.
 */
export function isAlwaysAutoApplyField(entityType: KeeperEntityType, fieldPath: string): boolean {
  const alwaysAuto: Record<KeeperEntityType, string[]> = {
    person: ["last_contacted_at", "contact_count"],
    organization: ["last_contacted_at", "contact_count"],
    work: ["last_activity_at"],
    meeting: ["start_time", "end_time", "attendees"],
    file: ["last_modified_at", "size_bytes"],
    me: [],
    billing: ["due_date"],
  };

  return alwaysAuto[entityType]?.includes(fieldPath) ?? false;
}

/**
 * Get the reason why a field needs approval (for UI display).
 */
export function getApprovalReason(
  entityType: KeeperEntityType,
  fieldPath: string,
  proposedValue: unknown,
  currentValue: unknown,
): string | null {
  if (isAskFirstField(entityType, fieldPath)) {
    return `"${fieldPath}" requires your confirmation`;
  }

  if (isFirstTimeClassification(entityType, fieldPath, currentValue)) {
    return `This is the first time classifying this ${entityType}`;
  }

  if (isDestructiveChange(fieldPath, proposedValue)) {
    return `Changing to "${String(proposedValue)}" is a significant change`;
  }

  return null;
}
