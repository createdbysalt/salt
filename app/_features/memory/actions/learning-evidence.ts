"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/app/_lib/supabase/server";
import { getTenantContext } from "@/app/_lib/tenancy";
import { requireWorkspaceMember } from "@/app/_lib/tenancy/guards";
import { memoryUpdateField, type LearningEntityType } from "@/app/_lib/memory-tools";

interface AcceptLearningEvidenceInput {
  workspaceId: string;
  entityType?: LearningEntityType;
  entityId?: string;
  fieldPath: string;
  proposedValue: string;
  evidenceIds: string[];
}

interface DismissLearningEvidenceInput {
  workspaceId: string;
  evidenceIds: string[];
}

/**
 * Meta candidate fields emitted by Memory Hygiene (_merge_candidate,
 * _archive_candidate, _link_candidate). These describe suggested operations
 * rather than field values, so accepting them resolves the evidence without
 * a field write — the operation itself runs through its own review flow.
 */
function isMetaCandidateField(fieldPath: string): boolean {
  return fieldPath.startsWith("_");
}

export async function acceptLearningEvidence(
  input: AcceptLearningEvidenceInput
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

  // Apply the accepted value to Memory through the protected tool.
  // User acceptance is full confidence, so this applies immediately and
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
        because: "Accepted in Memory → Filter",
        source: "manual",
        sourceDetails: { externalId: userId },
      });
    } catch (error) {
      console.error("Failed to apply accepted evidence:", error);
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
    console.error("Failed to accept learning evidence:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/memory");
  revalidatePath("/plays");
  return { success: true };
}

export async function dismissLearningEvidence(
  input: DismissLearningEvidenceInput
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
    console.error("Failed to dismiss learning evidence:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/memory");
  revalidatePath("/plays");
  return { success: true };
}
