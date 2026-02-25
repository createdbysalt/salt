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

    revalidatePath("/studio/clients");
    revalidatePath(`/studio/clients/${clientId}`);

    return { success: true };
  } catch (error) {
    console.error("Unexpected error:", error);
    return { error: "An unexpected error occurred" };
  }
}
