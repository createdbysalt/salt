"use server";

import { createClient } from "@/app/_lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const clientRequestSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  description: z.string().optional(),
  project_id: z.string().uuid().optional(),
});

/**
 * Submit a client request (creates a task with client_request source)
 */
export async function submitClientRequest(input: {
  title: string;
  description?: string;
  project_id?: string;
}) {
  try {
    const validated = clientRequestSchema.parse(input);
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Authentication required" };
    }

    // Get client membership to verify access and get studio_id
    const { data: clientUser } = await supabase
      .from("client_users")
      .select(
        `
        id,
        client_id,
        studio_id
      `
      )
      .eq("user_id", user.id)
      .single();

    if (!clientUser) {
      return { success: false, error: "Client access not found" };
    }

    // If project_id is provided, verify it belongs to the client
    if (validated.project_id) {
      const { data: project } = await supabase
        .from("projects")
        .select("id, client_id")
        .eq("id", validated.project_id)
        .single();

      if (!project || project.client_id !== clientUser.client_id) {
        return {
          success: false,
          error: "Project not found or does not belong to your organization",
        };
      }
    }

    // Create the task
    const { data, error } = await supabase
      .from("tasks")
      .insert({
        studio_id: clientUser.studio_id,
        client_id: clientUser.client_id,
        project_id: validated.project_id || null,
        title: validated.title,
        description: validated.description || null,
        priority: "medium",
        status: "open",
        source: "client_request",
        metadata: {},
      })
      .select()
      .single();

    if (error) {
      console.error("Error submitting client request:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/dashboard/tasks");
    return { success: true, data };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    console.error("Error submitting client request:", error);
    return { success: false, error: "Failed to submit request" };
  }
}




