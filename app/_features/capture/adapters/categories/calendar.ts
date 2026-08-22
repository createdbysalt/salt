/**
 * Calendar Category Adapter (Captures V2 Phase 1).
 *
 * Handles all calendar-like sources: googlecalendar, outlook_calendar, cal, etc.
 * Routes by provider for provider-specific parsing.
 */

import type {
  CaptureAdapter,
  CaptureEnvelope,
  EnvelopeParticipant,
  SignalDerivationContext,
} from "../types";
import type { PersonSignals } from "@/app/_features/memory/records/person-signals";
import type { DerivedPersonFields } from "@/app/_features/capture/services/producers/person-field-types";
import type { CaptureSourceType } from "@/app/_features/capture/types";
import { emailEntity } from "../feedback-entity";

type KnownCalendarProvider = "googlecalendar" | "outlook_calendar" | "cal" | "calendly";

const KNOWN_CALENDAR_PROVIDERS: KnownCalendarProvider[] = ["googlecalendar", "outlook_calendar", "cal", "calendly"];

const CALENDAR_TRIGGER_SLUGS: Record<KnownCalendarProvider, string[]> = {
  // CREATED + UPDATED + CANCELED_DELETED: the full lifecycle, so a stored
  // capture tracks reality (reschedule/cancel) instead of going stale.
  googlecalendar: [
    "GOOGLECALENDAR_GOOGLE_CALENDAR_EVENT_CREATED_TRIGGER",
    "GOOGLECALENDAR_GOOGLE_CALENDAR_EVENT_UPDATED_TRIGGER",
    "GOOGLECALENDAR_EVENT_CANCELED_DELETED_TRIGGER",
  ],
  outlook_calendar: ["OUTLOOK_EVENT_TRIGGER", "OUTLOOK_EVENT_CHANGE_TRIGGER"],
  cal: [], // Backfill only - no real-time triggers
  calendly: [], // Backfill only - no real-time triggers
};

function isKnownCalendarProvider(provider: string): provider is KnownCalendarProvider {
  return KNOWN_CALENDAR_PROVIDERS.includes(provider as KnownCalendarProvider);
}

function deriveCalendarSignals(
  envelopes: readonly CaptureEnvelope[],
  context: SignalDerivationContext
): Map<string, PersonSignals> {
  const contacts = new Map<string, PersonSignals>();

  for (const envelope of envelopes) {
    // Calendar adapters already filter by category - process all envelopes
    for (const participant of envelope.participants) {
      if (!participant.email) continue;
      if (isSelf(participant.email, context.userEmail)) continue;

      contacts.set(participant.email, {
        ...contacts.get(participant.email),
        has_calendar_meeting: true,
      });
    }
  }

  return contacts;
}

function isSelf(email: string | null, userEmail: string | null): boolean {
  if (!email || !userEmail) return false;
  return email.toLowerCase() === userEmail.toLowerCase();
}

// Calendar adapters already filter by category - no need to re-check source type

