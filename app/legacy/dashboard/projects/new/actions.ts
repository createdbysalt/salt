"use server";

import { createClient } from "@/libs/supabase/server";
import { getTenantContext } from "@/libs/tenancy";
import { requireStudioMember } from "@/libs/tenancy/guards";
import { redirect } from "next/navigation";
import { z } from "zod";

const projectSchema = z.object({
  name: z.string().min(1, "Project name is required").max(100),
  slug: z.string().min(1, "Slug is required").max(50).regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and hyphens only"),
  client_id: z.string().uuid("Valid client required"),
  description: z.string().max(500).optional().or(z.literal("")),
  project_type: z.string().max(50).optional().or(z.literal("")),
  status: z.enum(["draft", "active", "on_hold", "completed", "archived"]),
});

export async function createProject(formData: FormData) {
  try {
    const { context } = await getTenantContext();
    const studio = requireStudioMember(context);
    const supabase = await createClient();
    
    // Validate form data
    const rawData = {
      name: formData.get("name") as string,
      slug: formData.get("slug") as string,
      client_id: formData.get("client_id") as string,
      description: formData.get("description") as string,
      project_type: formData.get("project_type") as string,
      status: (formData.get("status") as string) || "draft",
    };
    
    const validatedData = projectSchema.parse(rawData);
    
    // Verify client belongs to this studio
    const { data: client } = await supabase
      .from("clients")
      .select("id")
      .eq("id", validatedData.client_id)
      .eq("studio_id", studio.id)
      .single();
    
    if (!client) {
      return { error: "Invalid client selected" };
    }
    
    // Check if slug already exists for this client
    const { data: existingProject } = await supabase
      .from("projects")
      .select("id")
      .eq("client_id", validatedData.client_id)
      .eq("slug", validatedData.slug)
      .single();
    
    if (existingProject) {
      return { error: "A project with this slug already exists for this client" };
    }
    
    // Create project
    const { data: newProject, error: projectError } = await supabase
      .from("projects")
      .insert({
        studio_id: studio.id,
        client_id: validatedData.client_id,
        name: validatedData.name,
        slug: validatedData.slug,
        description: validatedData.description || null,
        project_type: validatedData.project_type || null,
        status: validatedData.status,
      })
      .select()
      .single();
    
    if (projectError) {
      console.error("Error creating project:", projectError);
      return { error: "Failed to create project" };
    }
    
    // Redirect to project detail page
    redirect(`/dashboard/projects/${newProject.id}`);
  } catch (error) {
    // Re-throw redirect errors (they're not actually errors, just Next.js navigation)
    if (error instanceof Error && error.message === "NEXT_REDIRECT") {
      throw error;
    }
    
    if (error instanceof z.ZodError) {
      return { error: error.errors[0].message };
    }
    console.error("Unexpected error:", error);
    return { error: "An unexpected error occurred" };
  }
}

