"use server";

/**
 * Handled items actions — the correction-over-approval path.
 *
 * "That's wrong" on an applied write: roll the field back through the
 * protected memory tool, record a quick-undo correction (feeds confidence
 * penalties), and mark the learning as undone so it leaves the Handled list.
 *
 * Step 2.3 hardening: if rollback fails (missing provenance, etc.), we still
 * record the correction (so Salt learns from it) but surface the failure to
 * the user instead of swallowing it silently.
 */

import { revalidatePath } from "next/cache";
import { createClient } from "@/app/_lib/supabase/server";
import { getTenantContext } from "@/app/_lib/tenancy";
import { requireWorkspaceMember } from "@/app/_lib/tenancy/guards";
import { memoryRollbackField } from "@/app/_lib/memory-tools";
import { recordQuickUndo } from "@/app/_features/me/actions/corrections";

export interface MarkWrongResult {
  success: boolean;
  error?: string;
  /** True if the correction was recorded but the field value wasn't rolled back. */
  rollbackFailed?: boolean;
  /** Explanation shown to user when rollback fails. */
  rollbackWarning?: string;
}

export async function markHandledWriteWrong(
  learningId: string,
): Promise<MarkWrongResult> {
  const { context } = await getTenantContext();
  const workspace = requireWorkspaceMember(context);

  if (!context.userId) {
    return { success: false, error: "Sign in required" };
  }

  const supabase = await createClient();

  const { data: learning, error: fetchError } = await supabase
    .from("salt_learnings")
    .select(
      "id, workspace_id, entity_type, entity_id, field_path, new_value, undone_at",
    )
    .eq("id", learningId)
    .eq("workspace_id", workspace.id)
    .single();

  if (fetchError || !learning) {
    return { success: false, error: "Change not found" };
  }

  if (learning.undone_at) {
    return { success: false, error: "Already corrected" };
  }

  // Roll the field back to its previous value. If provenance is missing
  // (e.g. the write predates provenance tracking), we still record the
  // correction so Salt learns from it, but we surface the failure to the
  // user so they know the actual value wasn't changed.
  let rollbackFailed = false;
  let rollbackWarning: string | undefined;

  try {
    await memoryRollbackField({
      workspaceId: workspace.id,
      entityType: learning.entity_type,
      entityId: learning.entity_id,
      field: learning.field_path,
      reason: "Marked wrong in Memory → Filter",
    });
  } catch (error) {
    rollbackFailed = true;
    rollbackWarning =
      "Salt recorded your correction but couldn't roll back the field value " +
      "(this can happen for older changes). You may need to edit the record directly.";
    console.error("[handled-items] rollback failed:", error);
  }

  // Always record the correction so Salt learns — even if rollback failed.
  await recordQuickUndo(
    learning.id,
    workspace.id,
    learning.entity_type,
    learning.entity_id,
    learning.field_path,
    learning.new_value,
  );

  const { error: updateError } = await supabase
    .from("salt_learnings")
    .update({
      undone_at: new Date().toISOString(),
      undone_by: context.userId,
      undo_reason: rollbackFailed
        ? "Marked wrong (rollback failed — provenance missing)"
        : "Marked wrong in Memory → Filter",
    })
    .eq("id", learning.id);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  revalidatePath("/memory");
  revalidatePath("/me");

  return {
    success: true,
    rollbackFailed,
    rollbackWarning,
  };
}
