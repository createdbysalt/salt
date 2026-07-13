/**
 * Email Category Adapter (Captures V2 Phase 1).
 *
 * Handles all email-like sources: gmail, outlook, yahoo_mail, etc.
 * Uses shared parsers where available, falls back to generic extraction.
 *
 * Category adapter pattern:
 * - One adapter per category (not per app)
 * - Routes by provider for provider-specific parsing
 * - Falls back to generic extraction for unknown providers
 */

import type {
  CaptureAdapter,
  CaptureEnvelope,
  EnvelopeParticipant,
  SignalDerivationContext,
} from "../types";
import type { PersonSignals } from "@/app/_features/capture/services/system-plays/person-signals";
import {
  parseAddress as parseAddressShared,
  extractMessageIdFromRow,
  extractSenderFromRow,
  extractSubjectFromRow,
  extractSnippetFromRow,
  extractThreadIdFromRow,
  extractTimestampFromRow,
  extractRecipientsFromRow,
  extractLabelsFromRow,
} from "@/app/_lib/composio/parsers/gmail-rows";
import type { CaptureSourceType } from "@/app/_features/capture/types";

type EmailProvider = "gmail" | "outlook" | "yahoo_mail";

const EMAIL_PROVIDERS: EmailProvider[] = ["gmail", "outlook", "yahoo_mail"];

const EMAIL_TRIGGER_SLUGS: Record<EmailProvider, string[]> = {
  gmail: ["GMAIL_NEW_GMAIL_MESSAGE"],
  outlook: ["OUTLOOK_MESSAGE_TRIGGER", "OUTLOOK_SENT_MESSAGE_TRIGGER"],
  yahoo_mail: [], // No triggers available yet - backfill only
};

function parseAddress(
  input: string,
  role: EnvelopeParticipant["role"]
): EnvelopeParticipant {
  const parsed = parseAddressShared(input);
  return {
    name: parsed.name,
    email: parsed.email,
    role,
  };
}

function isSelf(email: string | null, userEmail: string | null): boolean {
  if (!email || !userEmail) return false;
  return email.toLowerCase() === userEmail.toLowerCase();
}

function deriveEmailSignals(
  envelopes: readonly CaptureEnvelope[],
  context: SignalDerivationContext
): Map<string, PersonSignals> {
  const contacts = new Map<
    string,
    PersonSignals & { hasInbound?: boolean; hasOutbound?: boolean }
  >();

  const bump = (email: string, occurredAt: string | null, direction: "in" | "out") => {
    const entry = contacts.get(email) ?? { email_count: 0 };
    entry.email_count = (entry.email_count ?? 0) + 1;
    if (occurredAt && (!entry.last_email_date || occurredAt > entry.last_email_date)) {
      entry.last_email_date = occurredAt;
    }
    if (direction === "in") entry.hasInbound = true;
    else entry.hasOutbound = true;
    contacts.set(email, entry);
  };

  for (const envelope of envelopes) {
    if (!isEmailSource(envelope.sourceType)) continue;
    const isSent = envelope.extracted.isSentByUser === true;

    if (isSent) {
      for (const p of envelope.participants) {
        if ((p.role !== "to" && p.role !== "cc") || !p.email) continue;
        if (isSelf(p.email, context.userEmail)) continue;
        bump(p.email, envelope.occurredAt, "out");
      }
    } else {
      const from = envelope.participants.find((p) => p.role === "from");
      if (from?.email && !isSelf(from.email, context.userEmail)) {
        bump(from.email, envelope.occurredAt, "in");
      }
    }
  }

  const signals = new Map<string, PersonSignals>();
  for (const [email, entry] of contacts) {
    const { hasInbound, hasOutbound, ...rest } = entry;
    signals.set(email, {
      ...rest,
      is_bidirectional_thread: Boolean(hasInbound && hasOutbound),
      you_initiated: Boolean(hasOutbound),
    });
  }
  return signals;
}

function isEmailSource(sourceType: CaptureSourceType): boolean {
  return EMAIL_PROVIDERS.includes(sourceType as EmailProvider);
}

