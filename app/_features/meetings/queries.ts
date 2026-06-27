import "server-only";

import { cache } from "react";
import { getWorkspaceContext } from "@/app/_lib/utils/user-dashboard";

// ============================================================================
// Types
// ============================================================================

export type MeetingSource = {
  id: string;
  provider: string;
  kind: string;
  externalId?: string;
  sourceUrl?: string;
  importedAt: string;
};

export type MeetingSummaryRecord = {
  id: string;
  content: string;
  isCurrent: boolean;
  generatedBy?: string;
  createdAt: string;
};

export type MeetingDecisionRecord = {
  id: string;
  text: string;
  rationale?: string;
  createdAt: string;
};

export type MeetingActionItemRecord = {
  id: string;
  text: string;
  assignee?: string;
  assigneePersonId?: string;
  dueDate?: string;
  completed: boolean;
  completedAt?: string;
  priority?: "low" | "medium" | "high";
  context?: string;
  createdAt: string;
};

export type MeetingTranscriptRecord = {
  id: string;
  content?: string;
  segments?: Array<{
    speaker: { name: string; email?: string };
    text: string;
    startTime: number;
    endTime: number;
  }>;
  durationSeconds?: number;
  recordingUrl?: string;
  status: string;
  createdAt: string;
};

export type MeetingAttendee = {
  name: string;
  role: "client" | "team";
  email?: string;
};