function normalizeGoogleCalendar(payload: unknown): CaptureEnvelope | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;

  // Shapes that reach this normalizer — verified against the live Composio
  // trigger schemas 2026-08-05 and 2026-08-17:
  //   CREATED trigger: { event_id, calendar_id, summary, organizer_email,
  //               organizer_name, start_time, end_time } (flat snake_case)
  //   UPDATED trigger: pointer { event_id, calendar_id, change_type,
  //               updated_fields } — hydrate before gating
  //   CANCELED_DELETED trigger: { event_id, summary?, cancelled_at } — the
  //               event is already gone; nothing to hydrate
  //   API/backfill: Google Calendar event resource (id, start.dateTime,
  //               organizer.email, attendees[])
  const externalId =
    (record.id as string) ??
    (record.event_id as string) ??
    (record.eventId as string) ??
    (record.iCalUID as string);
  if (!externalId) return null;

  // Cancelled/deleted: the envelope asserts the terminal state directly and
  // the lifecycle path updates the stored row in place (or the keep-out
  // gate drops it when we never captured the event).
  if (typeof record.cancelled_at === "string") {
    const cancelledSummary = (record.summary as string) ?? null;
    return {
      sourceType: "googlecalendar",
      captureType: "meeting",
      externalId,
      title: cancelledSummary,
      occurredAt: null,
      participants: [],
      threadId: (record.calendar_id as string) ?? null,
      lifecycle: "update",
      extracted: {
        summary: cancelledSummary,
        status: "cancelled",
        cancelled_at: record.cancelled_at,
        attendees_known: false,
      },
      raw: {
        eventId: externalId,
        source: "composio_trigger",
      },
      noise: null,
    };
  }

  // Update pointer: hydrate so the keep-out gate and lifecycle path see
  // the full event (attendees, status, eventType).
  const isUpdatePointer =
    typeof record.change_type === "string" || record.updated_fields !== undefined;

  const summary = (record.summary as string) ?? null;
  const start = record.start as Record<string, unknown> | undefined;
  const end = record.end as Record<string, unknown> | undefined;
  const attendees = (record.attendees as Array<Record<string, unknown>>) ?? [];
  const organizer = record.organizer as Record<string, unknown> | undefined;

  const occurredAt =
    (start?.dateTime as string) ??
    (start?.date as string) ??
    (record.start_time as string) ??
    null;
  const endsAt =
    (end?.dateTime as string) ??
    (end?.date as string) ??
    (record.end_time as string) ??
    null;

  const organizerEmail =
    ((organizer?.email as string) ?? (record.organizer_email as string))?.toLowerCase() ??
    null;
  const organizerName =
    (organizer?.displayName as string) ?? (record.organizer_name as string) ?? null;

  const participants: EnvelopeParticipant[] = [];

  if (organizerEmail) {
    participants.push({
      email: organizerEmail,
      name: organizerName,
      role: "organizer",
    });
  }

  const attendeeList: Array<{
    email: string;
    name: string | null;
    responseStatus?: string;
  }> = [];
  for (const attendee of attendees) {
    const email = (attendee.email as string)?.toLowerCase();
    if (!email) continue;
    const name = (attendee.displayName as string) ?? null;
    const responseStatus = (attendee.responseStatus as string) ?? undefined;
    attendeeList.push({ email, name, ...(responseStatus ? { responseStatus } : {}) });
    participants.push({
      email,
      name,
      role: "attendee",
    });
  }

  // The flat trigger shape (event_id, start_time, …) carries no attendee or
  // eventType data; the API/backfill shape (start.dateTime, organizer.email)
  // does — and there an absent attendees array authoritatively means solo.
  // The keep-out gate's solo rule keys off this flag.
  const attendeesKnown = typeof record.start === "object" && record.start !== null;

  // Video-call link: hangoutLink is the legacy field; conferenceData carries
  // Meet/Zoom entry points on newer event resources.
  const conferenceData = record.conferenceData as Record<string, unknown> | undefined;
  const entryPoints = (conferenceData?.entryPoints as Array<Record<string, unknown>>) ?? [];
  const videoEntry = entryPoints.find((e) => e.entryPointType === "video");
  const meetingLink =
    (record.hangoutLink as string) ?? ((videoEntry?.uri as string) || null);

  return {
    sourceType: "googlecalendar",
    captureType: "meeting",
    externalId,
    title: summary,
    occurredAt,
    participants,
    threadId: (record.calendar_id as string) ?? null,
    ...(isUpdatePointer ? { lifecycle: "update" as const } : {}),
    extracted: {
      summary,
      start: occurredAt,
      end: endsAt,
      organizer_email: organizerEmail,
      attendees: attendeeList,
      attendee_count: attendees.length,
      attendees_known: attendeesKnown,
      // Thin trigger shapes hydrate before gating (Outlook email pattern):
      // the keep-out gate needs attendees/status/eventType, and the trigger
      // payload carries none of them.
      ...(!attendeesKnown ? { needs_hydration: true } : {}),
      eventType: (record.eventType as string) ?? null,
      location: (record.location as string) ?? null,
      meeting_link: meetingLink,
      status: (record.status as string) ?? null,
      deep_link: (record.htmlLink as string) ?? null,
    },
    raw: {
      eventId: externalId,
      source: "composio_trigger",
    },
    noise: null,
  };
}

