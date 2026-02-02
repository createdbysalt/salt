"use server";

import { createClient } from "@/app/_lib/supabase/server";
import { getTenantContext } from "@/app/_lib/tenancy";
import { requireStudioMember } from "@/app/_lib/tenancy/guards";
import { revalidatePath } from "next/cache";

/**
 * Mark a milestone as complete.
 * completed_at is auto-set by trigger when status changes to 'complete'.
 */
export async function completeMilestone(milestoneId: string, projectId: string) {
  try {
    const { context } = await getTenantContext();
    const studio = requireStudioMember(context);
    const supabase = await createClient();

    // Verify milestone belongs to this studio's project
    const { data: milestone } = await supabase
      .from("project_milestones")
      .select("id, project_id, studio_id")
      .eq("id", milestoneId)
      .eq("studio_id", studio.id)
      .single();

    if (!milestone) {
      return { error: "Milestone not found" };
    }

    // Update status (trigger will set completed_at)
    const { error: updateError } = await supabase
      .from("project_milestones")
      .update({ status: "complete" })
      .eq("id", milestoneId);

    if (updateError) {
      console.error("Error completing milestone:", updateError);
      return { error: "Failed to complete milestone" };
    }

    revalidatePath(`/studio/projects/${projectId}`);

    return { success: true };
  } catch (error) {
    console.error("Unexpected error:", error);
    return { error: "An unexpected error occurred" };
  }
}

