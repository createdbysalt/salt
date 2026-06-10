"use server";

import { createClient } from "@/app/_lib/supabase/server";
import { getTenantContext } from "@/app/_lib/tenancy";
import { requireWorkspaceMember } from "@/app/_lib/tenancy/guards";
import { revalidatePath } from "next/cache";

/**
 * Move a client to trash (soft delete).
 */
export async function trashClient(clientId: string) {
  try {
    const { context } = await getTenantContext();
    const workspace = requireWorkspaceMember(context);
    const supabase = await createClient();

    // Verify client belongs to this workspace.
    const { data: client } = await supabase
      .from("clients")
      .select("id")
      .eq("id", clientId)
      .eq("studio_id", workspace.id)
      .single();

    if (!client) {
      return { error: "Client not found" };
    }

    const deletedAt = new Date().toISOString();

    // Set deleted_at and deleted_by
    const { error: updateError } = await supabase
      .from("clients")
      .update({
        deleted_at: deletedAt,
        deleted_by: context.userId,
      })
      .eq("id", clientId);

    if (updateError) {
      console.error("Error trashing client:", updateError);
      return { error: "Failed to move client to trash" };
    }

    // Also trash all projects belonging to this client
    const { error: projectsError } = await supabase
      .from("projects")
      .update({
        deleted_at: deletedAt,
        deleted_by: context.userId,
      })
      .eq("client_id", clientId)
      .is("deleted_at", null); // Only trash if not already trashed

    if (projectsError) {
      console.error("Error trashing client projects:", projectsError);
      // Don't fail the whole operation, client is already trashed
    }

    revalidatePath("/people");
    revalidatePath(`/people/${clientId}`);
    revalidatePath("/studio/projects");

    return { success: true };
  } catch (error) {
    console.error("Unexpected error:", error);
    return { error: "An unexpected error occurred" };
  }
}