/**
 * Outlook Calendar. Two shapes reach this normalizer:
 * - Trigger (OUTLOOK_EVENT_TRIGGER): pointer-only `{ id, event_type }` —
 *   verified against the live schema 2026-08-05. Returns a needs_hydration
 *   envelope (Outlook email pattern).
 * - Backfill/hydrated: Microsoft Graph event resource (subject,
 *   start.dateTime, attendees[].emailAddress, organizer, location,
 *   onlineMeeting.joinUrl, webLink).
 */
function normalizeOutlookCalendar(payload: unknown): CaptureEnvelope | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;

  const externalId = (record.id as string) ?? (record.eventId as string);
  if (!externalId) return null;

  const subject = (record.subject as string) ?? null;
  const start = record.start as Record<string, unknown> | undefined;

  // Pointer-only trigger payload — no event details until hydration.
  if (!subject && !start) {
    // OUTLOOK_EVENT_TRIGGER fires for creates; OUTLOOK_EVENT_CHANGE_TRIGGER
    // for updates/deletes. Updates must reach the lifecycle path, not the
    // webhook's duplicate short-circuit.
    const eventType = String(record.event_type ?? "created").toLowerCase();
    return {
      sourceType: "outlook_calendar",
      captureType: "meeting",
      externalId,
      title: null,
      occurredAt: null,
      participants: [],
      threadId: null,
      ...(eventType !== "created" ? { lifecycle: "update" as const } : {}),
      extracted: {
        title: null,
        start: null,
        needs_hydration: true,
      },
      raw: {
        eventId: externalId,
        source: "composio_trigger",
        needs_hydration: true,
      },
      noise: null,
    };
  }

  const end = record.end as Record<string, unknown> | undefined;
  const occurredAt = (start?.dateTime as string) ?? (start?.date as string) ?? null;
  const endsAt = (end?.dateTime as string) ?? (end?.date as string) ?? null;

  const organizer = record.organizer as Record<string, unknown> | undefined;
  const organizerAddr = organizer?.emailAddress as Record<string, unknown> | undefined;
  const organizerEmail = ((organizerAddr?.address as string) ?? "").toLowerCase() || null;
  const organizerName = (organizerAddr?.name as string) ?? null;

  const rawAttendees = (record.attendees as Array<Record<string, unknown>>) ?? [];
  const attendeeList: Array<{
    email: string;
    name: string | null;
    responseStatus?: string;
  }> = [];
  const participants: EnvelopeParticipant[] = [];

  if (organizerEmail) {
    participants.push({ email: organizerEmail, name: organizerName, role: "organizer" });
  }

  for (const attendee of rawAttendees) {
    const addr = attendee.emailAddress as Record<string, unknown> | undefined;
    const email = (addr?.address as string)?.toLowerCase();
    if (!email) continue;
    const name = (addr?.name as string) ?? null;
    // Graph carries the attendee's response at attendee.status.response.
    const attendeeStatus = attendee.status as Record<string, unknown> | undefined;
    const responseStatus = (attendeeStatus?.response as string)?.toLowerCase() || undefined;
    attendeeList.push({ email, name, ...(responseStatus ? { responseStatus } : {}) });
    participants.push({ email, name, role: "attendee" });
  }

  const location = record.location as Record<string, unknown> | string | undefined;
  const locationName =
    typeof location === "string"
      ? location
      : ((location?.displayName as string) ?? null);

  const onlineMeeting = record.onlineMeeting as Record<string, unknown> | undefined;
  const meetingLink = (onlineMeeting?.joinUrl as string) ?? null;

  return {
    sourceType: "outlook_calendar",
    captureType: "meeting",
    externalId,
    title: subject,
    occurredAt,
    participants,
    threadId: (record.iCalUId as string) ?? null,
    extracted: {
      summary: subject,
      title: subject,
      start: occurredAt,
      end: endsAt,
      organizer_email: organizerEmail,
      attendees: attendeeList,
      attendee_count: attendeeList.length,
      // The hydrated Graph shape always carries the attendees array (empty =
      // solo); only the pointer-only trigger shape lacks it, and that shape
      // returns early above.
      attendees_known: true,
      location: locationName,
      meeting_link: meetingLink,
      status: record.isCancelled === true ? "cancelled" : ((record.showAs as string) ?? null),
      deep_link: (record.webLink as string) ?? null,
    },
    raw: {
      eventId: externalId,
      source: "composio_trigger",
    },
    noise: null,
  };
}

