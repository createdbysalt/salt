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

/**
 * Create a meetings adapter for ANY provider.
 * Known providers get specific parsing; unknown get generic extraction.
 */
export function createMeetingsCategoryAdapter(provider: string): CaptureAdapter {
  const triggerSlugs = isKnownMeetingsProvider(provider)
    ? MEETINGS_TRIGGER_SLUGS[provider]
    : []; // Unknown providers: triggers come from DB

  return {
    sourceType: provider as CaptureSourceType,
    toolkit: provider,
    triggerSlugs,
    deriveSignals: deriveMeetingsSignals,

    normalize(payload: unknown): CaptureEnvelope | null {
      // All meetings providers currently use generic extraction
      return normalizeGenericMeetings(payload, provider as CaptureSourceType);
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
