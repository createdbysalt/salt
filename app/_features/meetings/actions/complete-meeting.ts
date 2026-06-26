"use server";

import { createClient } from "@/app/_lib/supabase/server";
import { getTenantContext } from "@/app/_lib/tenancy";
import { requireWorkspaceMember } from "@/app/_lib/tenancy/guards";
import { revalidatePath } from "next/cache";
import { recomputeRelationshipHealthForClient } from "@/app/_features/people/health/recompute";
import { recomputeOrgHealthForClient } from "@/app/_features/orgs/health/recompute";

/**
 * Mark a meeting as completed and optionally update last_contact_at for the client.
 */
export async function completeMeeting(meetingId: string, notes?: string) {
  try {
    const { context } = await getTenantContext();
    const workspace = requireWorkspaceMember(context);
    const supabase = await createClient();

    // Verify meeting belongs to this workspace
    const { data: meeting } = await supabase
      .from("client_meetings")
      .select("id, workspace_id, client_id, project_id")
      .eq("id", meetingId)
      .eq("workspace_id", workspace.id)
      .single();

    if (!meeting) {
      return { error: "Meeting not found" };
    }

    // Update meeting status
    const { error: updateError } = await supabase
      .from("client_meetings")
      .update({
        status: "completed",
        notes: notes || null,
      })
      .eq("id", meetingId);

    if (updateError) {
      console.error("Error completing meeting:", updateError);
      return { error: "Failed to complete meeting" };
    }

    // Update client's last_contact_at for health score
    await supabase
      .from("clients")
      .update({ last_contact_at: new Date().toISOString() })
      .eq("id", meeting.client_id);

    revalidatePath("/meetings");
    revalidatePath(`/people/${meeting.client_id}`);
    if (meeting.project_id) {
      revalidatePath("/work");
    }

    recomputeRelationshipHealthForClient(meeting.client_id as string);
    recomputeOrgHealthForClient(meeting.client_id as string);

    return { success: true };
  } catch (error) {
    console.error("Unexpected error:", error);
    return { error: "An unexpected error occurred" };
  }
}

