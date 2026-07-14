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
import type { PersonSignals } from "@/app/_features/capture/services/system-plays/person-signals";
import type { CaptureSourceType } from "@/app/_features/capture/types";

type KnownCalendarProvider = "googlecalendar" | "outlook_calendar" | "cal" | "calendly";

const KNOWN_CALENDAR_PROVIDERS: KnownCalendarProvider[] = ["googlecalendar", "outlook_calendar", "cal", "calendly"];

const CALENDAR_TRIGGER_SLUGS: Record<KnownCalendarProvider, string[]> = {
  googlecalendar: ["GOOGLECALENDAR_GOOGLE_CALENDAR_EVENT_CREATED_TRIGGER"],
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

  const externalId =
    (record.id as string) ??
    (record.eventId as string) ??
    (record.iCalUID as string);
  if (!externalId) return null;

  const summary = (record.summary as string) ?? null;
  const start = record.start as Record<string, unknown> | undefined;
  const end = record.end as Record<string, unknown> | undefined;
  const attendees = (record.attendees as Array<Record<string, unknown>>) ?? [];
  const organizer = record.organizer as Record<string, unknown> | undefined;

  const occurredAt =
    (start?.dateTime as string) ?? (start?.date as string) ?? null;

  const participants: EnvelopeParticipant[] = [];

  if (organizer?.email) {
    participants.push({
      email: (organizer.email as string).toLowerCase(),
      name: (organizer.displayName as string) ?? null,
      role: "organizer",
    });
  }

  for (const attendee of attendees) {
    const email = (attendee.email as string)?.toLowerCase();
    if (!email) continue;
    participants.push({
      email,
      name: (attendee.displayName as string) ?? null,
      role: "attendee",
    });
  }

  return {
    sourceType: "googlecalendar" as CaptureSourceType,
    captureType: "meeting",
    externalId,
    title: summary,
    occurredAt,
    participants,
    threadId: null,
    extracted: {
      summary,
      start: occurredAt,
      end: (end?.dateTime as string) ?? (end?.date as string) ?? null,
      organizer_email: (organizer?.email as string)?.toLowerCase() ?? null,
      attendee_count: attendees.length,
      location: (record.location as string) ?? null,
      status: (record.status as string) ?? null,
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

  const externalId =
    (record.id as string) ??
    (record.uid as string) ??
    (record.bookingId as string);
  if (!externalId) return null;

  const title = (record.title as string) ?? (record.eventTitle as string) ?? null;
  const startTime =
    (record.startTime as string) ?? (record.start as string) ?? null;

  const attendees = (record.attendees as Array<Record<string, unknown>>) ?? [];
  const participants: EnvelopeParticipant[] = [];

  for (const attendee of attendees) {
    const email = (attendee.email as string)?.toLowerCase();
    if (!email) continue;
    participants.push({
      email,
      name: (attendee.name as string) ?? null,
      role: "attendee",
    });
  }

  return {
    sourceType: "cal" as CaptureSourceType,
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
      status: (record.status as string) ?? null,
      eventType: (record.eventTypeSlug as string) ?? null,
    },
    raw: {
      bookingId: externalId,
      source: "composio_trigger",
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
 * Create a calendar adapter for ANY provider.
 * Known providers get specific parsing; unknown get generic extraction.
 */
export function createCalendarCategoryAdapter(provider: string): CaptureAdapter {
  const triggerSlugs = isKnownCalendarProvider(provider)
    ? CALENDAR_TRIGGER_SLUGS[provider]
    : []; // Unknown providers: triggers come from DB

  return {
    sourceType: provider as CaptureSourceType,
    toolkit: provider,
    triggerSlugs,
    deriveSignals: deriveCalendarSignals,

    normalize(payload: unknown): CaptureEnvelope | null {
      // Route known providers to specific parsing
      switch (provider) {
        case "googlecalendar":
          return normalizeGoogleCalendar(payload);
        case "cal":
          return normalizeCal(payload);
        default:
          // Any unknown calendar provider gets generic extraction
          return normalizeGenericCalendar(payload, provider as CaptureSourceType);
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