function normalizeGmail(payload: unknown): CaptureEnvelope | null {
  const externalId = extractMessageIdFromRow(payload);
  if (!externalId) return null;

  const subject = extractSubjectFromRow(payload);
  const snippet = extractSnippetFromRow(payload);
  const fromRaw = extractSenderFromRow(payload);
  const threadId = extractThreadIdFromRow(payload);
  const occurredAt = extractTimestampFromRow(payload);
  const labels = extractLabelsFromRow(payload);
  const toList = extractRecipientsFromRow(payload);

  const participants: EnvelopeParticipant[] = [
    ...(fromRaw ? [parseAddress(fromRaw, "from")] : []),
    ...toList.map((addr) => parseAddress(addr, "to")),
  ];

  const fromParticipant = participants.find((p) => p.role === "from");
  const isSentByUser = labels.includes("SENT");

  return {
    sourceType: "gmail",
    captureType: "message",
    externalId,
    title: subject,
    occurredAt,
    participants,
    threadId,
    extracted: {
      subject,
      snippet,
      sender_email: fromParticipant?.email ?? null,
      sender_name: fromParticipant?.name ?? null,
      labels,
      thread_id: threadId,
      isSentByUser,
    },
    raw: {
      messageId: externalId,
      source: "composio_trigger",
    },
    noise: {
      sourceType: "gmail",
      fromEmail: fromParticipant?.email ?? undefined,
      subject: subject ?? undefined,
      labels,
      isSentByUser,
    },
  };
}

function normalizeOutlook(payload: unknown): CaptureEnvelope | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;

  const externalId =
    (record.id as string) ??
    (record.messageId as string) ??
    (record.internetMessageId as string);
  if (!externalId) return null;

  const subject = (record.subject as string) ?? null;
  const bodyPreview = (record.bodyPreview as string) ?? null;
  const fromRaw = record.from as Record<string, unknown> | undefined;
  const fromEmail =
    (fromRaw?.emailAddress as Record<string, unknown>)?.address as string | undefined;
  const fromName =
    (fromRaw?.emailAddress as Record<string, unknown>)?.name as string | undefined;
  const toRecipients = (record.toRecipients as Array<Record<string, unknown>>) ?? [];
  const conversationId = (record.conversationId as string) ?? null;
  const receivedDateTime = (record.receivedDateTime as string) ?? null;

  const participants: EnvelopeParticipant[] = [];
  if (fromEmail) {
    participants.push({ email: fromEmail.toLowerCase(), name: fromName ?? null, role: "from" });
  }
  for (const recipient of toRecipients) {
    const addr = recipient.emailAddress as Record<string, unknown> | undefined;
    const email = (addr?.address as string)?.toLowerCase();
    const name = addr?.name as string | undefined;
    if (email) {
      participants.push({ email, name: name ?? null, role: "to" });
    }
  }

  const isSentByUser = record.isDraft === false && record.sentDateTime !== undefined;

  return {
    sourceType: "outlook" as CaptureSourceType,
    captureType: "message",
    externalId,
    title: subject,
    occurredAt: receivedDateTime,
    participants,
    threadId: conversationId,
    extracted: {
      subject,
      snippet: bodyPreview,
      sender_email: fromEmail?.toLowerCase() ?? null,
      sender_name: fromName ?? null,
      thread_id: conversationId,
      isSentByUser,
    },
    raw: {
      messageId: externalId,
      source: "composio_trigger",
    },
    noise: {
      sourceType: "outlook" as CaptureSourceType,
      fromEmail: fromEmail?.toLowerCase() ?? undefined,
      subject: subject ?? undefined,
      isSentByUser,
    },
  };
}

function normalizeGenericEmail(
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

  const subject =
    (record.subject as string) ??
    (record.title as string) ??
    null;

  const fromRaw =
    (record.from as string) ??
    (record.sender as string) ??
    (record.fromEmail as string);

  const participants: EnvelopeParticipant[] = fromRaw
    ? [parseAddress(fromRaw, "from")]
    : [];

  const occurredAt =
    (record.date as string) ??
    (record.receivedAt as string) ??
    (record.timestamp as string) ??
    null;

  return {
    sourceType,
    captureType: "message",
    externalId,
    title: subject,
    occurredAt,
    participants,
    threadId: (record.threadId as string) ?? (record.conversationId as string) ?? null,
    extracted: {
      subject,
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

export function createEmailCategoryAdapter(provider: EmailProvider): CaptureAdapter {
  const triggerSlugs = EMAIL_TRIGGER_SLUGS[provider] ?? [];

  return {
    sourceType: provider as CaptureSourceType,
    toolkit: provider,
    triggerSlugs,
    deriveSignals: deriveEmailSignals,

    normalize(payload: unknown): CaptureEnvelope | null {
      switch (provider) {
        case "gmail":
          return normalizeGmail(payload);
        case "outlook":
          return normalizeOutlook(payload);
        default:
          return normalizeGenericEmail(payload, provider as CaptureSourceType);
      }
    },
  };
}

export const emailCategoryAdapters = EMAIL_PROVIDERS.map(createEmailCategoryAdapter);

export function getEmailAdapter(provider: string): CaptureAdapter | null {
  if (!EMAIL_PROVIDERS.includes(provider as EmailProvider)) {
    return null;
  }
  return createEmailCategoryAdapter(provider as EmailProvider);
}
