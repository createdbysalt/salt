"use server";

import { createClient } from "@/app/_lib/supabase/server";
import { getTenantContext } from "@/app/_lib/tenancy";
import { requireWorkspaceMember } from "@/app/_lib/tenancy/guards";
import { revalidatePath } from "next/cache";

/**
 * Valid project statuses for the board view
 */
const validStatuses = [
  "not_started",
  "in_progress",
  "review",
  "complete",
  "on_hold",
] as const;

type ProjectStatus = (typeof validStatuses)[number];

/**
 * Update a project's status
 * Used by the Board view for drag-and-drop status changes
 */
export async function updateProjectStatus(
  projectId: string,
  status: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { context } = await getTenantContext();
    const workspace = requireWorkspaceMember(context);
    const supabase = await createClient();

    // Validate status
    if (!validStatuses.includes(status as ProjectStatus)) {
      return { success: false, error: "Invalid project status" };
    }

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

    // Update project status
    const { error: updateError } = await supabase
      .from("projects")
      .update({ status })
      .eq("id", projectId);

    if (updateError) {
      console.error("Error updating project status:", updateError);
      return { success: false, error: "Failed to update project status" };
    }

    revalidatePath("/studio/projects");
    revalidatePath(`/studio/projects/${projectId}`);

    return { success: true };
  } catch (error) {
    console.error("Unexpected error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}
