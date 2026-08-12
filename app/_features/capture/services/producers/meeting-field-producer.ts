import { createAdminClient } from "@/app/_lib/supabase/admin";
import { runCareForSignal } from "@/app/_features/memory/care/scheduler";
import { memoryUpdateField } from "@/app/_lib/memory-tools";
import { getFieldsForEntity } from "@/app/_features/memory/taxonomy/field-registry";
import {
  MEETING_FIELD_SIGNAL_KEYS,
  type DerivedMeetingFields,
} from "./record-field-types";

export interface ProduceMeetingFieldsResult {
  meetingId: string | null;
  dispatched: string[];
  attendeesWritten: boolean;
}

interface MeetingRow {
  id: string;
  title: string;
}

/** Transcript timestamps can drift from the calendar start time. */
const MATCH_WINDOW_MS = 6 * 60 * 60 * 1000;

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (match) => `\\${match}`);
}

async function matchMeeting(input: {
  workspaceId: string;
  externalId: string;
  source: string;
  title?: string;
  occurredAt?: string;
}): Promise<MeetingRow | null> {
  const admin = createAdminClient();

  // Exact routing key once stamped (Fireflies transcripts only — the column
  // exists for this provider).
  if (input.source === "fireflies") {
    const { data } = await admin
      .from("meetings")
      .select("id, title")
      .eq("workspace_id", input.workspaceId)
      .eq("fireflies_meeting_id", input.externalId)
      .is("deleted_at", null)
      .maybeSingle();
    if (data) return data as MeetingRow;
  }

  // Fallback: same title, start time within the drift window.
  if (!input.title || !input.occurredAt) return null;
  const at = new Date(input.occurredAt).getTime();
  if (Number.isNaN(at)) return null;
  const { data } = await admin
    .from("meetings")
    .select("id, title")
    .eq("workspace_id", input.workspaceId)
    .ilike("title", escapeLike(input.title))
    .gte("start_time", new Date(at - MATCH_WINDOW_MS).toISOString())
    .lte("start_time", new Date(at + MATCH_WINDOW_MS).toISOString())
    .is("deleted_at", null);
  const rows = (data as MeetingRow[] | null) ?? [];
  return rows.length === 1 ? rows[0] : null;
}

/**
 * Track B meeting producer: routes recording-app intelligence (Fireflies /
 * Otter transcripts) onto the meeting record — type and summary through the
 * records capability, attendance as a boolean attestation, and the actual
 * attendee list as a direct JSON write (the {{extracted}} string path would
 * mangle the array).
 */
export async function produceMeetingFieldSignals(input: {
  workspaceId: string;
  externalId: string;
  fields: DerivedMeetingFields;
  source: string;
  captureId?: string;
}): Promise<ProduceMeetingFieldsResult> {
  const none: ProduceMeetingFieldsResult = {
    meetingId: null,
    dispatched: [],
    attendeesWritten: false,
  };

  const meeting = await matchMeeting({
    workspaceId: input.workspaceId,
    externalId: input.externalId,
    source: input.source,
    title: input.fields.title,
    occurredAt: input.fields.occurredAt,
  });
  if (!meeting) return none;

  // Stamp the routing key so the next transcript matches exactly.
  if (input.source === "fireflies") {
    await createAdminClient()
      .from("meetings")
      .update({ fireflies_meeting_id: input.externalId })
      .eq("id", meeting.id);
  }

  const dispatched: string[] = [];
  for (const signal of MEETING_FIELD_SIGNAL_KEYS) {
    const signalValue = input.fields.signalValues[signal];
    if (!signalValue) continue;
    await runCareForSignal({
      workspaceId: input.workspaceId,
      entityType: "meeting",
      entityId: meeting.id,
      signalKey: signal,
      evidence: {
        source: input.source,
        captureId: input.captureId,
        signalValues: { [signal]: signalValue },
      },
    });
    dispatched.push(signal);
  }

  if (input.fields.attendanceEvidence) {
    await runCareForSignal({
      workspaceId: input.workspaceId,
      entityType: "meeting",
      entityId: meeting.id,
      signalKey: "meeting_has_attendance_evidence",
      evidence: {
        source: input.source,
        captureId: input.captureId,
        signalValues: { meeting_has_attendance_evidence: true },
      },
    });
    dispatched.push("meeting_has_attendance_evidence");
  }

  let attendeesWritten = false;
  if (input.fields.attendees.length > 0) {
    const rule = getFieldsForEntity("meeting")
      .find((field) => field.key === "attendees")
      ?.fillRules?.find((r) => r.signal === "meeting_attendees_extracted");
    const result = await memoryUpdateField({
      workspaceId: input.workspaceId,
      entityType: "meeting",
      entityId: meeting.id,
      field: "attendees",
      value: input.fields.attendees,
      confidence: rule?.confidence ?? 95,
      because: rule?.because ?? "Attendees who actually joined, from the recording app",
      source: "enrichment",
      sourceDetails: {
        playbookSlug: "memory-records",
        captureId: input.captureId,
        ruleId: "meeting-attendees-meeting_attendees_extracted",
      },
    });
    attendeesWritten = result.action === "applied";
  }

  return { meetingId: meeting.id, dispatched, attendeesWritten };
}
