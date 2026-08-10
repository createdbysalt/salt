"use server";

/**
 * Salt Learnings Actions
 *
 * Records and retrieves auto-applied Memory Care mutations for the digest.
 * Users see transparency about what Salt did and can undo.
 */

import { revalidatePath } from "next/cache";
import { createClient } from "@/app/_lib/supabase/server";
import { createAdminClient } from "@/app/_lib/supabase/admin";
import type { Json } from "@/app/_lib/supabase/database.types";
import { getTenantContext } from "@/app/_features/auth/queries";
import {
  fromLearningDbEntityType,
  toLearningDbEntityType,
  type LearningEntityType,
} from "@/app/_lib/learning";

// ============================================================================
// Types
// ============================================================================

export interface SaltLearningRow {
  id: string;
  workspace_id: string;
  entity_type: LearningEntityType;
  entity_id: string;
  entity_label: string;
  field_path: string;
  field_label: string | null;
  old_value: unknown;
  new_value: unknown;
  confidence: number;
  evidence_summary: string;
  evidence_ids: string[] | null;
  playbook_slug: string | null;
  play_run_id: string | null;
  created_at: string;
  seen_at: string | null;
  undone_at: string | null;
  undone_by: string | null;
  undo_reason: string | null;
}

export interface RecordLearningInput {
  workspaceId: string;
  entityType: LearningEntityType;
  entityId: string;
  entityLabel: string;
  fieldPath: string;
  fieldLabel?: string;
  oldValue?: unknown;
  newValue: unknown;
  confidence: number;
  evidenceSummary: string;
  evidenceIds?: string[];
  playbookSlug?: string;
  playRunId?: string;
}

export interface LearningsDigest {
  unseenCount: number;
  thisWeek: SaltLearningRow[];
  lastWeek: SaltLearningRow[];
  older: SaltLearningRow[];
}

// ============================================================================
// Record a Learning
// ============================================================================

/**
 * Record that Salt auto-executed a mutation.
 * Called after successful auto-execute in the execution router.
 */
export async function recordSaltLearning(
  input: RecordLearningInput,
): Promise<{ id: string }> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("salt_learnings")
    .insert({
      workspace_id: input.workspaceId,
      entity_type: toLearningDbEntityType(input.entityType),
      entity_id: input.entityId,
      entity_label: input.entityLabel,
      field_path: input.fieldPath,
      field_label: input.fieldLabel ?? null,
      // oldValue/newValue arrive as unknown from callers; the DB columns are
      // jsonb, so narrow at the write boundary only.
      old_value: (input.oldValue ?? null) as Json,
      new_value: input.newValue as Json,
      confidence: input.confidence,
      evidence_summary: input.evidenceSummary,
      evidence_ids: input.evidenceIds ?? null,
      playbook_slug: input.playbookSlug ?? null,
      play_run_id: input.playRunId ?? null,
    })
    .select("id")
    .single();

  if (error) throw error;
  return { id: data.id };
}

// ============================================================================
// Query Learnings
// ============================================================================

/**
 * Get the learnings digest for the current user's workspace.
 * Groups by week for display.
 */
export async function getSaltLearningsDigest(
  workspaceId: string,
): Promise<LearningsDigest> {
  const supabase = await createClient();
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const { data: learnings, error } = await supabase
    .from("salt_learnings")
    .select("*")
    .eq("workspace_id", workspaceId)
    .is("undone_at", null)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) throw error;

  const rows = (learnings ?? []) as SaltLearningRow[];

  // Count unseen
  const unseenCount = rows.filter((l) => !l.seen_at).length;

  // Group by week
  const thisWeek = rows.filter((l) => new Date(l.created_at) >= oneWeekAgo);
  const lastWeek = rows.filter(
    (l) =>
      new Date(l.created_at) >= twoWeeksAgo &&
      new Date(l.created_at) < oneWeekAgo,
  );
  const older = rows.filter((l) => new Date(l.created_at) < twoWeeksAgo);

  return { unseenCount, thisWeek, lastWeek, older };
}

