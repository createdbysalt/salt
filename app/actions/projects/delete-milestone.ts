"use server";

import { createClient } from "@/app/_lib/supabase/server";
import { getTenantContext } from "@/app/_lib/tenancy";
import { requireWorkspaceMember } from "@/app/_lib/tenancy/guards";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const deleteMilestoneSchema = z.object({
  id: z.string().uuid(),
});

export async function deleteMilestone(id: string) {
  try {
    const { context } = await getTenantContext();
    const workspace = requireWorkspaceMember(context);
    const supabase = await createClient();

    // Validate input
    const validatedData = deleteMilestoneSchema.parse({ id });

    // Verify milestone belongs to this workspace and get project_id
    const { data: existingMilestone, error: fetchError } = await supabase
      .from("project_milestones")
      .select("id, project_id, order_index")
      .eq("id", validatedData.id)
      .eq("studio_id", workspace.id)
      .single();

    if (fetchError || !existingMilestone) {
      return { error: "Milestone not found" };
    }

    const projectId = existingMilestone.project_id;

    // Check if any tasks are linked to this milestone
    const { count: linkedTasksCount } = await supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("milestone_id", validatedData.id);

    if (linkedTasksCount && linkedTasksCount > 0) {
      // Unlink tasks from this milestone instead of preventing deletion
      const { error: unlinkError } = await supabase
        .from("tasks")
        .update({ milestone_id: null })
        .eq("milestone_id", validatedData.id);

      if (unlinkError) {
        console.error("Error unlinking tasks:", unlinkError);
        return { error: "Failed to unlink tasks from milestone" };
      }
    }

    // Check if other milestones depend on this one
    const { data: dependentMilestones } = await supabase
      .from("project_milestones")
      .select("id")
      .eq("depends_on_milestone_id", validatedData.id);

    if (dependentMilestones && dependentMilestones.length > 0) {
      // Clear the dependency instead of preventing deletion
      const { error: clearDepsError } = await supabase
        .from("project_milestones")
        .update({ depends_on_milestone_id: null })
        .eq("depends_on_milestone_id", validatedData.id);

      if (clearDepsError) {
        console.error("Error clearing dependencies:", clearDepsError);
        return { error: "Failed to clear milestone dependencies" };
      }
    }

    // Delete the milestone
    const { error: deleteError } = await supabase
      .from("project_milestones")
      .delete()
      .eq("id", validatedData.id);

    if (deleteError) {
      console.error("Error deleting milestone:", deleteError);
      return { error: "Failed to delete milestone" };
    }

    // Reorder remaining milestones to close the gap
    const { data: remainingMilestones } = await supabase
      .from("project_milestones")
      .select("id, order_index")
      .eq("project_id", projectId)
      .order("order_index", { ascending: true });

    if (remainingMilestones && remainingMilestones.length > 0) {
      // Update order_index for each remaining milestone
      for (let i = 0; i < remainingMilestones.length; i++) {
        if (remainingMilestones[i].order_index !== i) {
          await supabase
            .from("project_milestones")
            .update({ order_index: i })
            .eq("id", remainingMilestones[i].id);
        }
      }
    }

    revalidatePath("/work");

    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.errors[0].message };
    }
    console.error("Unexpected error:", error);
    return { error: "An unexpected error occurred" };
  }
}
