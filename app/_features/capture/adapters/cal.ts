import type {
  CaptureAdapter,
  CaptureEnvelope,
  EnvelopeParticipant,
  SignalDerivationContext,
} from "./types";
import type { PersonSignals } from "@/app/_features/capture/services/system-plays/person-signals";

/**
 * Cal.com capture adapter (connector-platform Phase 4) — the Composio `cal`
 * toolkit, replacing the native Cal.com OAuth integration.
 *
 * Consumes Cal.com API v2 booking objects — the per-item shape
 * CAL_LIST_BOOKINGS returns (and the near-identical webhook payload shape,
 * which uses startTime/endTime and an `organizer` field). The `cal` toolkit
 * exposes ZERO Composio trigger types (verified against triggers_types
 * 2026-07-04), so booking ingestion rides backfill + the reconciliation
 * cron. Lead-person and meeting record creation happen in
 * cal-booking-processor.ts, which runs alongside envelope ingestion.
 */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function idString(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return str(value);
}

function isoString(value: unknown): string | null {
  const raw = str(value);
  if (!raw) return null;
  const ms = Date.parse(raw);
  return Number.isNaN(ms) ? null : new Date(ms).toISOString();
}

function person(
  value: unknown,
  role: EnvelopeParticipant["role"],
): EnvelopeParticipant | null {
  if (!isRecord(value)) return null;
  const email = str(value.email);
  if (!email) return null;
  return { email: email.toLowerCase(), name: str(value.name), role };
}

/** Booking attendees carry has_calendar_meeting (Phase 5.1). */
function deriveCalSignals(
  envelopes: readonly CaptureEnvelope[],
  context: SignalDerivationContext,
): Map<string, PersonSignals> {
  const signals = new Map<string, PersonSignals>();
  const self = context.userEmail?.toLowerCase() ?? null;
  for (const envelope of envelopes) {
    if (envelope.sourceType !== "calcom") continue;
    for (const p of envelope.participants) {
      if (p.role !== "attendee" || !p.email || p.email === self) continue;
      signals.set(p.email, { has_calendar_meeting: true });
    }
  }
  return signals;
}

export const calCaptureAdapter: CaptureAdapter = {
  sourceType: "calcom",
  toolkit: "cal",
  // Verified 2026-07-04: the cal toolkit has no Composio trigger types.
  triggerSlugs: [],
  deriveSignals: deriveCalSignals,

  normalize(payload: unknown): CaptureEnvelope | null {
    if (!isRecord(payload)) return null;
    const booking = isRecord(payload.booking) ? payload.booking : payload;

    const uid = str(booking.uid);
    const bookingId = idString(booking.id);
    const externalId = uid ?? bookingId;
    if (!externalId) return null;

    const status = str(booking.status)?.toLowerCase() ?? null;
    // Cancelled/rejected bookings are tombstones for capture purposes; the
    // booking processor still sees them to mark meetings cancelled.
    if (status === "cancelled" || status === "rejected") return null;

    const title = str(booking.title);
    if (!title) return null;

    const start = isoString(booking.start) ?? isoString(booking.startTime);
    const end = isoString(booking.end) ?? isoString(booking.endTime);
    const description = str(booking.description);

    const hosts = Array.isArray(booking.hosts) ? booking.hosts : [];
    const organizer = person(booking.organizer, "organizer");
    const participants: EnvelopeParticipant[] = [];
    const hostEmails = new Set<string>();

    for (const host of hosts) {
      const participant = person(host, "organizer");
      if (participant?.email) {
        hostEmails.add(participant.email);
        participants.push(participant);
      }
    }
    if (organizer?.email && !hostEmails.has(organizer.email)) {
      hostEmails.add(organizer.email);
      participants.push(organizer);
    }

    const attendees = Array.isArray(booking.attendees) ? booking.attendees : [];
    for (const attendee of attendees) {
      const participant = person(attendee, "attendee");
      if (participant?.email && !hostEmails.has(participant.email)) {
        participants.push(participant);
      }
    }

    const eventType = isRecord(booking.eventType) ? booking.eventType : null;

    return {
      sourceType: "calcom",
      captureType: "meeting",
      externalId,
      title,
      occurredAt: start,
      participants,
      threadId: null,
      extracted: {
        type: "meeting",
        title,
        description: description?.slice(0, 500) ?? null,
        start,
        end,
        status,
        attendees: participants
          .filter((p) => p.role === "attendee")
          .map((p) => p.email),
        organizer: participants.find((p) => p.role === "organizer")?.email ?? null,
        meeting_url: str(booking.meetingUrl),
        location: str(booking.location),
        cal_booking_id: bookingId,
        cal_event_uid: uid,
        event_type: eventType ? str(eventType.slug) : null,
      },
      raw: {
        bookingId,
        uid,
        title,
        start,
        end,
        status,
        source: "composio",
      },
      // Bookings bypass the noise gate — the gate models inbox noise.
      noise: null,
    };
  },
};
