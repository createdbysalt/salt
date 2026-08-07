"use server";

/**
 * Handled items actions — the correction-over-approval path.
 *
 * "That's wrong" on an applied write: roll the field back through the
 * protected memory tool, record a quick-undo correction (feeds confidence
 * penalties), and mark the learning as undone so it leaves the Handled list.
 */

import { revalidatePath } from "next/cache";
import { createClient } from "@/app/_lib/supabase/server";
import { getTenantContext } from "@/app/_lib/tenancy";
import { requireWorkspaceMember } from "@/app/_lib/tenancy/guards";
import { memoryRollbackField } from "@/app/_lib/memory-tools";
import { recordQuickUndo } from "@/app/_features/me/actions/corrections";

export async function markHandledWriteWrong(
  learningId: string,
): Promise<{ success: boolean; error?: string }> {
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
  // (e.g. the write predates provenance tracking), still record the
  // correction so Salt learns from it.
  try {
    await memoryRollbackField({
      workspaceId: workspace.id,
      entityType: learning.entity_type,
      entityId: learning.entity_id,
      field: learning.field_path,
      reason: "Marked wrong in Memory → Filter",
    });
  } catch (error) {
    console.error("[handled-items] rollback failed:", error);
  }

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
      undo_reason: "Marked wrong in Memory → Filter",
    })
    .eq("id", learning.id);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  revalidatePath("/memory");
  revalidatePath("/me");
  return { success: true };
}
