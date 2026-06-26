"use server";

import { createClient } from "@/app/_lib/supabase/server";
import { getTenantContext } from "@/app/_lib/tenancy";
import { requireWorkspaceMember } from "@/app/_lib/tenancy/guards";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { recomputeRelationshipHealthForClient } from "@/app/_features/people/health/recompute";
import { recomputeOrgHealthForClient } from "@/app/_features/orgs/health/recompute";

const createMeetingSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  client_id: z.string().uuid("Valid client required"),
  project_id: z.string().uuid().optional(),
  meeting_type: z.enum(["discovery", "check-in", "review", "kickoff", "other"]),
  start_time: z.string().datetime(),
  end_time: z.string().datetime(),
  location_type: z.enum(["google-meet", "zoom", "phone", "in-person", "custom"]),
  meeting_url: z.string().url().optional().or(z.literal("")),
  description: z.string().max(2000).optional(),
  visibility: z.enum(["internal", "shared_with_client"]).default("shared_with_client"),
  attendees: z.array(z.object({
    name: z.string(),
    role: z.enum(["client", "team"]),
  })).default([]),
});

export async function createMeeting(data: z.infer<typeof createMeetingSchema>) {
  try {
    const { context } = await getTenantContext();
    const workspace = requireWorkspaceMember(context);
    const supabase = await createClient();

    // Validate input
    const validatedData = createMeetingSchema.parse(data);

    // Verify client belongs to this workspace
    const { data: client } = await supabase
      .from("clients")
      .select("id")
      .eq("id", validatedData.client_id)
      .eq("workspace_id", workspace.id)
      .single();

    if (!client) {
      return { error: "Invalid client selected" };
    }

    // If project_id provided, verify it belongs to this client
    if (validatedData.project_id) {
      const { data: project } = await supabase
        .from("projects")
        .select("id")
        .eq("id", validatedData.project_id)
        .eq("client_id", validatedData.client_id)
        .eq("workspace_id", workspace.id)
        .single();

      if (!project) {
        return { error: "Invalid project selected" };
      }
    }

    // Check for time overlap (optional warning)
    const { data: overlaps } = await supabase
      .from("client_meetings")
      .select("id, title")
      .eq("workspace_id", workspace.id)
      .or(`start_time.lte.${validatedData.end_time},end_time.gte.${validatedData.start_time}`)
      .neq("status", "cancelled")
      .limit(1);

    if (overlaps && overlaps.length > 0) {
      // Warning but not blocking
      console.warn(`Meeting overlaps with existing meeting: ${overlaps[0].title}`);
    }

    // Create meeting
    const { data: meeting, error: meetingError } = await supabase
      .from("client_meetings")
      .insert({
        workspace_id: workspace.id,
        client_id: validatedData.client_id,
        project_id: validatedData.project_id || null,
        title: validatedData.title,
        description: validatedData.description || null,
        meeting_type: validatedData.meeting_type,
        start_time: validatedData.start_time,
        end_time: validatedData.end_time,
        location_type: validatedData.location_type,
        meeting_url: validatedData.meeting_url || null,
        status: "scheduled",
        visibility: validatedData.visibility,
        origin: "internal",
        attendees: validatedData.attendees,
      })
      .select()
      .single();

    if (meetingError) {
      console.error("Error creating meeting:", meetingError);
      return { error: "Failed to create meeting" };
    }

    revalidatePath("/meetings");
    revalidatePath(`/people/${validatedData.client_id}`);
    if (validatedData.project_id) {
      revalidatePath("/work");
    }

    recomputeRelationshipHealthForClient(validatedData.client_id);
    recomputeOrgHealthForClient(validatedData.client_id);

    return { success: true, meeting };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.errors[0].message };
    }
    console.error("Unexpected error:", error);
    return { error: "An unexpected error occurred" };
  }
}

