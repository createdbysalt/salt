"use server";

import { createClient } from "@/libs/supabase/server";
import { getTenantContext } from "@/libs/tenancy";
import { requireStudioMember } from "@/libs/tenancy/guards";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const reorderSchema = z.object({
  project_id: z.string().uuid(),
  milestone_ids: z.array(z.string().uuid()),
});

/**
 * Reorder milestones for a project.
 * milestone_ids should be in the desired order.
 */
export async function reorderMilestones(data: z.infer<typeof reorderSchema>) {
  try {
    const { context } = await getTenantContext();
    const studio = requireStudioMember(context);
    const supabase = await createClient();

    // Validate input
    const validatedData = reorderSchema.parse(data);

    // Verify project belongs to this studio
    const { data: project } = await supabase
      .from("projects")
      .select("id")
      .eq("id", validatedData.project_id)
      .eq("studio_id", studio.id)
      .single();

    if (!project) {
      return { error: "Project not found" };
    }

    // Update order_index for each milestone
    const updates = validatedData.milestone_ids.map((milestoneId, index) => ({
      id: milestoneId,
      order_index: index,
    }));

    for (const update of updates) {
      const { error } = await supabase
        .from("project_milestones")
        .update({ order_index: update.order_index })
        .eq("id", update.id)
        .eq("project_id", validatedData.project_id);

      if (error) {
        console.error("Error reordering milestone:", error);
        return { error: "Failed to reorder milestones" };
      }
    }

    revalidatePath(`/dashboard/projects/${validatedData.project_id}`);

    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.errors[0].message };
    }
    console.error("Unexpected error:", error);
    return { error: "An unexpected error occurred" };
  }
}

