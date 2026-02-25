"use server";

import { createClient } from "@/app/_lib/supabase/server";
import { getTenantContext } from "@/app/_lib/tenancy";
import { requireStudioMember } from "@/app/_lib/tenancy/guards";
import { revalidatePath } from "next/cache";

/**
 * Archive (soft delete) a client.
 */
export async function archiveClient(clientId: string) {
  try {
    const { context } = await getTenantContext();
    const studio = requireStudioMember(context);
    const supabase = await createClient();

    // Verify client belongs to this studio
    const { data: client } = await supabase
      .from("clients")
      .select("id")
      .eq("id", clientId)
      .eq("studio_id", studio.id)
      .single();

    if (!client) {
      return { error: "Client not found" };
    }

    const archivedAt = new Date().toISOString();

    // Archive the client
    const { error: updateError } = await supabase
      .from("clients")
      .update({
        archived_at: archivedAt,
        status: "inactive",
      })
      .eq("id", clientId);

    if (updateError) {
      console.error("Error archiving client:", updateError);
      return { error: "Failed to archive client" };
    }

    // Also archive all projects belonging to this client
    const { error: projectsError } = await supabase
      .from("projects")
      .update({ archived_at: archivedAt })
      .eq("client_id", clientId)
      .is("archived_at", null) // Only archive if not already archived
      .is("deleted_at", null); // Don't touch deleted projects

    if (projectsError) {
      console.error("Error archiving client projects:", projectsError);
      // Don't fail the whole operation, client is already archived
    }

    revalidatePath("/studio/clients");
    revalidatePath("/studio/projects");

    return { success: true };
  } catch (error) {
    console.error("Unexpected error:", error);
    return { error: "An unexpected error occurred" };
  }
}

