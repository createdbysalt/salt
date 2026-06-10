"use server";

import { createClient } from "@/app/_lib/supabase/server";
import { getTenantContext } from "@/app/_lib/tenancy";
import { requireWorkspaceMember } from "@/app/_lib/tenancy/guards";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const updateMilestoneSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).optional().nullable(),
  due_at: z.string().datetime().optional().nullable(),
  status: z.enum(["not_started", "in_progress", "complete"]).optional(),
  client_visible: z.boolean().optional(),
  depends_on_milestone_id: z.string().uuid().optional().nullable(),
});

export type UpdateMilestoneInput = z.infer<typeof updateMilestoneSchema>;

export async function updateMilestone(data: UpdateMilestoneInput) {
  try {
    const { context } = await getTenantContext();
    const workspace = requireWorkspaceMember(context);
    const supabase = await createClient();

    // Validate input
    const validatedData = updateMilestoneSchema.parse(data);

    // Extract id and update fields
    const { id, ...updateFields } = validatedData;

    // Remove undefined fields (only update what's provided)
    const fieldsToUpdate = Object.fromEntries(
      Object.entries(updateFields).filter(([, value]) => value !== undefined)
    );

    if (Object.keys(fieldsToUpdate).length === 0) {
      return { error: "No fields to update" };
    }

    // Verify milestone belongs to this workspace and get project_id
    const { data: existingMilestone, error: fetchError } = await supabase
      .from("project_milestones")
      .select("id, project_id, status")
      .eq("id", id)
      .eq("studio_id", workspace.id)
      .single();

    if (fetchError || !existingMilestone) {
      return { error: "Milestone not found" };
    }

    // If status is changing to complete, set completed_at
    if (fieldsToUpdate.status === "complete" && existingMilestone.status !== "complete") {
      (fieldsToUpdate as Record<string, unknown>).completed_at = new Date().toISOString();
    }
    // If status is changing from complete to something else, clear completed_at
    else if (fieldsToUpdate.status && fieldsToUpdate.status !== "complete" && existingMilestone.status === "complete") {
      (fieldsToUpdate as Record<string, unknown>).completed_at = null;
    }

    // Update milestone
    const { data: milestone, error: updateError } = await supabase
      .from("project_milestones")
      .update(fieldsToUpdate)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating milestone:", updateError);
      return { error: "Failed to update milestone" };
    }

    revalidatePath("/work");

    return { success: true, milestone };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.errors[0].message };
    }
    console.error("Unexpected error:", error);
    return { error: "An unexpected error occurred" };
  }
}