function normalizeCal(payload: unknown): CaptureEnvelope | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;

  // Cal.com API bookings carry a numeric `id`; the text external_id column
  // stores its string form, so coerce here to keep dedupe keys stable.
  const rawId = record.id ?? record.uid ?? record.bookingId;
  const externalId =
    rawId === undefined || rawId === null ? null : String(rawId);
  if (!externalId) return null;

  const title = (record.title as string) ?? (record.eventTitle as string) ?? null;
  const startTime =
    (record.startTime as string) ?? (record.start as string) ?? null;

  const attendees = (record.attendees as Array<Record<string, unknown>>) ?? [];
  const participants: EnvelopeParticipant[] = [];
  const attendeeDetails: Array<{
    email: string;
    timezone?: string;
    phone?: string;
  }> = [];

  for (const attendee of attendees) {
    const email = (attendee.email as string)?.toLowerCase();
    if (!email) continue;
    participants.push({
      email,
      name: (attendee.name as string) ?? null,
      role: "attendee",
    });
    const timezone =
      (attendee.timeZone as string) ?? (attendee.timezone as string);
    const phone =
      (attendee.phoneNumber as string) ?? (attendee.phone as string);
    if (timezone || phone) {
      attendeeDetails.push({
        email,
        ...(timezone ? { timezone } : {}),
        ...(phone ? { phone } : {}),
      });
    }
  }

  return {
    // Capture/DB-layer key: SOURCE_TAXONOMY and capture rows use 'calcom';
    // 'cal' is only the Composio toolkit/provider key.
    sourceType: "calcom",
    captureType: "meeting",
    externalId,
    title,
    occurredAt: startTime,
    participants,
    threadId: null,
    extracted: {
      title,
      start: startTime,
      end: (record.endTime as string) ?? (record.end as string) ?? null,
      attendee_count: attendees.length,
      // A booking always carries its invitee data.
      attendees_known: true,
      status: (record.status as string) ?? null,
      eventType: (record.eventTypeSlug as string) ?? null,
      attendee_details: attendeeDetails,
    },
    raw: {
      bookingId: externalId,
      source: "composio_trigger",
    },
    noise: null,
  };
}

/**
 * Calendly scheduled-event resource (CALENDLY_LIST_EVENTS `collection` rows) —
 * verified against the live tool schema 2026-08-06. Calendly identifies
 * resources by `uri` (https://api.calendly.com/scheduled_events/<uuid>), not
 * `id`. The backfill merges each event's invitees (CALENDLY_LIST_EVENT_INVITEES)
 * onto the row as `invitees` before normalization.
 */
