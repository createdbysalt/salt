"use server";

/**
 * Correction Learning Actions
 *
 * Handles user corrections to keeper auto-executes. Three paths:
 * 1. Quick undo: minimal signal, small penalty
 * 2. Structured reason: predefined categories, medium penalty
 * 3. Conversational: Ask Salt explanation, full context learning
 */

import { revalidatePath } from "next/cache";
import { createClient } from "@/app/_lib/supabase/server";
import { createAdminClient } from "@/app/_lib/supabase/admin";
import { getTenantContext } from "@/app/_features/auth/queries";
import { resolveEvidence } from "@/app/_features/plays/playbooks/evidence-accumulator";
import type { KeeperEntityType } from "@/app/_features/plays/playbooks/evidence-accumulator";

// ============================================================================
// Types
// ============================================================================

export type CorrectionType = "quick_undo" | "structured_reason" | "conversational";

export type CorrectionReason =
  | "wrong_value"
  | "wrong_entity"
  | "wrong_timing"
  | "never_true"
  | "too_aggressive"
  | "context_missing"
  | "other";

export interface CorrectionEventRow {
  id: string;
  workspace_id: string;
  learning_id: string | null;
  entity_type: KeeperEntityType;
  entity_id: string;
  field_path: string;
  wrong_value: unknown;
  correct_value: unknown | null;
  correction_type: CorrectionType;
  correction_reason: CorrectionReason | null;
  user_explanation: string | null;
  extracted_patterns: unknown[];
  confidence_penalty: number;
  created_by: string;
  created_at: string;
  resulting_fact_id: string | null;
}

export interface RecordCorrectionInput {
  workspaceId: string;
  learningId?: string;
  entityType: KeeperEntityType;
  entityId: string;
  fieldPath: string;
  wrongValue: unknown;
  correctValue?: unknown;
  correctionType: CorrectionType;
  correctionReason?: CorrectionReason;
  userExplanation?: string;
}

// ============================================================================
// Confidence Penalty Calculation
// ============================================================================

/**
 * Base penalties by correction type.
 * These are starting points; actual penalty may be higher based on history.
 */
const BASE_PENALTIES: Record<CorrectionType, number> = {
  quick_undo: 10,
  structured_reason: 30,
  conversational: 40,
};

/**
 * Calculate confidence penalty based on correction history.
 * Uses diminishing decay: 1st correction = -50%, 2nd = -33%, 3rd = -25%, etc.
 * Never hits zero (soft learning, not hard blocks).
 */
