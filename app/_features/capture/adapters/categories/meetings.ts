/**
 * Meetings Category Adapter (Captures V2 Phase 1).
 *
 * Handles meeting transcript sources: fireflies, otter, etc.
 * Stub implementation — enable when connectors are wired.
 */

import type {
  CaptureAdapter,
  CaptureEnvelope,
  EnvelopeParticipant,
  SignalDerivationContext,
} from "../types";
import type { PersonSignals } from "@/app/_features/capture/services/system-plays/person-signals";
import type { CaptureSourceType } from "@/app/_features/capture/types";

type KnownMeetingsProvider = "fireflies" | "otter";

const KNOWN_MEETINGS_PROVIDERS: KnownMeetingsProvider[] = ["fireflies", "otter"];

const MEETINGS_TRIGGER_SLUGS: Record<KnownMeetingsProvider, string[]> = {
  fireflies: [], // No triggers available yet - backfill only
  otter: [], // No triggers available yet - backfill only
};

function isKnownMeetingsProvider(provider: string): provider is KnownMeetingsProvider {
  return KNOWN_MEETINGS_PROVIDERS.includes(provider as KnownMeetingsProvider);
}

function deriveMeetingsSignals(
  envelopes: readonly CaptureEnvelope[],
  _context: SignalDerivationContext
): Map<string, PersonSignals> {
  const contacts = new Map<string, PersonSignals>();

  for (const envelope of envelopes) {
    // Meetings adapters already filter by category - process all envelopes
    for (const participant of envelope.participants) {
      if (!participant.email) continue;

      contacts.set(participant.email, {
        ...contacts.get(participant.email),
        has_calendar_meeting: true,
      });
    }
  }

  return contacts;
}

// Meetings adapters already filter by category - no need for source type check

/**
 * Action items arrive in provider-specific shapes: an array of strings, an
 * array of { text } objects, or one newline/bullet-joined string (Fireflies).
 * Normalize all of them to a clean string array for the card's list.
 */
function normalizeActionItems(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) =>
        typeof item === "string"
          ? item
          : item && typeof item === "object"
            ? ((item as Record<string, unknown>).text as string) ??
              ((item as Record<string, unknown>).title as string) ??
              null
            : null
      )
      .filter((item): item is string => Boolean(item?.trim()))
      .map((item) => item.trim());
  }
  if (typeof value === "string" && value.trim()) {
    return value
      .split("\n")
      .map((line) => line.replace(/^[-*•]\s*/, "").trim())
      .filter(Boolean);
  }
  return [];
}

/**
 * Fireflies transcript (GraphQL Transcript object): { id, title, date,
 * duration (minutes, float), participants: [emails] or meeting_attendees:
 * [{ displayName, email }], summary: { overview, action_items, keywords },
 * transcript_url }.
 */
