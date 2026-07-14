/**
 * Messaging Category Adapter (Captures V2).
 *
 * Handles messaging sources: slack, etc.
 */

import type {
  CaptureAdapter,
  CaptureEnvelope,
  EnvelopeParticipant,
  SignalDerivationContext,
} from "../types";
import type { PersonSignals } from "@/app/_features/capture/services/system-plays/person-signals";
import type { CaptureSourceType } from "@/app/_features/capture/types";

type KnownMessagingProvider = "slack";

const KNOWN_MESSAGING_PROVIDERS: KnownMessagingProvider[] = ["slack"];

const MESSAGING_TRIGGER_SLUGS: Record<KnownMessagingProvider, string[]> = {
  slack: [
    "SLACK_CHANNEL_MESSAGE_RECEIVED",
    "SLACK_DIRECT_MESSAGE_RECEIVED",
  ],
};

function isKnownMessagingProvider(provider: string): provider is KnownMessagingProvider {
  return KNOWN_MESSAGING_PROVIDERS.includes(provider as KnownMessagingProvider);
}

function deriveMessagingSignals(
  envelopes: readonly CaptureEnvelope[],
  _context: SignalDerivationContext
): Map<string, PersonSignals> {
  const contacts = new Map<string, PersonSignals>();

  for (const envelope of envelopes) {
    // Messaging adapters already filter by category - process all envelopes
    for (const participant of envelope.participants) {
      if (!participant.email) continue;

      contacts.set(participant.email, {
        ...contacts.get(participant.email),
      });
    }
  }

  return contacts;
}

// Messaging adapters already filter by category - no need for source type check

function normalizeSlack(payload: unknown): CaptureEnvelope | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;

  const externalId =
    (record.ts as string) ??
    (record.client_msg_id as string) ??
    (record.message_id as string);
  if (!externalId) return null;

  const text = (record.text as string) ?? null;
  const channel = (record.channel as string) ?? null;
  const user = record.user as Record<string, unknown> | undefined;

  const participants: EnvelopeParticipant[] = [];
  if (user?.email) {
    participants.push({
      email: (user.email as string).toLowerCase(),
      name: (user.name as string) ?? (user.real_name as string) ?? null,
      role: "from",
    });
  }

  return {
    sourceType: "slack" as CaptureSourceType,
    captureType: "message",
    externalId,
    title: text?.slice(0, 100) ?? null,
    occurredAt: record.ts
      ? new Date(parseFloat(record.ts as string) * 1000).toISOString()
      : null,
    participants,
    threadId: (record.thread_ts as string) ?? channel ?? null,
    extracted: {
      text,
      channel,
      sender_email: participants[0]?.email ?? null,
      sender_name: participants[0]?.name ?? null,
    },
    raw: {
      messageId: externalId,
      source: "composio_trigger",
    },
    noise: null,
  };
}

function normalizeGenericMessaging(
  payload: unknown,
  sourceType: CaptureSourceType
): CaptureEnvelope | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;

  const externalId =
    (record.id as string) ??
    (record.messageId as string) ??
    (record.message_id as string);
  if (!externalId) return null;

  const text =
    (record.text as string) ??
    (record.content as string) ??
    (record.body as string) ??
    null;

  return {
    sourceType,
    captureType: "message",
    externalId,
    title: text?.slice(0, 100) ?? null,
    occurredAt: (record.timestamp as string) ?? (record.created_at as string) ?? null,
    participants: [],
    threadId: (record.threadId as string) ?? (record.channel as string) ?? null,
    extracted: {
      text,
    },
    raw: {
      messageId: externalId,
      source: "composio_trigger",
    },
    noise: null,
  };
}

/**
 * Create a messaging adapter for ANY provider.
 * Known providers get specific parsing; unknown get generic extraction.
 */
export function createMessagingCategoryAdapter(provider: string): CaptureAdapter {
  const triggerSlugs = isKnownMessagingProvider(provider)
    ? MESSAGING_TRIGGER_SLUGS[provider]
    : []; // Unknown providers: triggers come from DB

  return {
    sourceType: provider as CaptureSourceType,
    toolkit: provider,
    triggerSlugs,
    deriveSignals: deriveMessagingSignals,

    normalize(payload: unknown): CaptureEnvelope | null {
      // Route known providers to specific parsing
      switch (provider) {
        case "slack":
          return normalizeSlack(payload);
        default:
          // Any unknown messaging provider gets generic extraction
          return normalizeGenericMessaging(payload, provider as CaptureSourceType);
      }
    },
  };
}

/** Known provider adapters (for backward compatibility). */
export const messagingCategoryAdapters = KNOWN_MESSAGING_PROVIDERS.map(
  createMessagingCategoryAdapter
);

/**
 * Get messaging adapter for ANY provider in the communication category.
 * Always returns an adapter — unknown providers get generic extraction.
 */
export function getMessagingAdapter(provider: string): CaptureAdapter {
  return createMessagingCategoryAdapter(provider);
}

export const getCommunicationAdapter = getMessagingAdapter;
