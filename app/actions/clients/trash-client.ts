"use server";

import { createClient } from "@/app/_lib/supabase/server";
import { getTenantContext } from "@/app/_lib/tenancy";
import { requireStudioMember } from "@/app/_lib/tenancy/guards";
import { revalidatePath } from "next/cache";

/**
 * Move a client to trash (soft delete).
 */
export async function trashClient(clientId: string) {
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

    // Set deleted_at and deleted_by
    const { error: updateError } = await supabase
      .from("clients")
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: context.userId,
      })
      .eq("id", clientId);

    if (updateError) {
      console.error("Error trashing client:", updateError);
      return { error: "Failed to move client to trash" };
    }

    revalidatePath("/studio/clients");
    revalidatePath(`/studio/clients/${clientId}`);

    return { success: true };
  } catch (error) {
    console.error("Unexpected error:", error);
    return { error: "An unexpected error occurred" };
  }
}
