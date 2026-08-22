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
import {
  emailEntity,
  firstParticipantEmailEntity,
  verbatimEntity,
} from "../feedback-entity";
import { isRecord, pickString, unwrapRecord } from "../normalize-utils";
import type { PersonSignals } from "@/app/_features/memory/records/person-signals";
import type { DerivedPersonFields } from "@/app/_features/capture/services/producers/person-field-types";
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
 * Field-signal derivation (producer roadmap track 1): a messaging profile is
 * a mini-CRM — real name, title, timezone, sometimes phone, maintained by
 * the person themselves. Enriched payloads carry those as sender_* keys.
 *
 * Recency: only DMs attest contact. Channel chatter isn't addressed to you,
 * so it doesn't move the relationship clock.
 */
function deriveMessagingFieldSignals(
  envelopes: readonly CaptureEnvelope[],
): Map<string, DerivedPersonFields> {
  const contacts = new Map<string, DerivedPersonFields>();

  for (const envelope of envelopes) {
    const email = envelope.extracted.sender_email as string | null;
    if (!email) continue;

    const existing = contacts.get(email) ?? { signalValues: {} };
    const name = envelope.extracted.sender_name as string | null;
    const title = envelope.extracted.sender_title as string | null;
    const phone = envelope.extracted.sender_phone as string | null;
    const timezone = envelope.extracted.sender_timezone as string | null;
    if (name && !existing.signalValues.person_name_extracted) {
      existing.signalValues.person_name_extracted = name;
    }
    if (title && !existing.signalValues.person_title_extracted) {
      existing.signalValues.person_title_extracted = title;
    }
    if (phone && !existing.signalValues.person_phone_extracted) {
      existing.signalValues.person_phone_extracted = phone;
    }
    if (timezone && !existing.signalValues.person_timezone_detected) {
      existing.signalValues.person_timezone_detected = timezone;
    }

    if (envelope.extracted.is_dm === true && envelope.occurredAt) {
      const current = existing.contactAt;
      if (!current || envelope.occurredAt > current.at) {
        existing.contactAt = {
          at: envelope.occurredAt,
          signal: "capture_message_received",
        };
      }
    }

    contacts.set(email, existing);
  }

  return contacts;
}

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
  // Slack users.info-shaped objects also carry profile.title / profile.phone
  // / tz — the mini-CRM fields the field producer harvests.
  const participants: EnvelopeParticipant[] = [];
  let senderTitle: string | null = null;
  let senderPhone: string | null = null;
  let senderTimezone: string | null = null;
  if (isRecord(record.user)) {
    const profile = isRecord(record.user.profile) ? record.user.profile : null;
    const email =
      pickString(record.user, ["email"]) ??
      (profile ? pickString(profile, ["email"]) : null);
    if (email && email.includes("@")) {
      participants.push({
        email: email.toLowerCase(),
        name:
          pickString(record.user, ["name", "real_name"]) ??
          (profile ? pickString(profile, ["real_name", "display_name"]) : null),
        role: "from",
      });
    }
    senderTitle =
      pickString(record.user, ["title"]) ??
      (profile ? pickString(profile, ["title"]) : null);
    senderPhone =
      pickString(record.user, ["phone"]) ??
      (profile ? pickString(profile, ["phone"]) : null);
    senderTimezone =
      pickString(record.user, ["tz", "timezone"]) ??
      (profile ? pickString(profile, ["tz"]) : null);
  }

  // ts is only unique within a channel — scope the dedupe key.
  const externalId = channel ? `${channel}:${ts}` : ts;

  const parsedTs = parseFloat(ts);

  return {
    sourceType: "slack",
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
      // im = direct message, mpim = multi-party DM — both render without a
      // channel row in the card.
      is_dm: channelType === "im" || channelType === "mpim",
      sender_id: senderId,
      sender_email: participants[0]?.email ?? null,
      sender_name: participants[0]?.name ?? null,
      sender_title: senderTitle,
      sender_phone: senderPhone,
      sender_timezone: senderTimezone,
      // Trigger payloads carry only the member ID; the display name needs a
      // member-cache/enrichment fetch (capture-detail-contract.md).
      needs_hydration: participants.length === 0 && senderId !== null,
      team_id: pickString(record, ["team_id"]),
    },
    raw: {
      messageId: externalId,
      channel,
      ts,
      source: "composio_trigger",
    },
    noise: {
      sourceType: "slack",
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

  // Sender shapes vary by app (from/sender/user/author); fold whatever is
  // present into the shared sender_* keys the field producer reads.
  const sender = ["from", "sender", "user", "author"]
    .map((key) => record[key])
    .find(isRecord);
  const senderEmailRaw = sender ? pickString(sender, ["email"]) : null;
  const senderEmail =
    senderEmailRaw && senderEmailRaw.includes("@")
      ? senderEmailRaw.toLowerCase()
      : null;
  const channelType = pickString(record, ["channel_type", "channelType"]);

  return {
    sourceType,
    captureType: "message",
    externalId,
    title: text?.slice(0, 100) ?? null,
    occurredAt:
      pickString(record, ["timestamp", "created_at", "createdAt"]) ?? null,
    participants: senderEmail
      ? [
          {
            email: senderEmail,
            name: sender ? pickString(sender, ["name", "real_name", "username"]) : null,
            role: "from",
          },
        ]
      : [],
    threadId:
      pickString(record, ["threadId", "thread_id", "thread_ts", "channel"]) ?? null,
    extracted: {
      text,
      is_dm:
        record.is_dm === true ||
        channelType === "dm" ||
        channelType === "im" ||
        channelType === "mpim",
      sender_email: senderEmail,
      sender_name: sender
        ? pickString(sender, ["name", "real_name", "username"])
        : null,
      sender_title: sender ? pickString(sender, ["title"]) : null,
      sender_phone: sender ? pickString(sender, ["phone"]) : null,
      sender_timezone: sender ? pickString(sender, ["tz", "timezone"]) : null,
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
    sourceType: provider,
    toolkit: provider,
    triggerSlugs,
    deriveSignals: deriveMessagingSignals,
    deriveFieldSignals: deriveMessagingFieldSignals,

    extractFeedbackEntity(envelope) {
      // Channel-scoped rules win when the capture carries a channel; DMs and
      // channel-less payloads fall back to the author (member id or email).
      return (
        verbatimEntity(envelope, "channel", "channel") ??
        verbatimEntity(envelope, "sender_id", "author") ??
        emailEntity(envelope, "sender_email", "author")
      );
    },

    normalize(payload: unknown): CaptureEnvelope | null {
      // Route known providers to specific parsing
      switch (provider) {
        case "slack":
          return normalizeSlack(payload);
        default:
          // Any unknown messaging provider gets generic extraction
          return normalizeGenericMessaging(payload, provider);
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