function normalizeCalendly(payload: unknown): CaptureEnvelope | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;

  const uri = typeof record.uri === "string" ? record.uri : null;
  const externalId = uri?.split("/").filter(Boolean).pop() ?? (record.id as string);
  if (!externalId) return null;

  const title = (record.name as string) ?? null;
  const startTime = (record.start_time as string) ?? null;

  const participants: EnvelopeParticipant[] = [];
  const seen = new Set<string>();
  const pushParticipant = (
    email: unknown,
    name: unknown,
    role: EnvelopeParticipant["role"],
  ) => {
    if (typeof email !== "string" || !email.includes("@")) return;
    const normalized = email.toLowerCase();
    if (seen.has(normalized)) return;
    seen.add(normalized);
    participants.push({
      email: normalized,
      name: typeof name === "string" ? name : null,
      role,
    });
  };

  // Host(s) on the Calendly account
  const memberships = (record.event_memberships as Array<Record<string, unknown>>) ?? [];
  for (const membership of memberships) {
    pushParticipant(membership.user_email, membership.user_name, "organizer");
  }
  // Invitees merged by the backfill (the people who booked)
  const invitees = (record.invitees as Array<Record<string, unknown>>) ?? [];
  const inviteeDetails: Array<{
    email: string;
    timezone?: string;
    phone?: string;
  }> = [];
  for (const invitee of invitees) {
    pushParticipant(invitee.email, invitee.name, "attendee");
    const email =
      typeof invitee.email === "string" ? invitee.email.toLowerCase() : null;
    if (!email) continue;
    const timezone = invitee.timezone as string | undefined;
    const phone =
      (invitee.text_reminder_number as string | undefined) ??
      (invitee.phone_number as string | undefined);
    if (timezone || phone) {
      inviteeDetails.push({
        email,
        ...(timezone ? { timezone } : {}),
        ...(phone ? { phone } : {}),
      });
    }
  }
  // Extra guests added to the booking
  const guests = (record.event_guests as Array<Record<string, unknown>>) ?? [];
  for (const guest of guests) {
    pushParticipant(guest.email, null, "attendee");
  }

  const location = record.location as Record<string, unknown> | undefined;
  const inviteesCounter = record.invitees_counter as Record<string, unknown> | undefined;

  return {
    sourceType: "calendly",
    captureType: "meeting",
    externalId,
    title,
    occurredAt: startTime,
    participants,
    threadId: null,
    extracted: {
      title,
      start: startTime,
      end: (record.end_time as string) ?? null,
      status: (record.status as string) ?? null,
      // A booking always carries its invitee data.
      attendees_known: true,
      attendee_count:
        typeof inviteesCounter?.active === "number"
          ? inviteesCounter.active
          : invitees.length,
      location:
        (location?.location as string) ?? (location?.type as string) ?? null,
      invitee_details: inviteeDetails,
    },
    raw: {
      calendlyEventUri: uri ?? externalId,
      source: "composio_backfill",
    },
    noise: null,
  };
}

function normalizeGenericCalendar(
  payload: unknown,
  sourceType: CaptureSourceType
): CaptureEnvelope | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;

  const externalId =
    (record.id as string) ??
    (record.eventId as string) ??
    (record.uid as string);
  if (!externalId) return null;

  const title =
    (record.summary as string) ??
    (record.title as string) ??
    (record.subject as string) ??
    null;

  const start = record.start as Record<string, unknown> | string | undefined;
  const occurredAt =
    typeof start === "string"
      ? start
      : ((start as Record<string, unknown>)?.dateTime as string) ??
        ((start as Record<string, unknown>)?.date as string) ??
        null;

  return {
    sourceType,
    captureType: "meeting",
    externalId,
    title,
    occurredAt,
    participants: [],
    threadId: null,
    extracted: {
      title,
      start: occurredAt,
    },
    raw: {
      eventId: externalId,
      source: "composio_trigger",
    },
    noise: null,
  };
}

/**
 * Field-signal derivation (registry-wiring Phase 4): scheduling payloads
 * attest the invitee's timezone (Cal.com `timeZone`, Calendly `timezone`)
 * and, when collected, their phone number. The connected user's own details
 * are excluded — their profile belongs to the Me surface, not a contact.
 */