/**
 * Mark learnings as seen.
 */
export async function markLearningsSeen(
  workspaceId: string,
  learningIds?: string[],
): Promise<void> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  let query = supabase
    .from("salt_learnings")
    .update({ seen_at: now })
    .eq("workspace_id", workspaceId)
    .is("seen_at", null);

  if (learningIds && learningIds.length > 0) {
    query = query.in("id", learningIds);
  }

  const { error } = await query;
  if (error) throw error;

  revalidatePath("/me");
}

// ============================================================================
// Undo a Learning
// ============================================================================

/**
 * Undo a Salt learning — reverts the change and records the correction.
 * This is the "quick undo" path (minimal learning signal).
 */
export async function undoSaltLearning(
  learningId: string,
  reason?: string,
): Promise<{ success: boolean; error?: string }> {
  const { context } = await getTenantContext();
  if (context.actorType !== "workspaceMember" || !context.userId) {
    return { success: false, error: "Not authenticated" };
  }
  const userId = context.userId;

  const supabase = await createClient();

  // Get the learning
  const { data: learning, error: fetchError } = await supabase
    .from("salt_learnings")
    .select("*")
    .eq("id", learningId)
    .single();

  if (fetchError || !learning) {
    return { success: false, error: "Learning not found" };
  }

  if (learning.undone_at) {
    return { success: false, error: "Already undone" };
  }

  // TODO: Actually revert the entity field to old_value
  // This requires knowing which table to update based on entity_type
  // For now, just mark as undone — the revert logic will be added
  // when we integrate with the profile engine

  // Mark as undone
  const { error: updateError } = await supabase
    .from("salt_learnings")
    .update({
      undone_at: new Date().toISOString(),
      undone_by: userId,
      undo_reason: reason ?? null,
    })
    .eq("id", learningId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  revalidatePath("/me");
  return { success: true };
}

// ============================================================================
// Entity-Specific Learnings Count
// ============================================================================

/**
 * Get the count of learnings for a specific entity.
 * Used for "View evidence" links on Memory record pages.
 */
export async function getEntityLearningsCount(
  workspaceId: string,
  entityType: LearningEntityType,
  entityId: string,
): Promise<number> {
  const supabase = await createClient();

  const { count, error } = await supabase
    .from("salt_learnings")
    .select("*", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("entity_type", toLearningDbEntityType(entityType))
    .eq("entity_id", entityId)
    .is("undone_at", null);

  if (error) throw error;
  return count ?? 0;
}

/**
 * Get learnings for a specific entity.
 */
export async function getEntityLearnings(
  workspaceId: string,
  entityType: LearningEntityType,
  entityId: string,
): Promise<SaltLearningRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("salt_learnings")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("entity_type", toLearningDbEntityType(entityType))
    .eq("entity_id", entityId)
    .is("undone_at", null)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw error;
  return ((data ?? []) as SaltLearningRow[]).map((row) => ({
    ...row,
    entity_type:
      fromLearningDbEntityType(row.entity_type) ?? row.entity_type,
  }));
}

// ============================================================================
// Evidence Summary Generation
// ============================================================================

/**
 * Generate a human-readable evidence summary.
 * "Seen in 3 emails across 2 conversations"
 */
export async function generateEvidenceSummary(
  evidenceCount: number,
  sourceTypeCount: number,
  sourceTypes?: string[],
): Promise<string> {
  if (evidenceCount === 1) {
    const source = sourceTypes?.[0] ?? "source";
    return `Seen once in ${source}`;
  }

  if (sourceTypeCount === 1) {
    const source = sourceTypes?.[0] ?? "source";
    return `Seen ${evidenceCount} times in ${source}`;
  }

  const sourceLabel =
    sourceTypeCount === 2
      ? "2 different sources"
      : `${sourceTypeCount} different sources`;

  return `Seen ${evidenceCount} times across ${sourceLabel}`;
}
