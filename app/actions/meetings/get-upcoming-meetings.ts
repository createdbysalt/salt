"use server";

import { createClient } from "@/app/_lib/supabase/server";
import { getTenantContext } from "@/app/_lib/tenancy";
import { requireStudioMember } from "@/app/_lib/tenancy/guards";
import type { Meeting } from "./get-meetings";

/**
 * Get the next N upcoming meetings for the "This Week's Meetings" widget.
 * Returns meetings that are scheduled or upcoming (not completed/cancelled).
 */
export async function getUpcomingMeetings(limit: number = 5): Promise<Meeting[]> {
  try {
    const { context } = await getTenantContext();
    const studio = requireStudioMember(context);
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("client_meetings")
      .select(
        `
        *,
        client:clients!inner(id, name),
        project:projects(id, name)
      `
      )
      .eq("studio_id", studio.id)
      .gte("start_time", new Date().toISOString())
      .in("status", ["scheduled"])
      .order("start_time", { ascending: true })
      .limit(limit);

    if (error) {
      console.error("Error fetching upcoming meetings:", error);
      // Return empty array instead of throwing - table may not exist yet
      return [];
    }

    return (data || []).map((meeting: any) => ({
      id: meeting.id,
      title: meeting.title,
      type: meeting.meeting_type,
      status: meeting.status,
      clientName: meeting.client.name,
      clientId: meeting.client.id,
      projectName: meeting.project?.name,
      projectId: meeting.project?.id,
      startTime: new Date(meeting.start_time),
      endTime: new Date(meeting.end_time),
      location: meeting.location_type,
      meetingUrl: meeting.meeting_url,
      attendees: (meeting.attendees || []) as Array<{ name: string; role: "client" | "team" }>,
      agenda: meeting.description,
      notes: meeting.notes,
    }));
  } catch (error) {
    // Catch any errors (like table not existing) and return empty array
    console.log("Upcoming meetings not available yet (table may not exist)");
    return [];
  }
}

