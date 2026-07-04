/**
 * Meeting Activity mappers — keep in sync with Overview surfaces.
 *
 * When adding a new Overview section or editable field on Meeting detail:
 * 1. Add mapper(s) here → ProfileActivityTimelineEntry
 * 2. Fetch in getMeetingSupplementalActivity (queries.ts)
 * 3. Wire MeetingActivityTab
 *
 * Full checklist: docs/guides/memory-activity-parity.md
 *
 * Known gaps (blocked on schema — do not work around here):
 * - Inline meeting field edits write no provenance: profile_field_provenance's
 *   entity_type CHECK admits person/organization/work/operator/workspace only,
 *   so title/time/status edits don't emit discrete Activity events yet.
 * - Tags: entity_tag_assignments' entity_type CHECK admits person/org/work/billing,
 *   so meetings cannot carry tags (no tag events to surface).
 * - Attendees + agenda live as jsonb columns on client_meetings with no audit
 *   stream; mapAttendeeToActivityEntry / mapAgendaItemToActivityEntry exist but
 *   are unfed until edits are logged somewhere with timestamps.
 * - notes' entity_type CHECK admits person/organization/work only; the 'meeting'
 *   notes query below returns rows once that CHECK is widened.
 */
import type { ProfileActivityTimelineEntry, PersonActivityKind } from "@/app/_features/people/utils/activity";
import type {
  MeetingDecisionRecord,
  MeetingActionItemRecord,
  MeetingAgendaItem,
  MeetingSummaryRecord,
} from "@/app/_features/meetings/queries";
import type { EntityNoteWithProvenance } from "@/app/_features/memory/types/taxonomies";

export type MeetingActivityKind =
  | "decision"
  | "action_item"
  | "agenda"
  | "attendee"
  | "note"
  | "connection"
  | "summary"
  | "created";

export type MeetingActivityEvent = {
  id: string;
  at: string;
  kind: PersonActivityKind;
  label: string;
  detail: string | null;
  field?: ProfileActivityTimelineEntry["field"];
  source?: string;
  status?: string;
  entityName?: string | null;
  entityHref?: string | null;
  meetingField?: MeetingActivityKind;
};

export function mapDecisionToActivityEntry(
  decision: MeetingDecisionRecord,
): MeetingActivityEvent {
  return {
    id: `decision-${decision.id}`,
    at: decision.createdAt,
    kind: "user",
    label: "Decision recorded",
    detail: decision.text,
    meetingField: "decision",
  };
}

export function mapActionItemToActivityEntries(
  item: MeetingActionItemRecord,
): MeetingActivityEvent[] {
  const entries: MeetingActivityEvent[] = [];

  entries.push({
    id: `action-created-${item.id}`,
    at: item.createdAt,
    kind: "user",
    label: "Action item added",
    detail: [
      item.text,
      item.assignee ? `Assigned to ${item.assignee}` : null,
      item.priority ? `${item.priority} priority` : null,
    ]
      .filter(Boolean)
      .join(" · "),
    meetingField: "action_item",
  });

  if (item.completed && item.completedAt) {
    entries.push({
      id: `action-completed-${item.id}`,
      at: item.completedAt,
      kind: "user",
      label: "Action item completed",
      detail: item.text,
      meetingField: "action_item",
    });
  }

  return entries;
}

const SUMMARY_PREVIEW_LENGTH = 60;

function previewText(text: string, maxLength: number = SUMMARY_PREVIEW_LENGTH): string {
  const trimmed = text.trim();
  return trimmed.length > maxLength ? `${trimmed.slice(0, maxLength)}…` : trimmed;
}

export function mapSummaryToActivityEntry(
  summary: MeetingSummaryRecord,
): MeetingActivityEvent {
  const isUserSummary = summary.generatedBy === "user";

  return {
    id: `summary-${summary.id}`,
    at: summary.createdAt,
    kind: isUserSummary ? "user" : "ai",
    label: isUserSummary ? "Summary added" : "Salt generated a summary",
    detail: summary.content ? previewText(summary.content) : null,
    meetingField: "summary",
  };
}

const MEETING_PROVIDER_LABELS: Record<string, string> = {
  calcom: "Cal.com",
  google: "Google Calendar",
  google_calendar: "Google Calendar",
  outlook: "Outlook Calendar",
};

export type MeetingCreationActivityInput = {
  id: string;
  createdAt: string;
  origin?: string | null;
  externalProvider?: string | null;
};

export function mapMeetingCreationToActivityEntry(
  input: MeetingCreationActivityInput,
): MeetingActivityEvent {
  const provider = input.externalProvider
    ? (MEETING_PROVIDER_LABELS[input.externalProvider] ?? input.externalProvider)
    : null;
  const isSynced = Boolean(provider) || input.origin === "found";

  return {
    id: `meeting-created-${input.id}`,
    at: input.createdAt,
    kind: isSynced ? "system" : "user",
    label: isSynced
      ? `Meeting synced from ${provider ?? "a connected calendar"}`
      : "Meeting added to Memory",
    detail: isSynced
      ? "Salt synced this meeting from a connected calendar."
      : null,
    meetingField: "created",
  };
}