export type MeetingDetailRecord = {
  id: string;
  workspaceId: string;
  clientId: string;
  projectId?: string;
  title: string;
  description?: string;
  meetingType?: string;
  startTime: string;
  endTime: string;
  locationType?: string;
  meetingUrl?: string;
  status: string;
  visibility: string;
  externalProvider?: string;
  origin?: string;
  attendees: MeetingAttendee[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
  // Joined relations
  client?: { id: string; name?: string };
  project?: { id: string; name?: string };
  person?: { id: string; name?: string; title?: string };
  org?: { id: string; name?: string };
};

export type MeetingDetailData = {
  meeting: MeetingDetailRecord | null;
  sources: MeetingSource[];
  summaries: MeetingSummaryRecord[];
  decisions: MeetingDecisionRecord[];
  actionItems: MeetingActionItemRecord[];
  transcript: MeetingTranscriptRecord | null;
};

// ============================================================================
// Query constants
// ============================================================================

const MEETING_SELECT = `
  *,
  clients:client_id(id, name),
  projects:project_id(id, name)
`;

// ============================================================================
// Row mappers
// ============================================================================

function mapMeetingRow(row: Record<string, unknown>): MeetingDetailRecord {
  const client = row.clients as { id: string; name?: string } | null;
  const project = row.projects as { id: string; name?: string } | null;

  return {
    id: row.id as string,
    workspaceId: row.workspace_id as string,
    clientId: row.client_id as string,
    projectId: row.project_id as string | undefined,
    title: row.title as string,
    description: row.description as string | undefined,
    meetingType: row.meeting_type as string | undefined,
    startTime: row.start_time as string,
    endTime: row.end_time as string,
    locationType: row.location_type as string | undefined,
    meetingUrl: row.meeting_url as string | undefined,
    status: row.status as string,
    visibility: row.visibility as string,
    externalProvider: row.external_provider as string | undefined,
    origin: row.origin as string | undefined,
    attendees: (row.attendees as MeetingAttendee[] | null) ?? [],
    notes: row.notes as string | undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    client: client ?? undefined,
    project: project ?? undefined,
  };
}

function mapSourceRow(row: Record<string, unknown>): MeetingSource {
  return {
    id: row.id as string,
    provider: row.provider as string,
    kind: row.kind as string,
    externalId: row.external_id as string | undefined,
    sourceUrl: row.source_url as string | undefined,
    importedAt: row.imported_at as string,
  };
}

function mapSummaryRow(row: Record<string, unknown>): MeetingSummaryRecord {
  return {
    id: row.id as string,
    content: row.content as string,
    isCurrent: row.is_current as boolean,
    generatedBy: row.generated_by as string | undefined,
    createdAt: row.created_at as string,
  };
}

function mapDecisionRow(row: Record<string, unknown>): MeetingDecisionRecord {
  return {
    id: row.id as string,
    text: row.text as string,
    rationale: row.rationale as string | undefined,
    createdAt: row.created_at as string,
  };
}

function mapActionItemRow(row: Record<string, unknown>): MeetingActionItemRecord {
  return {
    id: row.id as string,
    text: row.text as string,
    assignee: row.assignee as string | undefined,
    assigneePersonId: row.assignee_person_id as string | undefined,
    dueDate: row.due_date as string | undefined,
    completed: row.completed as boolean,
    completedAt: row.completed_at as string | undefined,
    priority: row.priority as "low" | "medium" | "high" | undefined,
    context: row.context as string | undefined,
    createdAt: row.created_at as string,
  };
}

function mapTranscriptRow(row: Record<string, unknown>): MeetingTranscriptRecord {
  return {
    id: row.id as string,
    content: row.content as string | undefined,
    segments: row.segments as MeetingTranscriptRecord["segments"] | undefined,
    durationSeconds: row.duration_seconds as number | undefined,
    recordingUrl: row.recording_url as string | undefined,
    status: row.status as string,
    createdAt: row.created_at as string,
  };
}

// ============================================================================
// Main query
// ============================================================================

export const getMeetingDetailData = cache(async (meetingId: string): Promise<MeetingDetailData> => {
  const { workspace, supabase } = await getWorkspaceContext();

  // Fetch meeting with relations
  const { data: meetingRow, error: meetingError } = await supabase
    .from("client_meetings")
    .select(MEETING_SELECT)
    .eq("workspace_id", workspace.id)
    .eq("id", meetingId)
    .maybeSingle();

  if (meetingError) {
    console.error("Error fetching meeting detail:", meetingError);
    throw meetingError;
  }

  if (!meetingRow) {
    return {
      meeting: null,
      sources: [],
      summaries: [],
      decisions: [],
      actionItems: [],
      transcript: null,
    };
  }

  const meeting = mapMeetingRow(meetingRow as Record<string, unknown>);

  // Fetch all related content in parallel
  const [sourcesResult, summariesResult, decisionsResult, actionItemsResult, transcriptResult] =
    await Promise.all([
      supabase
        .from("meeting_sources")
        .select("*")
        .eq("meeting_id", meetingId)
        .order("imported_at", { ascending: false }),
      supabase
        .from("meeting_summaries")
        .select("*")
        .eq("meeting_id", meetingId)
        .order("created_at", { ascending: false }),
      supabase
        .from("meeting_decisions")
        .select("*")
        .eq("meeting_id", meetingId)
        .order("created_at", { ascending: true }),
      supabase
        .from("meeting_action_items")
        .select("*")
        .eq("meeting_id", meetingId)
        .order("created_at", { ascending: true }),
      supabase
        .from("meeting_transcripts")
        .select("*")
        .eq("meeting_id", meetingId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  // Map results (gracefully handle missing tables during migration)
  const sources = (sourcesResult.data ?? []).map((r) => mapSourceRow(r as Record<string, unknown>));
  const summaries = (summariesResult.data ?? []).map((r) => mapSummaryRow(r as Record<string, unknown>));
  const decisions = (decisionsResult.data ?? []).map((r) => mapDecisionRow(r as Record<string, unknown>));
  const actionItems = (actionItemsResult.data ?? []).map((r) => mapActionItemRow(r as Record<string, unknown>));
  const transcript = transcriptResult.data
    ? mapTranscriptRow(transcriptResult.data as Record<string, unknown>)
    : null;

  return {
    meeting,
    sources,
    summaries,
    decisions,
    actionItems,
    transcript,
  };
});

// ============================================================================
// List queries (for the directory table)
// ============================================================================

export const getMeetings = cache(async (): Promise<MeetingDetailRecord[]> => {
  const { workspace, supabase } = await getWorkspaceContext();

  const { data, error } = await supabase
    .from("client_meetings")
    .select(MEETING_SELECT)
    .eq("workspace_id", workspace.id)
    .order("start_time", { ascending: false });

  if (error) {
    console.error("Error fetching meetings:", error);
    throw error;
  }

  return (data ?? []).map((r) => mapMeetingRow(r as Record<string, unknown>));
});

// ============================================================================
// Client list for AddMeetingSheet
// ============================================================================

export type ClientOption = {
  id: string;
  name: string;
};

export const getClientOptions = cache(async (): Promise<ClientOption[]> => {
  const { workspace, supabase } = await getWorkspaceContext();

  const { data, error } = await supabase
    .from("clients")
    .select("id, name")
    .eq("workspace_id", workspace.id)
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching client options:", error);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id as string,
    name: (row.name as string | null) ?? "Unnamed client",
  }));
});
