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

type MeetingsProvider = "fireflies" | "otter";

const MEETINGS_PROVIDERS: MeetingsProvider[] = ["fireflies", "otter"];

const MEETINGS_TRIGGER_SLUGS: Record<MeetingsProvider, string[]> = {
  fireflies: [], // No triggers available yet - backfill only
  otter: [], // No triggers available yet - backfill only
};

function deriveMeetingsSignals(
  envelopes: readonly CaptureEnvelope[],
  _context: SignalDerivationContext
): Map<string, PersonSignals> {
  const contacts = new Map<string, PersonSignals>();

  for (const envelope of envelopes) {
    if (!isMeetingsSource(envelope.sourceType)) continue;

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

function isMeetingsSource(sourceType: CaptureSourceType): boolean {
  return MEETINGS_PROVIDERS.includes(sourceType as MeetingsProvider);
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

  for (const attendee of attendees) {
    const email = (attendee.email as string)?.toLowerCase();
    if (email) {
      participants.push({
        email,
        name: (attendee.name as string) ?? null,
        role: "attendee",
      });
    }
  }

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
      duration: (record.duration as number) ?? null,
      summary: (record.summary as string) ?? null,
    },
    raw: {
      meetingId: externalId,
      source: "composio_trigger",
    },
    noise: null,
  };
}

export function createMeetingsCategoryAdapter(
  provider: MeetingsProvider
): CaptureAdapter {
  const triggerSlugs = MEETINGS_TRIGGER_SLUGS[provider] ?? [];

  return {
    sourceType: provider as CaptureSourceType,
    toolkit: provider,
    triggerSlugs,
    deriveSignals: deriveMeetingsSignals,

    normalize(payload: unknown): CaptureEnvelope | null {
      return normalizeGenericMeetings(payload, provider as CaptureSourceType);
    },
  };
}

export const meetingsCategoryAdapters = MEETINGS_PROVIDERS.map(
  createMeetingsCategoryAdapter
);

export function getMeetingsAdapter(provider: string): CaptureAdapter | null {
  if (!MEETINGS_PROVIDERS.includes(provider as MeetingsProvider)) {
    return null;
  }
  return createMeetingsCategoryAdapter(provider as MeetingsProvider);
}
