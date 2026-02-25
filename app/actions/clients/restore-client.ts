"use server";

import { createClient } from "@/app/_lib/supabase/server";
import { getTenantContext } from "@/app/_lib/tenancy";
import { requireStudioMember } from "@/app/_lib/tenancy/guards";
import { revalidatePath } from "next/cache";

/**
 * Restore a client from trash.
 */
export async function restoreClient(clientId: string) {
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

    // Get the client's delete date to find projects deleted at the same time
    const { data: clientData } = await supabase
      .from("clients")
      .select("deleted_at")
      .eq("id", clientId)
      .single();

    const clientDeletedAt = clientData?.deleted_at;

    // Clear deleted_at and deleted_by
    const { error: updateError } = await supabase
      .from("clients")
      .update({
        deleted_at: null,
        deleted_by: null,
      })
      .eq("id", clientId);

    if (updateError) {
      console.error("Error restoring client:", updateError);
      return { error: "Failed to restore client" };
    }

    // Also restore projects that were trashed at the same time as the client
    // This ensures we only restore projects that were trashed as part of client deletion
    if (clientDeletedAt) {
      const { error: projectsError } = await supabase
        .from("projects")
        .update({
          deleted_at: null,
          deleted_by: null,
        })
        .eq("client_id", clientId)
        .eq("deleted_at", clientDeletedAt); // Only restore if deleted at same time

      if (projectsError) {
        console.error("Error restoring client projects:", projectsError);
        // Don't fail the whole operation, client is already restored
      }
    }

    revalidatePath("/studio/clients");
    revalidatePath(`/studio/clients/${clientId}`);
    revalidatePath("/studio/projects");

    return { success: true };
  } catch (error) {
    console.error("Unexpected error:", error);
    return { error: "An unexpected error occurred" };
  }
}
