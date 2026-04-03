"use server";

import { createClient } from "@/app/_lib/supabase/server";
import { getTenantContext } from "@/app/_lib/tenancy";
import { revalidatePath } from "next/cache";

// ============================================================================
// Dismiss Announcement
// ============================================================================

interface DismissResult {
  success: boolean;
  error?: string;
}

/**
 * Dismiss an announcement for the current client user.
 * Sets dismissed_at on the announcement.
 */
export async function dismissAnnouncement(
  announcementId: string
): Promise<DismissResult> {
  try {
    const { context } = await getTenantContext();

    if (!context.userId || !context.client?.id) {
      return { success: false, error: "Not authenticated" };
    }

    const supabase = await createClient();

    // Verify the announcement belongs to this client's studio
    const { data: announcement, error: fetchError } = await supabase
      .from("client_announcements")
      .select("id, client_id, studio_id")
      .eq("id", announcementId)
      .single();

    if (fetchError || !announcement) {
      return { success: false, error: "Announcement not found" };
    }

    // Check if this announcement is for this client or is a studio default
    // that applies to this client
    const isClientSpecific = announcement.client_id === context.client.id;
    const isStudioDefault = announcement.client_id === null;

    if (!isClientSpecific && !isStudioDefault) {
      return { success: false, error: "Unauthorized" };
    }

    // For studio defaults, we can't actually dismiss for just one client
    // without creating a client-specific record. For now, we just hide it
    // in localStorage on the client side. Only client-specific messages
    // can be permanently dismissed via the database.
    if (isStudioDefault) {
      // Studio defaults can't be dismissed per-client via DB
      // The frontend will handle this with localStorage
      return { success: true };
    }

    // Dismiss the client-specific announcement
    const { error: updateError } = await supabase
      .from("client_announcements")
      .update({ dismissed_at: new Date().toISOString() })
      .eq("id", announcementId);

    if (updateError) {
      console.error("Error dismissing announcement:", updateError);
      return { success: false, error: updateError.message };
    }

    revalidatePath("/bridge");
    return { success: true };
  } catch (error) {
    console.error("Error in dismissAnnouncement:", error);
    return { success: false, error: "Failed to dismiss announcement" };
  }
}
