"use server";

import { createClient } from "@/app/_lib/supabase/server";
import { getTenantContext } from "@/app/_lib/tenancy";
import { requireStudioMember } from "@/app/_lib/tenancy/guards";
import { revalidatePath } from "next/cache";

/**
 * Unarchive a client (restore from archive).
 */
export async function unarchiveClient(clientId: string) {
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

    // Get the client's archive date to find projects archived at the same time
    const { data: clientData } = await supabase
      .from("clients")
      .select("archived_at")
      .eq("id", clientId)
      .single();

    const clientArchivedAt = clientData?.archived_at;

    // Clear archived_at and set status back to active
    const { error: updateError } = await supabase
      .from("clients")
      .update({
        archived_at: null,
        status: "active",
      })
      .eq("id", clientId);

    if (updateError) {
      console.error("Error unarchiving client:", updateError);
      return { error: "Failed to unarchive client" };
    }

    // Also unarchive projects that were archived at the same time as the client
    // This ensures we only restore projects that were archived as part of client archival
    if (clientArchivedAt) {
      const { error: projectsError } = await supabase
        .from("projects")
        .update({ archived_at: null })
        .eq("client_id", clientId)
        .eq("archived_at", clientArchivedAt) // Only unarchive if archived at same time
        .is("deleted_at", null); // Don't touch deleted projects

      if (projectsError) {
        console.error("Error unarchiving client projects:", projectsError);
        // Don't fail the whole operation, client is already unarchived
      }
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