function deriveCalendarFieldSignals(
  envelopes: readonly CaptureEnvelope[],
  context: SignalDerivationContext,
): Map<string, DerivedPersonFields> {
  const contacts = new Map<string, DerivedPersonFields>();
  const userEmail = context.userEmail?.toLowerCase() ?? null;

  const add = (
    email: string,
    patch: Partial<DerivedPersonFields["signalValues"]>,
  ): void => {
    if (userEmail && email === userEmail) return;
    const existing = contacts.get(email) ?? { signalValues: {} };
    Object.assign(existing.signalValues, patch);
    contacts.set(email, existing);
  };

  for (const envelope of envelopes) {
    const details = [
      ...((envelope.extracted.attendee_details as Array<{
        email: string;
        timezone?: string;
        phone?: string;
      }>) ?? []),
      ...((envelope.extracted.invitee_details as Array<{
        email: string;
        timezone?: string;
        phone?: string;
      }>) ?? []),
    ];
    for (const detail of details) {
      if (!detail.email?.includes("@")) continue;
      const email = detail.email.toLowerCase();
      if (detail.timezone) {
        add(email, { person_timezone_detected: detail.timezone });
      }
      if (detail.phone) {
        add(email, { person_phone_extracted: detail.phone });
      }
    }

    // Recency (producer roadmap track 2): a past meeting is a genuine
    // touchpoint — "you've shared time on the calendar". Future events are
    // intent, not contact, so they don't move the relationship clock.
    if (
      envelope.occurredAt &&
      new Date(envelope.occurredAt).getTime() <= Date.now()
    ) {
      for (const participant of envelope.participants) {
        if (!participant.email?.includes("@")) continue;
        const email = participant.email.toLowerCase();
        if (userEmail && email === userEmail) continue;
        const existing = contacts.get(email) ?? { signalValues: {} };
        const current = existing.contactAt;
        if (!current || envelope.occurredAt > current.at) {
          existing.contactAt = {
            at: envelope.occurredAt,
            signal: "capture_meeting_completed",
          };
        }
        contacts.set(email, existing);
      }
    }
  }

  return contacts;
}

/**
 * Providers whose Composio toolkit key differs from the capture-layer
 * source type ('cal' toolkit → 'calcom' captures). adapter.sourceType must
 * match what normalize() emits — connector-health queries capture_events
 * by it, and the conformance suite enforces the equality.
 */
const CAPTURE_SOURCE_TYPE_BY_PROVIDER: Record<string, CaptureSourceType> = {
  cal: "calcom",
};

/**
 * Create a calendar adapter for ANY provider.
 * Known providers get specific parsing; unknown get generic extraction.
 */
export function createCalendarCategoryAdapter(provider: string): CaptureAdapter {
  const triggerSlugs = isKnownCalendarProvider(provider)
    ? CALENDAR_TRIGGER_SLUGS[provider]
    : []; // Unknown providers: triggers come from DB

  return {
    sourceType:
      CAPTURE_SOURCE_TYPE_BY_PROVIDER[provider] ??
      (provider),
    toolkit: provider,
    triggerSlugs,
    deriveSignals: deriveCalendarSignals,
    deriveFieldSignals: deriveCalendarFieldSignals,

    extractFeedbackEntity(envelope) {
      return emailEntity(envelope, "organizer_email", "organizer");
    },

    normalize(payload: unknown): CaptureEnvelope | null {
      // Route known providers to specific parsing
      switch (provider) {
        case "googlecalendar":
          return normalizeGoogleCalendar(payload);
        case "outlook_calendar":
          return normalizeOutlookCalendar(payload);
        case "cal":
          return normalizeCal(payload);
        case "calendly":
          return normalizeCalendly(payload);
        default:
          // Any unknown calendar provider gets generic extraction
          return normalizeGenericCalendar(payload, provider);
      }
    },
  };
}

/** Known provider adapters (for backward compatibility). */
export const calendarCategoryAdapters = KNOWN_CALENDAR_PROVIDERS.map(
  createCalendarCategoryAdapter
);

/**
 * Get calendar adapter for ANY provider in the calendar category.
 * Always returns an adapter — unknown providers get generic extraction.
 */
export function getCalendarAdapter(provider: string): CaptureAdapter {
  return createCalendarCategoryAdapter(provider);
}
