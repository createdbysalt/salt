import "server-only";

import { cache } from "react";
import { getWorkspaceContext } from "@/app/_lib/utils/user-dashboard";
import type { ConnectionNode } from "@/app/_features/connections/types";
import type { LifecycleEventDisplay } from "@/app/_features/memory/queries/lifecycle-events";
import type { SourceHistoryEntry } from "@/app/_features/memory/queries/source-history";
import type { EntityNoteWithProvenance } from "@/app/_features/memory/types/taxonomies";
import type { ProfileActivityTimelineEntry } from "@/app/_features/people/utils/activity";

// ============================================================================
// Types
// ============================================================================

export type MeetingSource = {
  id: string;
  provider: string;
  kind: string;
  externalId?: string;
  sourceUrl?: string;
  displayName?: string;
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

export type MeetingAgendaItem = {
  id: string;
  title: string;
  notes: string;
  order: number;
};

export type MeetingDetailRecord = {
  id: string;
  workspaceId: string;
  projectId?: string;
  title: string;
  description?: string;
  meetingType?: string;
  startTime: string;
  endTime: string;
  locationType?: string;
  meetingUrl?: string;
  address?: string;
  phoneNumber?: string;
  status: string;
  visibility: string;
  externalProvider?: string;
  origin?: string;
  attendees: MeetingAttendee[];
  agenda: MeetingAgendaItem[] | null;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  // Joined relations
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
  // New fields for revamped detail page
  connections: ConnectionNode[];
  notes: EntityNoteWithProvenance[];
  activity: MeetingActivityEvent[];
  supplementalActivity: (ProfileActivityTimelineEntry | MeetingActivityEvent)[];
  lifecycleEvents: LifecycleEventDisplay[];
  sourceHistory: SourceHistoryEntry[];
};

// ============================================================================
// Query constants
// ============================================================================

const MEETING_SELECT = `
  *,
  people:person_id(id, name),
  organizations:organization_id(id, name),
  work:work_id(id, name)
`;

// ============================================================================
// Row mappers
// ============================================================================

function mapMeetingRow(row: Record<string, unknown>): MeetingDetailRecord {
  const person = row.people as { id: string; name?: string } | null;
  const org = row.organizations as { id: string; name?: string } | null;
  const project = row.work as { id: string; name?: string } | null;

  return {
    id: row.id as string,
    workspaceId: row.workspace_id as string,
    projectId: row.work_id as string | undefined,
    title: row.title as string,
    description: row.description as string | undefined,
    meetingType: row.meeting_type as string | undefined,
    startTime: row.start_time as string,
    endTime: row.end_time as string,
    locationType: row.location_type as string | undefined,
    meetingUrl: row.meeting_url as string | undefined,
    address: (row.address as string | null) ?? undefined,
    phoneNumber: (row.phone_number as string | null) ?? undefined,
    status: row.status as string,
    visibility: row.visibility as string,
    externalProvider: row.external_provider as string | undefined,
    origin: row.origin as string | undefined,
    attendees: (row.attendees as MeetingAttendee[] | null) ?? [],
    agenda: (row.agenda as MeetingAgendaItem[] | null) ?? null,
    notes: row.notes as string | undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    project: project ?? undefined,
    person: person ?? undefined,
    org: org ?? undefined,
  };
}

function mapSourceRow(row: Record<string, unknown>): MeetingSource {
  return {
    id: row.id as string,
    provider: row.provider as string,
    kind: row.kind as string,
    externalId: row.external_id as string | undefined,
    sourceUrl: row.source_url as string | undefined,
    displayName: row.display_name as string | undefined,
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
  const { getEntityLifecycleEvents } = await import("@/app/_features/memory/queries/lifecycle-events");
  const { getEntitySourceHistory } = await import("@/app/_features/memory/queries/source-history");
  const { getEntityNotes } = await import("@/app/_features/memory/queries/entity-notes");
  const { getEntityConnections } = await import("@/app/_features/connections/queries");

  const { workspace, supabase } = await getWorkspaceContext();

  // Fetch meeting with relations
  const { data: meetingRow, error: meetingError } = await supabase
    .from("meetings")
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
      connections: [],
      notes: [],
      activity: [],
      supplementalActivity: [],
      lifecycleEvents: [],
      sourceHistory: [],
    };
  }

  const meeting = mapMeetingRow(meetingRow as Record<string, unknown>);

  // Fetch all related content in parallel
  const [
    sourcesResult,
    summariesResult,
    decisionsResult,
    actionItemsResult,
    transcriptResult,
    connections,
    notes,
    lifecycleEvents,
    sourceHistory,
    activity,
    supplementalActivity,
  ] = await Promise.all([
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
    getEntityConnections(workspace.id, "meeting", meetingId),
    getEntityNotes("meeting", meetingId),
    getEntityLifecycleEvents("meeting" as "person" | "organization" | "work" | "billing", meetingId).catch(() => []),
    getEntitySourceHistory("meeting", meetingId).catch(() => []),
    getMeetingActivity(meetingId),
    getMeetingSupplementalActivity(meetingId),
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
    connections,
    notes,
    activity,
    supplementalActivity,
    lifecycleEvents,
    sourceHistory,
  };
});

