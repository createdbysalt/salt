"use server";

import { createClient } from "@/app/_lib/supabase/server";
import { getTenantContext } from "@/app/_lib/tenancy";
import { requireWorkspaceMember } from "@/app/_lib/tenancy/guards";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { validateRecordName } from "@/app/_features/memory/utils/record-name";

const updateMeetingSchema = z.object({
  meeting_id: z.string().uuid(),
  title: z.string().min(1).max(255).optional(),
  meeting_type: z
    .enum(["discovery", "kickoff", "check-in", "review", "presentation", "workshop", "interview", "other", ""])
    .optional(),
  start_time: z.string().datetime().optional(),
  end_time: z.string().datetime().optional(),
  location_type: z
    .enum(["google-meet", "zoom", "phone", "in-person", "custom", ""])
    .optional(),
  meeting_url: z.string().url().optional().or(z.literal("")),
  description: z.string().max(2000).optional(),
  visibility: z.enum(["internal", "shared_with_client"]).optional(),
  status: z.enum(["scheduled", "completed", "cancelled", "no-show"]).optional(),
  notes: z.string().max(5000).optional(),
  address: z.string().max(500).nullable().optional(),
  phone_number: z.string().max(50).nullable().optional(),
  attendees: z
    .array(
      z.object({
        name: z.string().max(200),
        email: z.string().max(320).optional(),
        role: z.enum(["client", "team"]).optional(),
      }),
    )
    .max(100)
    .nullable()
    .optional(),
});

export async function updateMeeting(data: z.infer<typeof updateMeetingSchema>) {
  try {
    const { context } = await getTenantContext();
    const workspace = requireWorkspaceMember(context);
    const supabase = await createClient();

    // Validate input
    const validatedData = updateMeetingSchema.parse(data);
    const { meeting_id, ...updates } = validatedData;

    if (updates.title !== undefined) {
      const validatedTitle = validateRecordName(updates.title);
      if (!validatedTitle.ok) {
        return { error: validatedTitle.message };
      }
      updates.title = validatedTitle.name;
    }

    // Verify meeting belongs to this workspace
    const { data: meeting } = await supabase
      .from("meetings")
      .select("id, workspace_id, person_id, work_id")
      .eq("id", meeting_id)
      .eq("workspace_id", workspace.id)
      .single();

    if (!meeting) {
      return { error: "Meeting not found" };
    }

    // Update meeting — select back the row so an RLS-blocked 0-row update
    // fails loudly instead of reporting success (silent no-op class).
    const { data: updatedRows, error: updateError } = await supabase
      .from("meetings")
      .update(updates)
      .eq("id", meeting_id)
      .eq("workspace_id", workspace.id)
      .select("id");

    if (updateError) {
      console.error("Error updating meeting:", updateError);
      return { error: "Failed to update meeting" };
    }

    if (!updatedRows || updatedRows.length === 0) {
      console.error("Meeting update affected 0 rows (RLS?):", meeting_id);
      return { error: "Could not save — the change did not persist" };
    }

    revalidatePath("/meetings");
    revalidatePath(`/meetings/${meeting_id}`);
    if (meeting.person_id) {
      revalidatePath(`/people/${meeting.person_id}`);
    }
    if (meeting.work_id) {
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

const ALLOWED_FIELDS = [
  "title",
  "meeting_type",
  "start_time",
  "end_time",
  "location_type",
  "meeting_url",
  "description",
  "visibility",
  "status",
  "notes",
  "address",
  "phone_number",
  "attendees",
] as const;

type AllowedField = (typeof ALLOWED_FIELDS)[number];

export async function updateMeetingField(
  meetingId: string,
  field: string,
  value: string | Array<{ name: string; email?: string; role?: "client" | "team" }> | null,
) {
  if (!ALLOWED_FIELDS.includes(field as AllowedField)) {
    return { error: `Invalid field: ${field}` };
  }

  const updateData: Record<string, unknown> = {
    meeting_id: meetingId,
    [field]: value === "" ? null : value,
  };

  return updateMeeting(updateData as z.infer<typeof updateMeetingSchema>);
}
