"use server";

import { createClient } from "@/app/_lib/supabase/server";
import { getTenantContext } from "@/app/_lib/tenancy";
import { requireWorkspaceMember } from "@/app/_lib/tenancy/guards";
import { revalidatePath } from "next/cache";
import { z } from "zod";

/**
 * Input schema for updating project dates
 */
const UpdateDatesSchema = z.object({
  startDate: z.string().datetime().optional(),
  deadline: z.string().datetime().optional(),
});

export type UpdateProjectDatesInput = z.infer<typeof UpdateDatesSchema>;

/**
 * Update a project's start date and/or deadline
 * Used by the Timeline view for drag-and-drop date changes
 */
export async function updateProjectDates(
  projectId: string,
  input: UpdateProjectDatesInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const { context } = await getTenantContext();
    const workspace = requireWorkspaceMember(context);
    const supabase = await createClient();

    // Validate input
    const parsed = UpdateDatesSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: "Invalid date format" };
    }

    const { startDate, deadline } = parsed.data;

    // Verify project belongs to this workspace
    const { data: project } = await supabase
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .eq("studio_id", workspace.id)
      .single();

    if (!project) {
      return { success: false, error: "Project not found" };
    }

    // Build update object
    const updates: Record<string, string | null> = {};
    if (startDate !== undefined) {
      updates.start_date = startDate;
    }
    if (deadline !== undefined) {
      updates.deadline = deadline;
    }

    if (Object.keys(updates).length === 0) {
      return { success: false, error: "No dates provided" };
    }

    // Update project dates
    const { error: updateError } = await supabase
      .from("projects")
      .update(updates)
      .eq("id", projectId);

    if (updateError) {
      console.error("Error updating project dates:", updateError);
      return { success: false, error: "Failed to update project dates" };
    }

    revalidatePath("/studio/projects");
    revalidatePath(`/studio/projects/${projectId}`);

    return { success: true };
  } catch (error) {
    console.error("Unexpected error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}