// ============================================================================
// Meeting Activity
// ============================================================================

import {
  mapDecisionToActivityEntry,
  mapActionItemToActivityEntries,
  mapNoteToActivityEntry,
  mapConnectionToActivityEntry,
  mapSummaryToActivityEntry,
  mapMeetingCreationToActivityEntry,
  type ConnectionActivityInput,
  type MeetingActivityEvent,
} from "./utils/activity";
import {
  buildConnectionEntityNameMap,
  resolveConnectionEntityFromMap,
  UNRESOLVED_CONNECTION_LABEL,
  type EntityLinkRow,
} from "@/app/_features/memory/utils/resolve-connection-entities";

async function resolveConnectionActivityEntries(
  supabase: Awaited<ReturnType<typeof getWorkspaceContext>>["supabase"],
  rows: EntityLinkRow[],
  thisEntityType: string,
  thisEntityId: string,
): Promise<ProfileActivityTimelineEntry[]> {
  if (rows.length === 0) return [];

  const nameMap = await buildConnectionEntityNameMap(
    supabase,
    rows,
    thisEntityType,
    thisEntityId,
  );

  return rows.map((row) => {
    const isOutgoing =
      row.source_type === thisEntityType &&
      row.source_id === thisEntityId;
    const otherType = isOutgoing ? row.target_type : row.source_type;
    const otherId = isOutgoing ? row.target_id : row.source_id;
    const resolved = resolveConnectionEntityFromMap(nameMap, otherType, otherId);

    const input: ConnectionActivityInput = {
      id: row.id,
      fromEntityType: row.source_type,
      fromEntityId: row.source_id,
      toEntityType: row.target_type,
      toEntityId: row.target_id,
      relationType: row.relation_type,
      createdAt: row.created_at,
      createdBy: row.created_by,
      connectedEntityName: resolved?.name ?? UNRESOLVED_CONNECTION_LABEL,
      connectedEntityHref: resolved?.href,
    };

    return mapConnectionToActivityEntry(input, thisEntityType, thisEntityId);
  });
}

function mapNoteRowForActivity(row: Record<string, unknown>): EntityNoteWithProvenance {
  const authorType = (row.author_type as "user" | "salt") ?? "user";
  const createdAt = row.created_at as string;
  const content = (row.content as string) ?? "";
  const isPinned = (row.is_pinned as boolean) ?? false;
  const tags = (row.tags as string[] | null) ?? [];

  return {
    id: row.id as string,
    title: (row.title as string | null) ?? null,
    content,
    noteKind: (row.note_kind as EntityNoteWithProvenance["noteKind"]) ?? "general",
    source: (row.source as EntityNoteWithProvenance["source"]) ?? "manual",
    sourceRef: (row.source_ref as string | null) ?? null,
    confidence: (row.confidence as number | null) ?? null,
    status: (row.status as EntityNoteWithProvenance["status"]) ?? "confirmed",
    authorType,
    isPinned,
    tags,
    createdAt,
    author: authorType === "salt" ? "salt" : "you",
    at: createdAt,
    body: content,
    pinned: isPinned,
  };
}

/**
 * Fetches supplemental activity for meetings: connections, notes, etc.
 * Mirrors getWorkSupplementalActivity pattern.
 */
