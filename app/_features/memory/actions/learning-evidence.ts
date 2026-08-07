"use server";

/**
 * Watching nudges for Memory → Filter.
 *
 * "That's right" confirms accumulating evidence (may cross the bar).
 * "Not this" dismisses and teaches — records a correction so Salt learns.
 * Neither is an approval queue action.
 */

import { revalidatePath } from "next/cache";
import { createClient } from "@/app/_lib/supabase/server";
import { getTenantContext } from "@/app/_lib/tenancy";
import { requireWorkspaceMember } from "@/app/_lib/tenancy/guards";
import {
  memoryUpdateField,
  type LearningEntityType,
} from "@/app/_lib/memory-tools";
import { recordCorrection } from "@/app/_features/me/actions/corrections";

interface ConfirmWatchingEvidenceInput {
  workspaceId: string;
  entityType?: LearningEntityType;
  entityId?: string;
  fieldPath: string;
  proposedValue: string;
  evidenceIds: string[];
}

interface DismissWatchingEvidenceInput {
  workspaceId: string;
  evidenceIds: string[];
  entityType?: LearningEntityType;
  entityId?: string;
  fieldPath?: string;
  proposedValue?: string;
}

/**
 * Meta candidate fields emitted by Memory Hygiene (_merge_candidate,
 * _archive_candidate, _link_candidate). These describe suggested operations
 * rather than field values, so confirming them resolves the evidence without
 * a field write — the operation itself runs through its own review flow.
 */
function isMetaCandidateField(fieldPath: string): boolean {
  return fieldPath.startsWith("_");
}

/** Confirm a Watching proposal ("That's right") — may cross the bar. */
export async function confirmWatchingEvidence(
  input: ConfirmWatchingEvidenceInput
): Promise<{ success: boolean; error?: string }> {
  const { context } = await getTenantContext();
  const workspace = requireWorkspaceMember(context);
  const userId = context.userId;

  if (workspace.id !== input.workspaceId) {
    return { success: false, error: "Workspace mismatch" };
  }

  if (!userId) {
    return { success: false, error: "Sign in required" };
  }

  // User confirmation is full confidence, so this applies immediately and
  // resolves all pending evidence for the field.
  const shouldApply =
    input.entityType &&
    input.entityId &&
    !isMetaCandidateField(input.fieldPath) &&
    input.proposedValue.trim().length > 0;

  if (shouldApply) {
    try {
      await memoryUpdateField({
        workspaceId: workspace.id,
        entityType: input.entityType!,
        entityId: input.entityId!,
        field: input.fieldPath,
        value: input.proposedValue,
        confidence: 100,
        because: "Confirmed in Memory → Filter",
        source: "manual",
        sourceDetails: { externalId: userId },
      });
    } catch (error) {
      console.error("Failed to apply confirmed evidence:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to apply value",
      };
    }
  }

  // Ensure the specific evidence rows shown to the user are resolved even if
  // the field write path didn't cover them (meta fields, missing entity).
  const supabase = await createClient();
  const now = new Date().toISOString();

  const { error } = await supabase
    .from("entity_evidence")
    .update({
      resolved_at: now,
      resolution: "applied",
    })
    .in("id", input.evidenceIds)
    .eq("workspace_id", workspace.id)
    .is("resolved_at", null);

  if (error) {
    console.error("Failed to confirm watching evidence:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/memory");
  return { success: true };
}

/**
 * Dismiss a Watching proposal ("Not this") and teach Salt.
 * Records a structured correction so the bar learns from the nudge.
 */
export async function dismissWatchingEvidence(
  input: DismissWatchingEvidenceInput
): Promise<{ success: boolean; error?: string }> {
  const { context } = await getTenantContext();
  const workspace = requireWorkspaceMember(context);
  const userId = context.userId;

  if (workspace.id !== input.workspaceId) {
    return { success: false, error: "Workspace mismatch" };
  }

  if (!userId) {
    return { success: false, error: "Sign in required" };
  }

  const supabase = await createClient();
  const now = new Date().toISOString();

  const { error } = await supabase
    .from("entity_evidence")
    .update({
      resolved_at: now,
      resolution: "dismissed",
    })
    .in("id", input.evidenceIds)
    .eq("workspace_id", workspace.id);

  if (error) {
    console.error("Failed to dismiss watching evidence:", error);
    return { success: false, error: error.message };
  }

  // Teach: record a correction when we know what was wrong.
  if (
    input.entityType &&
    input.entityId &&
    input.fieldPath &&
    !isMetaCandidateField(input.fieldPath)
  ) {
    try {
      await recordCorrection({
        workspaceId: workspace.id,
        entityType: input.entityType,
        entityId: input.entityId,
        fieldPath: input.fieldPath,
        wrongValue: input.proposedValue ?? null,
        correctionType: "structured_reason",
        correctionReason: "never_true",
        userExplanation: "Dismissed in Memory → Filter (Not this)",
      });
    } catch (error) {
      // Teaching must not block the dismiss.
      console.error("[watching] Failed to record teaching correction:", error);
    }
  }

  revalidatePath("/memory");
  revalidatePath("/me");
  return { success: true };
}

/** @deprecated Use confirmWatchingEvidence — kept for any lingering imports. */
export const acceptLearningEvidence = confirmWatchingEvidence;

/** @deprecated Use dismissWatchingEvidence — kept for any lingering imports. */
export const dismissLearningEvidence = dismissWatchingEvidence;
