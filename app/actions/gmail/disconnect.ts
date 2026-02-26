"use server";

import { createClient } from "@/app/_lib/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * Disconnect Gmail from studio
 */
export async function disconnectGmail(studioId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const { error } = await supabase
    .from("gmail_connections")
    .delete()
    .eq("user_id", user.id)
    .eq("studio_id", studioId);

  if (error) {
    console.error("Failed to disconnect Gmail:", error);
    return { success: false, error: "Failed to disconnect Gmail" };
  }

  revalidatePath("/settings/integrations");

  return { success: true };
}
