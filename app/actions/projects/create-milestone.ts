"use server";

import { createClient } from "@/libs/supabase/server";
import { getTenantContext } from "@/libs/tenancy";
import { requireStudioMember } from "@/libs/tenancy/guards";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const createMilestoneSchema = z.object({
  project_id: z.string().uuid(),
  title: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  due_at: z.string().datetime().optional(),
  client_visible: z.boolean().default(true),
  depends_on_milestone_id: z.string().uuid().optional(),
});

export async function createMilestone(data: z.infer<typeof createMilestoneSchema>) {
  try {
    const { context } = await getTenantContext();
    const studio = requireStudioMember(context);
    const supabase = await createClient();

    // Validate input
    const validatedData = createMilestoneSchema.parse(data);

    // Verify project belongs to this studio
    const { data: project } = await supabase
      .from("projects")
      .select("id, client_id")
      .eq("id", validatedData.project_id)
      .eq("studio_id", studio.id)
      .single();

    if (!project) {
      return { error: "Project not found" };
    }

    // Get next order_index (append to end)
    const { count } = await supabase
      .from("project_milestones")
      .select("id", { count: "exact", head: true })
      .eq("project_id", validatedData.project_id);

    const orderIndex = count || 0;

    // Create milestone
    const { data: milestone, error: milestoneError } = await supabase
      .from("project_milestones")
      .insert({
        project_id: validatedData.project_id,
        title: validatedData.title,
        description: validatedData.description || null,
        due_at: validatedData.due_at || null,
        client_visible: validatedData.client_visible,
        depends_on_milestone_id: validatedData.depends_on_milestone_id || null,
        order_index: orderIndex,
        status: "not_started",
      })
      .select()
      .single();

    if (milestoneError) {
      console.error("Error creating milestone:", milestoneError);
      return { error: "Failed to create milestone" };
    }

    revalidatePath(`/dashboard/projects/${validatedData.project_id}`);

    return { success: true, milestone };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.errors[0].message };
    }
    console.error("Unexpected error:", error);
    return { error: "An unexpected error occurred" };
  }
}

