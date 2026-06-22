"use server";

import { createClient } from "@/app/_lib/supabase/server";
import { getTenantContext } from "@/app/_lib/tenancy";
import { requireWorkspaceMember } from "@/app/_lib/tenancy/guards";

export type MeetingStatus = "scheduled" | "completed" | "cancelled" | "no-show";
export type MeetingType = "discovery" | "check-in" | "review" | "kickoff" | "other";

export interface Meeting {
  id: string;
  title: string;
  type: MeetingType | null;
  status: MeetingStatus;
  clientName: string;
  clientId: string;
  projectName?: string;
  projectId?: string;
  startTime: Date;
  endTime: Date;
  location: string;
  meetingUrl?: string;
  attendees: Array<{
    name: string;
    role: "client" | "team";
  }>;
  agenda?: string;
  notes?: string;
}

/**
 * Fetch meetings for a studio within a time range.
 * Used for Today/Week/Month/Agenda views.
 */
export async function getMeetings(options: {
  startDate?: Date;
  endDate?: Date;
  clientId?: string;
  projectId?: string;
  status?: MeetingStatus;
}): Promise<Meeting[]> {
  try {
    const { context } = await getTenantContext();
    const workspace = requireWorkspaceMember(context);
    const supabase = await createClient();

    let query = supabase
      .from("client_meetings")
      .select(
        `
        *,
        client:clients!inner(id, name),
        project:projects(id, name)
      `
      )
      .eq("studio_id", workspace.id)
      .order("start_time", { ascending: true });

    // Apply time range filters
    if (options.startDate) {
      query = query.gte("start_time", options.startDate.toISOString());
    }
    if (options.endDate) {
      query = query.lte("start_time", options.endDate.toISOString());
    }

    // Apply entity filters
    if (options.clientId) {
      query = query.eq("client_id", options.clientId);
    }
    if (options.projectId) {
      query = query.eq("project_id", options.projectId);
    }
    if (options.status) {
      query = query.eq("status", options.status);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching meetings:", error);
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
    console.log("Meetings not available yet (table may not exist)");
    return [];
  }
}