export const getMeetingSupplementalActivity = cache(
  async (meetingId: string): Promise<(ProfileActivityTimelineEntry | MeetingActivityEvent)[]> => {
    const { workspace, supabase } = await getWorkspaceContext();

    const [connectionRows, noteRows] = await Promise.all([
      supabase
        .from("entity_links")
        .select(
          "id, source_type, source_id, target_type, target_id, relation_type, created_at, created_by",
        )
        .eq("workspace_id", workspace.id)
        .or(
          `and(source_type.eq.meeting,source_id.eq.${meetingId}),and(target_type.eq.meeting,target_id.eq.${meetingId})`,
        )
        .order("created_at", { ascending: false }),
      supabase
        .from("notes")
        .select(
          "id, entity_type, entity_id, title, content, note_kind, source, source_ref, confidence, status, author_type, is_pinned, tags, created_at",
        )
        .eq("workspace_id", workspace.id)
        .eq("entity_type", "meeting")
        .eq("entity_id", meetingId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false }),
    ]);

    if (connectionRows.error) {
      console.error("Error fetching meeting connection activity:", connectionRows.error);
    }
    if (noteRows.error) {
      console.error("Error fetching meeting note activity:", noteRows.error);
    }

    const connectionEntries = await resolveConnectionActivityEntries(
      supabase,
      (connectionRows.data ?? []) as EntityLinkRow[],
      "meeting",
      meetingId,
    );

    const noteEntries = (noteRows.data ?? []).map((row) =>
      mapNoteToActivityEntry(mapNoteRowForActivity(row as Record<string, unknown>)),
    );

    return [...connectionEntries, ...noteEntries];
  },
);

export const getMeetingActivity = cache(
  async (meetingId: string): Promise<MeetingActivityEvent[]> => {
    const { supabase } = await getWorkspaceContext();

    const [decisionsResult, actionItemsResult, summariesResult, meetingResult] =
      await Promise.all([
        supabase
          .from("meeting_decisions")
          .select("id, text, rationale, created_at")
          .eq("meeting_id", meetingId)
          .order("created_at", { ascending: false }),
        supabase
          .from("meeting_action_items")
          .select(
            "id, text, assignee, assignee_person_id, due_date, completed, completed_at, priority, context, created_at",
          )
          .eq("meeting_id", meetingId)
          .order("created_at", { ascending: false }),
        supabase
          .from("meeting_summaries")
          .select("id, content, is_current, generated_by, created_at")
          .eq("meeting_id", meetingId)
          .order("created_at", { ascending: false }),
        supabase
          .from("meetings")
          .select("id, created_at, origin, external_provider")
          .eq("id", meetingId)
          .maybeSingle(),
      ]);

    const entries: MeetingActivityEvent[] = [];

    // Record creation (found via calendar sync vs added manually)
    if (meetingResult.data) {
      entries.push(
        mapMeetingCreationToActivityEntry({
          id: meetingResult.data.id,
          createdAt: meetingResult.data.created_at,
          origin: meetingResult.data.origin,
          externalProvider: meetingResult.data.external_provider,
        }),
      );
    }

    // Map summaries using the activity mapper
    for (const row of summariesResult.data ?? []) {
      entries.push(
        mapSummaryToActivityEntry(mapSummaryRow(row as Record<string, unknown>)),
      );
    }

    // Map decisions using the activity mapper
    for (const row of decisionsResult.data ?? []) {
      const decision: MeetingDecisionRecord = {
        id: row.id,
        text: row.text,
        rationale: row.rationale,
        createdAt: row.created_at,
      };
      entries.push(mapDecisionToActivityEntry(decision));
    }

    // Map action items using the activity mapper
    for (const row of actionItemsResult.data ?? []) {
      const item: MeetingActionItemRecord = {
        id: row.id,
        text: row.text,
        assignee: row.assignee,
        assigneePersonId: row.assignee_person_id,
        dueDate: row.due_date,
        completed: row.completed,
        completedAt: row.completed_at,
        priority: row.priority,
        context: row.context,
        createdAt: row.created_at,
      };
      entries.push(...mapActionItemToActivityEntries(item));
    }

    return entries;
  },
);

// ============================================================================
// List queries (for the directory table)
// ============================================================================

export const getMeetings = cache(async (): Promise<MeetingDetailRecord[]> => {
  const { workspace, supabase } = await getWorkspaceContext();

  const { data, error } = await supabase
    .from("meetings")
    .select(MEETING_SELECT)
    .eq("workspace_id", workspace.id)
    .order("start_time", { ascending: false });

  if (error) {
    console.error("Error fetching meetings:", error.message, error.code, error.hint, error.details);
    throw error;
  }

  return (data ?? []).map((r) => mapMeetingRow(r as Record<string, unknown>));
});
