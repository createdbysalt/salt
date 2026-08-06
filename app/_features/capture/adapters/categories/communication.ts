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
import { isRecord, pickString, unwrapRecord } from "../normalize-utils";
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

/**
 * Slack trigger payloads — verified against the live Composio trigger
 * schemas 2026-08-05 (__fixtures__/composio-trigger-schemas.json):
 * { channel, channel_type, ts, text, user, team_id, thread_ts?, bot_id? }.
 * `user` is a STRING member ID (e.g. "U0AB12CD3"), never an object with an
 * email — participants stay empty until an enrichment fetch resolves the
 * member; the sender ID is preserved in extracted.sender_id.
 */
function normalizeSlack(payload: unknown): CaptureEnvelope | null {
  if (!isRecord(payload)) return null;
  const record = payload;

  const ts = pickString(record, ["ts", "client_msg_id", "message_id"]);
  if (!ts) return null;

  // Bot chatter is not a relationship signal — decline (recorded as a
  // webhook outcome by the ingress). Upstream triggerConfig filtering is
  // Phase 6; this keeps bots out of capture_events until then.
  const botId = pickString(record, ["bot_id"]);
  if (botId) return null;

  const text = pickString(record, ["text"]);
  const channel = pickString(record, ["channel", "channel_id"]);
  const channelType = pickString(record, ["channel_type"]);
  const senderId =
    typeof record.user === "string" && record.user.length > 0
      ? record.user
      : isRecord(record.user)
        ? pickString(record.user, ["id"])
        : null;

  // Legacy shape support: user as an object with email (enriched payloads).
  const participants: EnvelopeParticipant[] = [];
  if (isRecord(record.user)) {
    const email = pickString(record.user, ["email"]);
    if (email && email.includes("@")) {
      participants.push({
        email: email.toLowerCase(),
        name: pickString(record.user, ["name", "real_name"]),
        role: "from",
      });
    }
  }

  // ts is only unique within a channel — scope the dedupe key.
  const externalId = channel ? `${channel}:${ts}` : ts;

  const parsedTs = parseFloat(ts);

  return {
    sourceType: "slack" as CaptureSourceType,
    captureType: "message",
    externalId,
    title: text?.slice(0, 100) ?? null,
    occurredAt: Number.isFinite(parsedTs)
      ? new Date(parsedTs * 1000).toISOString()
      : null,
    participants,
    threadId: pickString(record, ["thread_ts"]) ?? channel ?? null,
    extracted: {
      text,
      channel,
      channel_type: channelType,
      sender_id: senderId,
      sender_email: participants[0]?.email ?? null,
      sender_name: participants[0]?.name ?? null,
      team_id: pickString(record, ["team_id"]),
    },
    raw: {
      messageId: externalId,
      channel,
      ts,
      source: "composio_trigger",
    },
    noise: {
      sourceType: "slack" as CaptureSourceType,
      fromEmail: participants[0]?.email ?? undefined,
      subject: text?.slice(0, 100) ?? undefined,
      bodyText: text ?? undefined,
      isSentByUser: false,
    },
  };
}

function normalizeGenericMessaging(
  payload: unknown,
  sourceType: CaptureSourceType
): CaptureEnvelope | null {
  if (!isRecord(payload)) return null;

  // Try one level of trigger nesting (message/data envelopes).
  const record = unwrapRecord(payload, ["message", "data", "event"]);

  const externalId =
    pickString(record, ["id", "messageId", "message_id", "ts"]) ??
    pickString(payload, ["id", "messageId", "message_id"]);
  if (!externalId) return null;

  const text = pickString(record, ["text", "content", "body"]);

  return {
    sourceType,
    captureType: "message",
    externalId,
    title: text?.slice(0, 100) ?? null,
    occurredAt:
      pickString(record, ["timestamp", "created_at", "createdAt"]) ?? null,
    participants: [],
    threadId:
      pickString(record, ["threadId", "thread_id", "thread_ts", "channel"]) ?? null,
    extracted: {
      text,
    },
    raw: {
      messageId: externalId,
      source: "composio_trigger",
    },
    noise: {
      sourceType,
      subject: text?.slice(0, 100) ?? undefined,
      bodyText: text ?? undefined,
      isSentByUser: false,
    },
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