export async function calculateConfidencePenalty(
  workspaceId: string,
  entityType: KeeperEntityType,
  entityId: string,
  fieldPath: string,
  correctionType: CorrectionType,
): Promise<number> {
  const admin = createAdminClient();

  // Count prior corrections for this entity + field
  const { count, error } = await admin
    .from("correction_events")
    .select("*", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .eq("field_path", fieldPath);

  if (error) throw error;

  const priorCorrections = count ?? 0;
  const basePenalty = BASE_PENALTIES[correctionType];

  // Diminishing decay: each correction has less impact
  // 1st = 100%, 2nd = 66%, 3rd = 50%, 4th = 40%, etc.
  const decayFactor = 1 / (priorCorrections + 1);
  const scaledPenalty = Math.round(basePenalty * decayFactor);

  // Minimum penalty of 5 (never becomes meaningless)
  return Math.max(scaledPenalty, 5);
}

// ============================================================================
// Record Correction
// ============================================================================

/**
 * Record a correction and apply penalties.
 * This is the main entry point for all correction types.
 */
export async function recordCorrection(
  input: RecordCorrectionInput,
): Promise<{ id: string; penaltyApplied: number }> {
  const { context } = await getTenantContext();
  if (context.actorType !== "workspaceMember" || !context.userId) {
    throw new Error("Not authenticated");
  }

  const admin = createAdminClient();

  // Calculate penalty based on history
  const penalty = await calculateConfidencePenalty(
    input.workspaceId,
    input.entityType,
    input.entityId,
    input.fieldPath,
    input.correctionType,
  );

  // Insert correction event
  const { data: correction, error: insertError } = await admin
    .from("correction_events")
    .insert({
      workspace_id: input.workspaceId,
      learning_id: input.learningId ?? null,
      entity_type: input.entityType,
      entity_id: input.entityId,
      field_path: input.fieldPath,
      wrong_value: input.wrongValue,
      correct_value: input.correctValue ?? null,
      correction_type: input.correctionType,
      correction_reason: input.correctionReason ?? null,
      user_explanation: input.userExplanation ?? null,
      confidence_penalty: penalty,
      created_by: context.userId,
    })
    .select("id")
    .single();

  if (insertError) throw insertError;

  // If linked to a learning, mark evidence as dismissed
  if (input.learningId) {
    const { data: learning } = await admin
      .from("salt_learnings")
      .select("evidence_ids")
      .eq("id", input.learningId)
      .single();

    if (learning?.evidence_ids && learning.evidence_ids.length > 0) {
      await resolveEvidence(
        input.workspaceId,
        learning.evidence_ids,
        "dismissed",
        {
          correctionId: correction.id,
          dismissedAt: new Date().toISOString(),
        },
      );
    }
  }

  // Apply penalty to any pending evidence for this entity + field
  await applyPenaltyToPendingEvidence(
    input.workspaceId,
    input.entityType,
    input.entityId,
    input.fieldPath,
    penalty,
  );

  revalidatePath("/me");

  return { id: correction.id, penaltyApplied: penalty };
}

/**
 * Apply penalty to pending evidence for the same entity + field.
 * Reduces confidence of existing evidence to prevent immediate re-triggering.
 */
async function applyPenaltyToPendingEvidence(
  workspaceId: string,
  entityType: KeeperEntityType,
  entityId: string,
  fieldPath: string,
  penalty: number,
): Promise<void> {
  const admin = createAdminClient();

  // Get pending evidence
  const { data: evidence, error } = await admin
    .from("entity_evidence")
    .select("id, confidence")
    .eq("workspace_id", workspaceId)
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .eq("field_path", fieldPath)
    .is("resolved_at", null);

  if (error) throw error;
  if (!evidence || evidence.length === 0) return;

  // Apply penalty (reduce confidence, minimum 0)
  for (const e of evidence) {
    const newConfidence = Math.max(0, (e.confidence ?? 0) - penalty);
    await admin
      .from("entity_evidence")
      .update({
        confidence: newConfidence,
        evidence_details: {
          penaltyApplied: penalty,
          penaltyAppliedAt: new Date().toISOString(),
        },
      })
      .eq("id", e.id);
  }
}

// ============================================================================
// Correction Handlers by Type
// ============================================================================

/**
 * Quick undo — minimal signal, just reverts the change.
 */
export async function recordQuickUndo(
  learningId: string,
  workspaceId: string,
  entityType: KeeperEntityType,
  entityId: string,
  fieldPath: string,
  wrongValue: unknown,
): Promise<{ success: boolean; error?: string }> {
  try {
    await recordCorrection({
      workspaceId,
      learningId,
      entityType,
      entityId,
      fieldPath,
      wrongValue,
      correctionType: "quick_undo",
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Structured reason — user selects from predefined options.
 */
export async function recordStructuredCorrection(
  learningId: string,
  workspaceId: string,
  entityType: KeeperEntityType,
  entityId: string,
  fieldPath: string,
  wrongValue: unknown,
  correctValue: unknown | null,
  reason: CorrectionReason,
  additionalContext?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    await recordCorrection({
      workspaceId,
      learningId,
      entityType,
      entityId,
      fieldPath,
      wrongValue,
      correctValue,
      correctionType: "structured_reason",
      correctionReason: reason,
      userExplanation: additionalContext,
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Conversational correction — user explained via Ask Salt.
 * Called after Ask Salt processes the explanation.
 */
export async function recordConversationalCorrection(input: {
  workspaceId: string;
  learningId?: string;
  entityType: KeeperEntityType;
  entityId: string;
  fieldPath: string;
  wrongValue: unknown;
  correctValue?: unknown;
  userExplanation: string;
  extractedPatterns?: unknown[];
  resultingFactId?: string;
}): Promise<{ id: string; penaltyApplied: number }> {
  const result = await recordCorrection({
    workspaceId: input.workspaceId,
    learningId: input.learningId,
    entityType: input.entityType,
    entityId: input.entityId,
    fieldPath: input.fieldPath,
    wrongValue: input.wrongValue,
    correctValue: input.correctValue,
    correctionType: "conversational",
    userExplanation: input.userExplanation,
  });

  // If patterns were extracted, update the correction event
  if (input.extractedPatterns || input.resultingFactId) {
    const admin = createAdminClient();
    await admin
      .from("correction_events")
      .update({
        extracted_patterns: input.extractedPatterns ?? [],
        resulting_fact_id: input.resultingFactId ?? null,
      })
      .eq("id", result.id);
  }

  return result;
}

// ============================================================================
// Query Corrections
// ============================================================================

/**
 * Get correction history for an entity.
 */
export async function getEntityCorrections(
  workspaceId: string,
  entityType: KeeperEntityType,
  entityId: string,
): Promise<CorrectionEventRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("correction_events")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as CorrectionEventRow[];
}

/**
 * Get correction count for confidence decay calculation.
 */
export async function getCorrectionCount(
  workspaceId: string,
  entityType: KeeperEntityType,
  entityId: string,
  fieldPath: string,
): Promise<number> {
  const supabase = await createClient();

  const { count, error } = await supabase
    .from("correction_events")
    .select("*", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .eq("field_path", fieldPath);

  if (error) throw error;
  return count ?? 0;
}