function normalizeFireflies(payload: unknown): CaptureEnvelope | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;

  const externalId = (record.id as string) ?? (record.transcriptId as string);
  if (!externalId) return null;

  const title = (record.title as string) ?? null;

  const attendeeRecords =
    (record.meeting_attendees as Array<Record<string, unknown>>) ?? [];
  const participantEmails = Array.isArray(record.participants)
    ? (record.participants as unknown[]).filter(
        (p): p is string => typeof p === "string" && p.includes("@")
      )
    : [];

  const participants: EnvelopeParticipant[] = [];
  const participantNames: string[] = [];
  const seen = new Set<string>();

  for (const attendee of attendeeRecords) {
    const email = (attendee.email as string)?.toLowerCase();
    const name = (attendee.displayName as string) ?? (attendee.name as string) ?? null;
    if (name) participantNames.push(name);
    if (email && !seen.has(email)) {
      seen.add(email);
      participants.push({ email, name, role: "attendee" });
    }
  }
  for (const email of participantEmails) {
    const lower = email.toLowerCase();
    if (!seen.has(lower)) {
      seen.add(lower);
      participants.push({ email: lower, name: null, role: "attendee" });
    }
  }

  const summaryRecord = record.summary as Record<string, unknown> | string | undefined;
  const summary =
    typeof summaryRecord === "string"
      ? summaryRecord
      : ((summaryRecord?.overview as string) ?? null);
  const actionItems = normalizeActionItems(
    typeof summaryRecord === "object" ? summaryRecord?.action_items : record.action_items
  );

  // Fireflies date is epoch milliseconds; duration is minutes (float).
  const rawDate = record.date;
  const occurredAt =
    typeof rawDate === "number"
      ? new Date(rawDate).toISOString()
      : ((rawDate as string) ?? null);
  const duration = record.duration;
  const durationMinutes =
    typeof duration === "number" ? Math.round(duration) : null;

  return {
    sourceType: "fireflies",
    captureType: "meeting",
    externalId,
    title,
    occurredAt,
    participants,
    threadId: null,
    extracted: {
      title,
      duration_minutes: durationMinutes,
      participants:
        participantNames.length > 0
          ? participantNames
          : participants.map((p) => p.email).filter((e): e is string => e !== null),
      summary,
      action_items: actionItems,
      deep_link: (record.transcript_url as string) ?? null,
    },
    raw: {
      meetingId: externalId,
      source: "composio_trigger",
    },
    noise: null,
  };
}

function normalizeGenericMeetings(
  payload: unknown,
  sourceType: CaptureSourceType
): CaptureEnvelope | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;

  const externalId =
    (record.id as string) ??
    (record.meetingId as string) ??
    (record.transcriptId as string);
  if (!externalId) return null;

  const title =
    (record.title as string) ??
    (record.meetingTitle as string) ??
    null;

  const attendees = (record.attendees as Array<Record<string, unknown>>) ?? [];
  const participants: EnvelopeParticipant[] = [];
  const participantNames: string[] = [];

  for (const attendee of attendees) {
    const email = (attendee.email as string)?.toLowerCase();
    const name = (attendee.name as string) ?? null;
    if (name) participantNames.push(name);
    if (email) {
      participants.push({
        email,
        name,
        role: "attendee",
      });
    }
  }

  const duration = record.duration;
  const durationMinutes =
    typeof duration === "number" ? Math.round(duration) : null;

  return {
    sourceType,
    captureType: "meeting",
    externalId,
    title,
    occurredAt: (record.date as string) ?? (record.startTime as string) ?? null,
    participants,
    threadId: null,
    extracted: {
      title,
      duration_minutes: durationMinutes,
      participants:
        participantNames.length > 0
          ? participantNames
          : participants.map((p) => p.email).filter((e): e is string => e !== null),
      summary: (record.summary as string) ?? null,
      action_items: normalizeActionItems(record.action_items),
    },
    raw: {
      meetingId: externalId,
      source: "composio_trigger",
    },
    noise: null,
  };
}

/**
 * Create a meetings adapter for ANY provider.
 * Known providers get specific parsing; unknown get generic extraction.
 */
export function createMeetingsCategoryAdapter(provider: string): CaptureAdapter {
  const triggerSlugs = isKnownMeetingsProvider(provider)
    ? MEETINGS_TRIGGER_SLUGS[provider]
    : []; // Unknown providers: triggers come from DB

  return {
    sourceType: provider,
    toolkit: provider,
    triggerSlugs,
    deriveSignals: deriveMeetingsSignals,

    normalize(payload: unknown): CaptureEnvelope | null {
      switch (provider) {
        case "fireflies":
          return normalizeFireflies(payload);
        default:
          return normalizeGenericMeetings(payload, provider);
      }
    },
  };
}

/** Known provider adapters (for backward compatibility). */
export const meetingsCategoryAdapters = KNOWN_MEETINGS_PROVIDERS.map(
  createMeetingsCategoryAdapter
);

/**
 * Get meetings adapter for ANY provider in the meetings category.
 * Always returns an adapter — unknown providers get generic extraction.
 */
export function getMeetingsAdapter(provider: string): CaptureAdapter {
  return createMeetingsCategoryAdapter(provider);
}
