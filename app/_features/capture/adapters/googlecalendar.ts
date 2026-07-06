import type {
  CaptureAdapter,
  CaptureEnvelope,
  EnvelopeParticipant,
  SignalDerivationContext,
} from "./types";
import type { PersonSignals } from "@/app/_features/capture/services/system-plays/person-signals";

/**
 * Google Calendar capture adapter (connector-platform Phase 3.5).
 *
 * Consumes two verified shapes (triggers_types + tool schemas, 2026-07-04):
 * Google Calendar API event objects (per-item shape of
 * GOOGLECALENDAR_EVENTS_LIST) and the flat snake_case payload of the
 * GOOGLECALENDAR_GOOGLE_CALENDAR_EVENT_CREATED_TRIGGER polling trigger
 * (event_id / summary / start_time / end_time / organizer_email — no
 * attendees; the reconciliation backfill enriches those).
 */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

/** Google API event times: { dateTime } for timed, { date } for all-day. */
function eventTime(value: unknown): string | null {
  if (!isRecord(value)) return null;
  const raw = str(value.dateTime) ?? str(value.date);
  if (!raw) return null;
  const ms = Date.parse(raw);
  return Number.isNaN(ms) ? null : new Date(ms).toISOString();
}

/** Flat ISO string (trigger payload) → ISO, defensively. */
function isoString(value: unknown): string | null {
  const raw = str(value);
  if (!raw) return null;
  const ms = Date.parse(raw);
  return Number.isNaN(ms) ? null : new Date(ms).toISOString();
}

/** Everyone on a meeting with you carries has_calendar_meeting (Phase 5.1). */
function deriveCalendarSignals(
  envelopes: readonly CaptureEnvelope[],
  context: SignalDerivationContext,
): Map<string, PersonSignals> {
  const signals = new Map<string, PersonSignals>();
  const self = context.userEmail?.toLowerCase() ?? null;
  for (const envelope of envelopes) {
    if (envelope.sourceType !== "googlecalendar") continue;
    for (const p of envelope.participants) {
      if (!p.email || p.email === self) continue;
      signals.set(p.email, { has_calendar_meeting: true });
    }
  }
  return signals;
}

export const googleCalendarCaptureAdapter: CaptureAdapter = {
  sourceType: "googlecalendar",
  toolkit: "googlecalendar",
  deriveSignals: deriveCalendarSignals,
  // Verified against GET /api/v3/triggers_types 2026-07-04 (polling trigger,
  // 1-min interval on Salt's own OAuth client).
  triggerSlugs: ["GOOGLECALENDAR_GOOGLE_CALENDAR_EVENT_CREATED_TRIGGER"],

  normalize(payload: unknown): CaptureEnvelope | null {
    if (!isRecord(payload)) return null;
    // Trigger envelopes may nest the resource under `event`.
    const event = isRecord(payload.event) ? payload.event : payload;

    const externalId = str(event.id) ?? str(event.eventId) ?? str(event.event_id);
    if (!externalId) return null;

    // Cancelled events are tombstones — recognized, not ingested.
    if (str(event.status) === "cancelled") return null;

    const summary = str(event.summary);
    const description = str(event.description);
    // Legacy filter kept: an event with no title and no description carries
    // nothing for memory.
    if (!summary && !description) return null;

    // API events carry { start: { dateTime | date } }; the created-trigger
    // payload carries flat ISO strings (start_time / end_time).
    const start = eventTime(event.start) ?? isoString(event.start_time);
    const end = eventTime(event.end) ?? isoString(event.end_time);

    const organizer = isRecord(event.organizer) ? event.organizer : null;
    const attendees = Array.isArray(event.attendees) ? event.attendees : [];

    const participants: EnvelopeParticipant[] = [];
    const organizerEmail = organizer ? str(organizer.email) : str(event.organizer_email);
    if (organizerEmail) {
      participants.push({
        email: organizerEmail.toLowerCase(),
        name:
          (organizer ? str(organizer.displayName) : null) ??
          str(event.organizer_name),
        role: "organizer",
      });
    }
    for (const attendee of attendees) {
      if (!isRecord(attendee)) continue;
      const email = str(attendee.email);
      if (!email) continue;
      participants.push({
        email: email.toLowerCase(),
        name: str(attendee.displayName),
        role: "attendee",
      });
    }

    return {
      sourceType: "googlecalendar",
      captureType: "meeting",
      externalId,
      title: summary ?? description?.slice(0, 100) ?? null,
      occurredAt: start,
      participants,
      // Recurring instances share the series id — the calendar analog of an
      // email thread.
      threadId: str(event.recurringEventId) ?? str(event.recurring_event_id),
      extracted: {
        type: "meeting",
        title: summary,
        description: description?.slice(0, 500) ?? null,
        start,
        end,
        attendees: participants
          .filter((p) => p.role === "attendee")
          .map((p) => p.email),
        organizer: participants.find((p) => p.role === "organizer")?.email ?? null,
        link: str(event.htmlLink),
        status: str(event.status),
      },
      // Envelope retention: pointer + display fields only; attendee list and
      // description live in extracted, full event re-fetched on demand.
      raw: {
        eventId: externalId,
        summary,
        start,
        end,
        status: str(event.status),
        htmlLink: str(event.htmlLink),
        recurringEventId: str(event.recurringEventId),
        source: "composio",
      },
      // Meetings bypass the noise gate — the gate models inbox noise.
      noise: null,
    };
  },
};
