/**
 * Memory Reflection Pass Types
 *
 * P8 pattern-level learning: corrections cluster by signal source and field
 * type, enabling Salt to learn "email signatures are unreliable for roles"
 * without over-correcting on individual instances.
 *
 * Architecture:
 * - ReflectionTrigger: tracks when to run reflection for a category
 * - SignalSourceWeight: learned confidence adjustment for a source+field
 * - The decision pipeline reads weights before applying proposals
 */

/**
 * A category is a signal_source+field_type combo.
 * Format: "signal_source:field_type" (e.g., "email_signature:role")
 */
export type ReflectionCategory = string;

/**
 * Tracks correction counts for a category to determine when reflection
 * should run. Threshold: 5 corrections triggers a reflection pass.
 */
export interface ReflectionTrigger {
  id: string;
  workspaceId: string;
  category: ReflectionCategory;
  correctionCount: number;
  lastReflectedAt: Date | null;
  createdAt: Date;
}

/**
 * Database row shape for reflection_triggers table.
 */
export interface ReflectionTriggerRow {
  id: string;
  workspace_id: string;
  category: string;
  correction_count: number;
  last_reflected_at: string | null;
  created_at: string;
}

/**
 * Learned confidence adjustment for a signal source + field type combo.
 * Weight floor is 0.5 (source stays useful, just more cautious).
 */
export interface SignalSourceWeight {
  id: string;
  workspaceId: string;
  signalSource: string;
  fieldType: string;
  weightAdjustment: number;
  correctionCount: number;
  lastUpdatedAt: Date;
  createdAt: Date;
}

/**
 * Database row shape for signal_source_weights table.
 */
export interface SignalSourceWeightRow {
  id: string;
  workspace_id: string;
  signal_source: string;
  field_type: string;
  weight_adjustment: string; // Decimal comes as string from Postgres
  correction_count: number;
  last_updated_at: string;
  created_at: string;
}

/**
 * Configuration constants for the reflection system.
 */
export const REFLECTION_CONFIG = {
  /** Number of corrections before triggering a reflection pass */
  TRIGGER_THRESHOLD: 5,

  /** Minimum weight (floor) — source stays useful but cautious */
  WEIGHT_FLOOR: 0.5,

  /** Maximum weight — no penalty */
  WEIGHT_CEILING: 1.0,

  /** Confidence penalty per correction (10% per correction) */
  WEIGHT_DECAY_PER_CORRECTION: 0.1,

  /** Minimum corrections in a cluster to apply weight adjustment */
  MIN_CLUSTER_SIZE: 3,
} as const;

/**
 * Input for incrementing a reflection trigger after a correction.
 */
export interface IncrementTriggerInput {
  workspaceId: string;
  signalSource: string;
  fieldType: string;
}

/**
 * Result from incrementing a trigger.
 */
export interface IncrementTriggerResult {
  /** The category that was incremented */
  category: ReflectionCategory;
  /** New correction count after increment */
  newCount: number;
  /** Whether the threshold was crossed (reflection should run) */
  thresholdCrossed: boolean;
}

/**
 * A cluster of corrections sharing the same signal_source + field_type.
 * Used during reflection pass to calculate weight adjustments.
 */
export interface CorrectionCluster {
  signalSource: string;
  fieldType: string;
  correctionCount: number;
  correctionIds: string[];
  oldestCorrectionAt: Date;
  newestCorrectionAt: Date;
}

/**
 * Input for running a reflection pass on a category.
 */
export interface RunReflectionInput {
  workspaceId: string;
  category: ReflectionCategory;
}

/**
 * Result from running a reflection pass.
 */
export interface RunReflectionResult {
  category: ReflectionCategory;
  clustersAnalyzed: number;
  weightsAdjusted: number;
  newWeights: Array<{
    signalSource: string;
    fieldType: string;
    previousWeight: number;
    newWeight: number;
  }>;
}

/**
 * Helper to build a category string from source and field.
 */
export function buildCategory(signalSource: string, fieldType: string): ReflectionCategory {
  return `${signalSource}:${fieldType}`;
}

/**
 * Helper to parse a category string into source and field.
 */
export function parseCategory(category: ReflectionCategory): {
  signalSource: string;
  fieldType: string;
} {
  const [signalSource, fieldType] = category.split(":");
  return { signalSource: signalSource ?? "", fieldType: fieldType ?? "" };
}

/**
 * Calculate weight adjustment from correction count.
 * Formula: weight = max(0.5, 1 - (correction_count * 0.1))
 */
export function calculateWeight(correctionCount: number): number {
  const { WEIGHT_FLOOR, WEIGHT_CEILING, WEIGHT_DECAY_PER_CORRECTION } = REFLECTION_CONFIG;
  const rawWeight = WEIGHT_CEILING - correctionCount * WEIGHT_DECAY_PER_CORRECTION;
  return Math.max(WEIGHT_FLOOR, Math.min(WEIGHT_CEILING, rawWeight));
}

/**
 * Transform database row to domain type.
 */
export function toReflectionTrigger(row: ReflectionTriggerRow): ReflectionTrigger {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    category: row.category,
    correctionCount: row.correction_count,
    lastReflectedAt: row.last_reflected_at ? new Date(row.last_reflected_at) : null,
    createdAt: new Date(row.created_at),
  };
}

/**
 * Transform database row to domain type.
 */
export function toSignalSourceWeight(row: SignalSourceWeightRow): SignalSourceWeight {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    signalSource: row.signal_source,
    fieldType: row.field_type,
    weightAdjustment: parseFloat(row.weight_adjustment),
    correctionCount: row.correction_count,
    lastUpdatedAt: new Date(row.last_updated_at),
    createdAt: new Date(row.created_at),
  };
}
