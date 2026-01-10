"use server";

import { createClient } from "@/libs/supabase/server";
import { getTenantContext } from "@/libs/tenancy";
import { requireStudioMember } from "@/libs/tenancy/guards";
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

    // Set archived_at
    const { error: updateError } = await supabase
      .from("clients")
      .update({ 
        archived_at: new Date().toISOString(),
        status: "inactive",
      })
      .eq("id", clientId);

    if (updateError) {
      console.error("Error archiving client:", updateError);
      return { error: "Failed to archive client" };
    }

    revalidatePath("/dashboard/clients");

    return { success: true };
  } catch (error) {
    console.error("Unexpected error:", error);
    return { error: "An unexpected error occurred" };
  }
}

