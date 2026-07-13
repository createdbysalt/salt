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

type MessagingProvider = "slack";

const MESSAGING_PROVIDERS: MessagingProvider[] = ["slack"];

const MESSAGING_TRIGGER_SLUGS: Record<MessagingProvider, string[]> = {
  slack: [
    "SLACK_CHANNEL_MESSAGE_RECEIVED",
    "SLACK_DIRECT_MESSAGE_RECEIVED",
  ],
};

function deriveMessagingSignals(
  envelopes: readonly CaptureEnvelope[],
  _context: SignalDerivationContext
): Map<string, PersonSignals> {
  const contacts = new Map<string, PersonSignals>();

  for (const envelope of envelopes) {
    if (!isMessagingSource(envelope.sourceType)) continue;

    for (const participant of envelope.participants) {
      if (!participant.email) continue;

      contacts.set(participant.email, {
        ...contacts.get(participant.email),
      });
    }
  }

  return contacts;
}

function isMessagingSource(sourceType: CaptureSourceType): boolean {
  return MESSAGING_PROVIDERS.includes(sourceType as MessagingProvider);
}

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

export function createMessagingCategoryAdapter(
  provider: MessagingProvider
): CaptureAdapter {
  const triggerSlugs = MESSAGING_TRIGGER_SLUGS[provider] ?? [];

  return {
    sourceType: provider as CaptureSourceType,
    toolkit: provider,
    triggerSlugs,
    deriveSignals: deriveMessagingSignals,

    normalize(payload: unknown): CaptureEnvelope | null {
      switch (provider) {
        case "slack":
          return normalizeSlack(payload);
        default:
          return normalizeGenericMessaging(payload, provider as CaptureSourceType);
      }
    },
  };
}

export const messagingCategoryAdapters = MESSAGING_PROVIDERS.map(
  createMessagingCategoryAdapter
);

export function getMessagingAdapter(provider: string): CaptureAdapter | null {
  if (!MESSAGING_PROVIDERS.includes(provider as MessagingProvider)) {
    return null;
  }
  return createMessagingCategoryAdapter(provider as MessagingProvider);
}

export const getCommunicationAdapter = getMessagingAdapter;
