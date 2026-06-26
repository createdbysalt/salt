"use server";

import { createClient } from "@/app/_lib/supabase/server";
import { getTenantContext } from "@/app/_lib/tenancy";
import { requireWorkspaceMember } from "@/app/_lib/tenancy/guards";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const updateMeetingSchema = z.object({
  meeting_id: z.string().uuid(),
  title: z.string().min(1).max(255).optional(),
  start_time: z.string().datetime().optional(),
  end_time: z.string().datetime().optional(),
  location_type: z.enum(["google-meet", "zoom", "phone", "in-person", "custom"]).optional(),
  meeting_url: z.string().url().optional().or(z.literal("")),
  description: z.string().max(2000).optional(),
  visibility: z.enum(["internal", "shared_with_client"]).optional(),
  status: z.enum(["scheduled", "completed", "cancelled", "no-show"]).optional(),
  notes: z.string().max(5000).optional(),
});

export async function updateMeeting(data: z.infer<typeof updateMeetingSchema>) {
  try {
    const { context } = await getTenantContext();
    const workspace = requireWorkspaceMember(context);
    const supabase = await createClient();

    // Validate input
    const validatedData = updateMeetingSchema.parse(data);
    const { meeting_id, ...updates } = validatedData;

    // Verify meeting belongs to this workspace
    const { data: meeting } = await supabase
      .from("client_meetings")
      .select("id, workspace_id, client_id, project_id")
      .eq("id", meeting_id)
      .eq("workspace_id", workspace.id)
      .single();

    if (!meeting) {
      return { error: "Meeting not found" };
    }

    // Update meeting
    const { error: updateError } = await supabase
      .from("client_meetings")
      .update(updates)
      .eq("id", meeting_id);

    if (updateError) {
      console.error("Error updating meeting:", updateError);
      return { error: "Failed to update meeting" };
    }

    revalidatePath("/meetings");
    revalidatePath(`/meetings/${meeting_id}`);
    revalidatePath(`/people/${meeting.client_id}`);
    if (meeting.project_id) {
      revalidatePath("/work");
    }

    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.errors[0].message };
    }
    console.error("Unexpected error:", error);
    return { error: "An unexpected error occurred" };
  }
}

