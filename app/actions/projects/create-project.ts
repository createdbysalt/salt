"use server";

import { createClient } from "@/app/_lib/supabase/server";
import { getTenantContext } from "@/app/_lib/tenancy";
import { requireStudioMember } from "@/app/_lib/tenancy/guards";
import { revalidatePath } from "next/cache";
import { z } from "zod";

export type ProjectIntent = "one-time" | "retainer" | "quick";

const createProjectSchema = z.object({
  intent: z.enum(["one-time", "retainer", "quick"]),
  name: z.string().min(1, "Project name is required").max(100),
  clientId: z.string().uuid("Valid client required"),
  description: z.string().max(500).optional(),
  status: z.enum(["draft", "signed", "active", "on_hold", "completed", "archived"]).default("draft"),
  // One-time fields
  startDate: z.string().optional(),
  deadline: z.string().optional(),
  totalValue: z.number().positive().optional(),
  // Retainer fields
  monthlyAmount: z.number().positive().optional(),
  includedHours: z.number().positive().optional(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export async function createProjectWithIntent(
  data: CreateProjectInput
): Promise<{ success: boolean; error?: string; projectId?: string }> {
  try {
    const { context } = await getTenantContext();
    const studio = requireStudioMember(context);
    const supabase = await createClient();

    // Validate input
    const validatedData = createProjectSchema.parse(data);

    // Verify client belongs to this studio and is active
    const { data: client } = await supabase
      .from("clients")
      .select("id, name")
      .eq("id", validatedData.clientId)
      .eq("studio_id", studio.id)
      .is("deleted_at", null)
      .single();

    if (!client) {
      return { success: false, error: "Invalid client selected" };
    }

    // Generate slug from name
    const baseSlug = validatedData.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    // Check if slug already exists for this client and make unique if needed
    let slug = baseSlug;
    let slugSuffix = 1;

    while (true) {
      const { data: existingProject } = await supabase
        .from("projects")
        .select("id")
        .eq("client_id", validatedData.clientId)
        .eq("slug", slug)
        .single();

      if (!existingProject) break;

      slug = `${baseSlug}-${slugSuffix}`;
      slugSuffix++;

      if (slugSuffix > 100) {
        return { success: false, error: "Could not generate unique slug" };
      }
    }

    // Build metadata based on intent
    const metadata: Record<string, any> = {};

    if (validatedData.intent === "one-time" && validatedData.totalValue) {
      metadata.total_value = validatedData.totalValue;
    }

    if (validatedData.intent === "retainer") {
      if (validatedData.includedHours) {
        metadata.included_hours = validatedData.includedHours;
      }
      metadata.used_hours = 0;
    }

    // Create project
    const { data: newProject, error: projectError } = await supabase
      .from("projects")
      .insert({
        studio_id: studio.id,
        client_id: validatedData.clientId,
        name: validatedData.name,
        slug,
        description: validatedData.description || null,
        status: validatedData.status,
        start_date: validatedData.startDate || null,
        deadline: validatedData.deadline || null,
        metadata: Object.keys(metadata).length > 0 ? metadata : null,
        stage_entered_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (projectError) {
      console.error("[createProjectWithIntent] Error:", projectError);
      return { success: false, error: projectError.message };
    }

    // Revalidate paths
    revalidatePath("/studio/projects");
    revalidatePath(`/studio/clients/${validatedData.clientId}`);

    return { success: true, projectId: newProject.id };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    console.error("[createProjectWithIntent] Unexpected error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

// Query to get clients for the select dropdown
export async function getClientsForSelect(): Promise<{ id: string; name: string }[]> {
  try {
    const { context } = await getTenantContext();
    const studio = requireStudioMember(context);
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("clients")
      .select("id, name")
      .eq("studio_id", studio.id)
      .is("deleted_at", null)
      .not("lifecycle_stage", "in", "(lost)")
      .order("name");

    if (error) {
      console.error("[getClientsForSelect] Error:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("[getClientsForSelect] Error:", error);
    return [];
  }
}
