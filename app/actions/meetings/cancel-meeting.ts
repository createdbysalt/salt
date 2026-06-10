"use server";

import { createClient } from "@/app/_lib/supabase/server";
import { getTenantContext } from "@/app/_lib/tenancy";
import { requireWorkspaceMember } from "@/app/_lib/tenancy/guards";
import { revalidatePath } from "next/cache";

/**
 * Cancel a meeting.
 */
export async function cancelMeeting(meetingId: string, reason?: string) {
  try {
    const { context } = await getTenantContext();
    const workspace = requireWorkspaceMember(context);
    const supabase = await createClient();

    // Verify meeting belongs to this workspace
    const { data: meeting } = await supabase
      .from("client_meetings")
      .select("id, studio_id, client_id, project_id")
      .eq("id", meetingId)
      .eq("studio_id", workspace.id)
      .single();

    if (!meeting) {
      return { error: "Meeting not found" };
    }

    // Update meeting status
    const { error: updateError } = await supabase
      .from("client_meetings")
      .update({
        status: "cancelled",
        notes: reason ? `Cancelled: ${reason}` : "Cancelled",
      })
      .eq("id", meetingId);

    if (updateError) {
      console.error("Error cancelling meeting:", updateError);
      return { error: "Failed to cancel meeting" };
    }

    revalidatePath("/meetings");
    revalidatePath(`/people/${meeting.client_id}`);
    if (meeting.project_id) {
      revalidatePath("/work");
    }

    return { success: true };
  } catch (error) {
    console.error("Unexpected error:", error);
    return { error: "An unexpected error occurred" };
  }
}