export function mapNoteToActivityEntry(
  note: EntityNoteWithProvenance,
): MeetingActivityEvent {
  const isUserNote =
    note.authorType === "user" || note.source === "manual";
  const isSaltNote =
    note.authorType === "salt" ||
    note.source === "ai_capture" ||
    note.source === "ai_inference";

  let label: string;
  let kind: "user" | "keeper" | "system";

  if (isUserNote) {
    label = "You added a note";
    kind = "user";
  } else if (isSaltNote) {
    label = note.source === "ai_capture" ? "Salt captured a note" : "Salt added a note";
    kind = "keeper";
  } else {
    label = "Note added";
    kind = "system";
  }

  const detailParts: string[] = [];
  if (note.title) {
    detailParts.push(note.title);
  }
  if (note.tags && note.tags.length > 0) {
    detailParts.push(note.tags.join(", "));
  }
  if (!note.title && note.content) {
    const preview =
      note.content.length > 60 ? `${note.content.slice(0, 60)}…` : note.content;
    detailParts.push(preview);
  }

  return {
    id: `note-${note.id}`,
    at: note.createdAt,
    kind,
    label,
    detail: detailParts.length > 0 ? detailParts.join(" · ") : null,
    field: "note",
    source: isUserNote ? "manual" : "ai_fallback",
    status: "applied",
  };
}

// entity_links rows use the short dialect (org, billing, …); long-dialect keys
// remain for legacy rows written before the rename.
const ENTITY_TYPE_LABELS: Record<string, string> = {
  person: "person",
  org: "organization",
  organization: "organization",
  work: "work",
  project: "work",
  billing: "payment",
  billing_record: "payment",
  note: "note",
  conversation: "conversation",
  client_meeting: "meeting",
  meeting: "meeting",
  file: "file",
  space: "space",
};

function entityTypeLabel(entityType: string): string {
  return ENTITY_TYPE_LABELS[entityType] ?? entityType;
}

export type ConnectionActivityInput = {
  id: string;
  fromEntityType: string;
  fromEntityId: string;
  toEntityType: string;
  toEntityId: string;
  relationType: string | null;
  createdAt: string;
  createdBy: string | null;
  connectedEntityName: string;
  connectedEntityHref?: string;
};

export function mapConnectionToActivityEntry(
  input: ConnectionActivityInput,
  thisEntityType: string,
  thisEntityId: string,
): ProfileActivityTimelineEntry {
  const isOutgoing =
    input.fromEntityType === thisEntityType &&
    input.fromEntityId === thisEntityId;
  const otherType = isOutgoing ? input.toEntityType : input.fromEntityType;
  const typeLabel = entityTypeLabel(otherType);

  return {
    id: `connection-${input.id}`,
    at: input.createdAt,
    kind: input.createdBy ? "user" : "system",
    label: `Connected to ${typeLabel}`,
    detail: input.connectedEntityHref ? null : input.connectedEntityName,
    entityName: input.connectedEntityName,
    entityHref: input.connectedEntityHref,
  };
}

export type AgendaActivityInput = {
  item: MeetingAgendaItem;
  action: "added" | "updated" | "removed";
  at: string;
};

export function mapAgendaItemToActivityEntry(
  input: AgendaActivityInput,
): MeetingActivityEvent {
  const actionLabels = {
    added: "Agenda item added",
    updated: "Agenda item updated",
    removed: "Agenda item removed",
  };

  return {
    id: `agenda-${input.action}-${input.item.id}`,
    at: input.at,
    kind: "user",
    label: actionLabels[input.action],
    detail: input.item.title,
    meetingField: "agenda",
  };
}

export type AttendeeActivityInput = {
  name: string;
  role: string;
  action: "added" | "removed";
  at: string;
};

export function mapAttendeeToActivityEntry(
  input: AttendeeActivityInput,
): MeetingActivityEvent {
  return {
    id: `attendee-${input.action}-${input.name}-${input.at}`,
    at: input.at,
    kind: "user",
    label: input.action === "added" ? "Attendee added" : "Attendee removed",
    detail: `${input.name} (${input.role})`,
    meetingField: "attendee",
  };
}

export function buildMeetingActivityAskSaltPrompt(
  entry: MeetingActivityEvent,
  meetingTitle: string,
): string {
  if (entry.meetingField === "decision") {
    return `On meeting "${meetingTitle}", a decision was recorded: "${entry.detail}". Tell me more about this decision and its implications.`;
  }

  if (entry.meetingField === "action_item") {
    if (entry.label.includes("completed")) {
      return `On meeting "${meetingTitle}", an action item was completed: "${entry.detail}". What was the outcome?`;
    }
    return `On meeting "${meetingTitle}", an action item was added: "${entry.detail}". Help me track progress on this.`;
  }

  if (entry.meetingField === "agenda") {
    return `On meeting "${meetingTitle}", the agenda was updated: "${entry.detail}". How should we prepare for this topic?`;
  }

  if (entry.meetingField === "attendee") {
    return `On meeting "${meetingTitle}": "${entry.label}" — ${entry.detail}. Tell me more about this person's involvement.`;
  }

  if (entry.meetingField === "summary") {
    return `On meeting "${meetingTitle}", a summary was recorded${entry.detail ? `: "${entry.detail}"` : ""}. Walk me through the key points.`;
  }

  return `On meeting "${meetingTitle}": "${entry.label}"${entry.detail ? ` — ${entry.detail}` : ""}. Tell me more about this.`;
}
