"use server";

import { createClient } from "@/app/_lib/supabase/server";
import { getTenantContext } from "@/app/_lib/tenancy";
import { requireWorkspaceMember } from "@/app/_lib/tenancy/guards";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  type MilestoneTemplateKey,
  generateMilestonesFromTemplate,
  milestoneTemplates,
} from "@/app/_lib/milestone-templates";

const applyTemplateSchema = z.object({
  project_id: z.string().uuid(),
  template_key: z.enum(["website", "brand", "content", "simple"]),
  start_date: z.string().datetime(),
});

export type ApplyMilestoneTemplateInput = z.infer<typeof applyTemplateSchema>;

export async function applyMilestoneTemplate(data: ApplyMilestoneTemplateInput) {
  try {
    const { context } = await getTenantContext();
    const workspace = requireWorkspaceMember(context);
    const supabase = await createClient();

    // Validate input
    const validatedData = applyTemplateSchema.parse(data);

    // Verify project belongs to this workspace
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, name")
      .eq("id", validatedData.project_id)
      .eq("studio_id", workspace.id)
      .single();

    if (projectError || !project) {
      return { error: "Project not found" };
    }

    // Verify template exists
    if (!(validatedData.template_key in milestoneTemplates)) {
      return { error: "Invalid template" };
    }

    // Generate milestone data from template
    const startDate = new Date(validatedData.start_date);
    const milestonesData = generateMilestonesFromTemplate(
      validatedData.template_key as MilestoneTemplateKey,
      startDate
    );

    // Get current max order_index to append after existing milestones
    const { count: existingCount } = await supabase
      .from("project_milestones")
      .select("id", { count: "exact", head: true })
      .eq("project_id", validatedData.project_id);

    const startIndex = existingCount || 0;

    // Prepare milestones for insertion with adjusted order indices
    const milestonesToInsert = milestonesData.map((milestone, index) => ({
      project_id: validatedData.project_id,
      studio_id: workspace.id,
      title: milestone.title,
      description: milestone.description,
      due_at: milestone.due_at,
      order_index: startIndex + index,
      client_visible: milestone.client_visible,
      status: milestone.status,
    }));

    // Insert all milestones in a single transaction
    const { data: createdMilestones, error: insertError } = await supabase
      .from("project_milestones")
      .insert(milestonesToInsert)
      .select();

    if (insertError) {
      console.error("Error applying milestone template:", insertError);
      return { error: "Failed to create milestones from template" };
    }

    revalidatePath("/work");

    return {
      success: true,
      milestones: createdMilestones,
      count: createdMilestones?.length || 0,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.errors[0].message };
    }
    console.error("Unexpected error:", error);
    return { error: "An unexpected error occurred" };
  }
}
