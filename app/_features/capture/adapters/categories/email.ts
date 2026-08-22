/**
 * Email Category Adapter (Captures V2 Phase 1).
 *
 * Handles all email-like sources: gmail, outlook, etc.
 * Uses shared parsers where available, falls back to generic extraction.
 *
 * Category adapter pattern:
 * - One adapter per category (not per app)
 * - Routes by provider for provider-specific parsing
 * - Falls back to generic extraction for unknown providers
 *
 * Enrichment fields extracted:
 * - CC/BCC recipients
 * - Attachments metadata (hasAttachments, count, names)
 * - Reply detection (In-Reply-To header or Re: prefix)
 * - Deep link to view in source app
 */

import type {
  CaptureAdapter,
  CaptureEnvelope,
  EnvelopeParticipant,
  SignalDerivationContext,
} from "../types";
import { emailEntity } from "../feedback-entity";
import type { PersonSignals } from "@/app/_features/memory/records/person-signals";
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

type KnownEmailProvider = "gmail" | "outlook";

const KNOWN_EMAIL_PROVIDERS: KnownEmailProvider[] = ["gmail", "outlook"];

/**
 * Email source types the intelligence scan should cover. Single source of
 * truth so the scan follows this adapter as providers are added.
 *
 * capture_events.source_type is TEXT (Sources plan 5.2) — providers no longer
 * need DB enum membership. (yahoo_mail once sat in this list without being in
 * the enum, silently killing the email digest and daily intelligence scans;
 * the TEXT column removes that failure class.)
 */
export const EMAIL_SCAN_SOURCE_TYPES: readonly CaptureSourceType[] =
  KNOWN_EMAIL_PROVIDERS;

/** Attachment metadata for enrichment */
interface AttachmentMeta {
  name: string;
  contentType?: string;
  size?: number;
}

/** Extended extracted data for email enrichment */
interface EmailExtractedData extends Record<string, unknown> {
  subject: string | null;
  snippet: string | null;
  sender_email: string | null;
  sender_name: string | null;
  to: string[];
  cc: string[];
  bcc: string[];
  labels?: string[];
  thread_id: string | null;
  isSentByUser: boolean;
  is_reply: boolean;
  has_attachments: boolean;
  attachments: AttachmentMeta[];
  deep_link: string | null;
}

const EMAIL_TRIGGER_SLUGS: Record<KnownEmailProvider, string[]> = {
  gmail: ["GMAIL_NEW_GMAIL_MESSAGE"],
  outlook: ["OUTLOOK_MESSAGE_TRIGGER", "OUTLOOK_SENT_MESSAGE_TRIGGER"],
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
    // Email adapters already filter by category - just process all envelopes
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

function isKnownEmailProvider(provider: string): provider is KnownEmailProvider {
  return KNOWN_EMAIL_PROVIDERS.includes(provider as KnownEmailProvider);
}

function extractGmailCc(payload: unknown): string[] {
  if (!payload || typeof payload !== "object") return [];
  const record = payload as Record<string, unknown>;
  const nested = typeof record.message === "object" && record.message !== null
    ? (record.message as Record<string, unknown>)
    : null;
  const cc = record.cc ?? record.ccRecipients ?? nested?.cc ?? nested?.ccRecipients;
  if (typeof cc === "string") {
    return cc.split(",").map((e) => e.trim()).filter(Boolean);
  }
  if (Array.isArray(cc)) {
    return cc.filter((e): e is string => typeof e === "string");
  }
  return [];
}

function extractGmailAttachments(payload: unknown): { hasAttachments: boolean; attachments: AttachmentMeta[] } {
  if (!payload || typeof payload !== "object") return { hasAttachments: false, attachments: [] };
  const record = payload as Record<string, unknown>;
  const nested = typeof record.message === "object" && record.message !== null
    ? (record.message as Record<string, unknown>)
    : null;

  const attachments = record.attachments ?? nested?.attachments;
  if (Array.isArray(attachments) && attachments.length > 0) {
    return {
      hasAttachments: true,
      attachments: attachments.map((att) => {
        if (typeof att === "object" && att !== null) {
          const a = att as Record<string, unknown>;
          return {
            name: (a.filename as string) ?? (a.name as string) ?? "unnamed",
            contentType: a.mimeType as string | undefined,
            size: typeof a.size === "number" ? a.size : undefined,
          };
        }
        return { name: "unnamed" };
      }),
    };
  }

  const hasAttachments = record.hasAttachments === true || nested?.hasAttachments === true;
  return { hasAttachments, attachments: [] };
}

function buildGmailDeepLink(messageId: string, threadId: string | null): string {
  const id = threadId ?? messageId;
  return `https://mail.google.com/mail/u/0/#inbox/${id}`;
}

/**
 * Headers the pre-ingest gate needs for marketing/bulk detection.
 * GMAIL_NEW_GMAIL_MESSAGE carries the raw Gmail API message payload under
 * `payload`, whose `headers` is an array of { name, value } pairs.
 */
const GATE_RELEVANT_HEADERS = new Set([
  "list-unsubscribe",
  "list-id",
  "precedence",
  "auto-submitted",
  "x-mailer",
  "in-reply-to",
  "references",
]);

/**
 * Filter a header list ({ name, value } pairs or a flat record) down to the
 * gate-relevant set. Shared across providers: Gmail's payload.headers and
 * Outlook's internetMessageHeaders carry the same pair shape.
 */
function filterGateHeaders(headerList: unknown): Record<string, string> {
  const result: Record<string, string> = {};

  if (Array.isArray(headerList)) {
    for (const entry of headerList) {
      if (!entry || typeof entry !== "object") continue;
      const h = entry as Record<string, unknown>;
      const name = typeof h.name === "string" ? h.name : null;
      const value = typeof h.value === "string" ? h.value : null;
      if (name && value && GATE_RELEVANT_HEADERS.has(name.toLowerCase())) {
        result[name] = value;
      }
    }
    return result;
  }

  // Already a flat record of header name -> value
  if (headerList && typeof headerList === "object") {
    for (const [name, value] of Object.entries(headerList as Record<string, unknown>)) {
      if (typeof value === "string" && GATE_RELEVANT_HEADERS.has(name.toLowerCase())) {
        result[name] = value;
      }
    }
  }

  return result;
}

function extractGmailHeaders(payload: unknown): Record<string, string> {
  if (!payload || typeof payload !== "object") return {};
  const record = payload as Record<string, unknown>;
  const nested = typeof record.message === "object" && record.message !== null
    ? (record.message as Record<string, unknown>)
    : null;

  // Gmail API shape: { payload: { headers: [{ name, value }] } }
  const apiPayload = (record.payload ?? nested?.payload) as
    | Record<string, unknown>
    | undefined;
  const headerList = apiPayload?.headers ?? record.headers ?? nested?.headers;
  return filterGateHeaders(headerList);
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
  const ccList = extractGmailCc(payload);
  const { hasAttachments, attachments } = extractGmailAttachments(payload);
  const headers = extractGmailHeaders(payload);

  const participants: EnvelopeParticipant[] = [
    ...(fromRaw ? [parseAddress(fromRaw, "from")] : []),
    ...toList.map((addr) => parseAddress(addr, "to")),
    ...ccList.map((addr) => parseAddress(addr, "cc")),
  ];

  const fromParticipant = participants.find((p) => p.role === "from");
  const isSentByUser = labels.includes("SENT");
  const isReply = detectReplyFromSubject(subject);
  const deepLink = buildGmailDeepLink(externalId, threadId);

  const extracted: EmailExtractedData = {
    subject,
    snippet: snippet?.slice(0, 500) ?? null,
    sender_email: fromParticipant?.email ?? null,
    sender_name: fromParticipant?.name ?? null,
    to: toList.map((addr) => parseAddress(addr, "to").email).filter((e): e is string => e !== null),
    cc: ccList.map((addr) => parseAddress(addr, "cc").email).filter((e): e is string => e !== null),
    bcc: [],
    labels,
    thread_id: threadId,
    isSentByUser,
    is_reply: isReply,
    has_attachments: hasAttachments,
    attachments,
    deep_link: deepLink,
  };

  return {
    sourceType: "gmail",
    captureType: "message",
    externalId,
    title: subject,
    occurredAt,
    participants,
    threadId,
    extracted,
    raw: {
      messageId: externalId,
      threadId,
      hasAttachments,
      // Pre-ingest gate reads raw.headers for List-Unsubscribe / Precedence /
      // Auto-Submitted checks (extractHeadersFromEnvelope).
      headers,
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

function extractOutlookRecipients(
  recipients: unknown,
  role: EnvelopeParticipant["role"]
): EnvelopeParticipant[] {
  if (!Array.isArray(recipients)) return [];
  const results: EnvelopeParticipant[] = [];
  for (const recipient of recipients) {
    if (!recipient || typeof recipient !== "object") continue;
    const rec = recipient as Record<string, unknown>;
    const addr = rec.emailAddress as Record<string, unknown> | undefined;
    const email = (addr?.address as string)?.toLowerCase();
    const name = addr?.name as string | undefined;
    if (!email) continue;
    results.push({ email, name: name ?? null, role });
  }
  return results;
}

function extractOutlookAttachments(record: Record<string, unknown>): AttachmentMeta[] {
  const attachments = record.attachments as Array<Record<string, unknown>> | undefined;
  if (!Array.isArray(attachments)) return [];
  return attachments
    .map((att) => ({
      name: (att.name as string) ?? "unnamed",
      contentType: att.contentType as string | undefined,
      size: typeof att.size === "number" ? att.size : undefined,
    }))
    .filter((a) => a.name);
}

function detectReplyFromSubject(subject: string | null): boolean {
  if (!subject) return false;
  const lower = subject.toLowerCase().trim();
  return lower.startsWith("re:") || lower.startsWith("fw:") || lower.startsWith("fwd:");
}

function buildOutlookDeepLink(record: Record<string, unknown>): string | null {
  if (typeof record.webLink === "string") return record.webLink;
  const id = record.id as string | undefined;
  if (!id) return null;
  return `https://outlook.office.com/mail/deeplink/read/${encodeURIComponent(id)}`;
}

function normalizeOutlook(payload: unknown): CaptureEnvelope | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;

  const externalId =
    (record.id as string) ??
    (record.messageId as string) ??
    (record.internetMessageId as string);
  if (!externalId) return null;

  // Check if this is a minimal payload (just messageId, no content)
  // Minimal payloads need hydration via API call to get full email
  const isMinimalPayload = !record.subject && !record.bodyPreview && !record.from;
  if (isMinimalPayload) {
    // Return a placeholder envelope that signals need for hydration
    return {
      sourceType: "outlook",
      captureType: "message",
      externalId,
      title: null,
      occurredAt: null,
      participants: [],
      threadId: null,
      extracted: {
        subject: null,
        snippet: null,
        sender_email: null,
        sender_name: null,
        to: [],
        cc: [],
        bcc: [],
        thread_id: null,
        isSentByUser: false,
        is_reply: false,
        has_attachments: false,
        attachments: [],
        deep_link: null,
        needs_hydration: true,
      },
      raw: {
        messageId: externalId,
        source: "composio_trigger",
        needs_hydration: true,
      },
      noise: null,
    };
  }

  const subject = (record.subject as string) ?? null;
  const bodyPreview = (record.bodyPreview as string) ?? null;
  const fromRaw = record.from as Record<string, unknown> | undefined;
  const fromEmail =
    (fromRaw?.emailAddress as Record<string, unknown>)?.address as string | undefined;
  const fromName =
    (fromRaw?.emailAddress as Record<string, unknown>)?.name as string | undefined;
  const conversationId = (record.conversationId as string) ?? null;
  const receivedDateTime = (record.receivedDateTime as string) ?? null;

  const toRecipients = extractOutlookRecipients(record.toRecipients, "to");
  const ccRecipients = extractOutlookRecipients(record.ccRecipients, "cc");
  const bccRecipients = extractOutlookRecipients(record.bccRecipients, "cc");

  const participants: EnvelopeParticipant[] = [];
  if (fromEmail) {
    participants.push({ email: fromEmail.toLowerCase(), name: fromName ?? null, role: "from" });
  }
  participants.push(...toRecipients, ...ccRecipients, ...bccRecipients);

  // Detect if user sent this email:
  // - Check parentFolderId for "sentitems" (Outlook folder naming)
  // - Or check if explicitly marked as sent vs received
  // - Fall back to false (assume received) if unclear
  const parentFolder = (record.parentFolderId as string)?.toLowerCase() ?? "";
  const inferredFolderName = (record.inferredFolderName as string)?.toLowerCase() ?? "";
  const isSentFolder = parentFolder.includes("sentitems") ||
                       parentFolder.includes("sent") ||
                       inferredFolderName === "sent";
  const isSentByUser = isSentFolder;

  const hasAttachments = record.hasAttachments === true;
  const attachments = extractOutlookAttachments(record);

  const isReplyFromHeaders = typeof record.inReplyTo === "string" && record.inReplyTo.length > 0;
  const isReply = isReplyFromHeaders || detectReplyFromSubject(subject);

  const deepLink = buildOutlookDeepLink(record);

  const extracted: EmailExtractedData = {
    subject,
    snippet: bodyPreview,
    sender_email: fromEmail?.toLowerCase() ?? null,
    sender_name: fromName ?? null,
    to: toRecipients.map((p) => p.email).filter((e): e is string => e !== null),
    cc: ccRecipients.map((p) => p.email).filter((e): e is string => e !== null),
    bcc: bccRecipients.map((p) => p.email).filter((e): e is string => e !== null),
    thread_id: conversationId,
    isSentByUser,
    is_reply: isReply,
    has_attachments: hasAttachments,
    attachments,
    deep_link: deepLink,
  };

  return {
    sourceType: "outlook",
    captureType: "message",
    externalId,
    title: subject,
    occurredAt: receivedDateTime,
    participants,
    threadId: conversationId,
    extracted,
    raw: {
      messageId: externalId,
      conversationId,
      hasAttachments,
      // Pre-ingest gate reads raw.headers for List-Unsubscribe / Precedence /
      // Auto-Submitted checks. Graph carries them as internetMessageHeaders
      // {name, value} pairs — present on hydrated fetches that request them;
      // absent means no header gating, same as before (2.7 parity with Gmail).
      headers: filterGateHeaders(record.internetMessageHeaders),
      source: "composio_trigger",
    },
    noise: {
      sourceType: "outlook",
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

  const snippet =
    (record.snippet as string) ??
    (record.bodyPreview as string) ??
    (record.preview as string) ??
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

  const threadId = (record.threadId as string) ?? (record.conversationId as string) ?? null;
  const isReply = detectReplyFromSubject(subject);
  const hasAttachments = record.hasAttachments === true;

  const extracted: EmailExtractedData = {
    subject,
    snippet,
    sender_email: participants[0]?.email ?? null,
    sender_name: participants[0]?.name ?? null,
    to: [],
    cc: [],
    bcc: [],
    thread_id: threadId,
    isSentByUser: false,
    is_reply: isReply,
    has_attachments: hasAttachments,
    attachments: [],
    deep_link: null,
  };

  return {
    sourceType,
    captureType: "message",
    externalId,
    title: subject,
    occurredAt,
    participants,
    threadId,
    extracted,
    raw: {
      messageId: externalId,
      source: "composio_trigger",
    },
    // Message captures must consult the noise gate (conformance harness) —
    // generic providers get the same gate inputs as known ones.
    noise: {
      sourceType,
      fromEmail: participants[0]?.email ?? undefined,
      subject: subject ?? undefined,
      isSentByUser: false,
    },
  };
}

/**
 * Create an email adapter for ANY provider.
 * Known providers get specific parsing; unknown get generic extraction.
 */
export function createEmailCategoryAdapter(provider: string): CaptureAdapter {
  const triggerSlugs = isKnownEmailProvider(provider)
    ? EMAIL_TRIGGER_SLUGS[provider]
    : []; // Unknown providers: triggers come from DB

  return {
    sourceType: provider,
    toolkit: provider,
    triggerSlugs,
    deriveSignals: deriveEmailSignals,

    extractFeedbackEntity(envelope) {
      return emailEntity(envelope, "sender_email", "sender_email");
    },

    normalize(payload: unknown): CaptureEnvelope | null {
      // Route known providers to specific parsing
      switch (provider) {
        case "gmail":
          return normalizeGmail(payload);
        case "outlook":
          return normalizeOutlook(payload);
        default:
          // Any unknown email provider gets generic extraction
          return normalizeGenericEmail(payload, provider);
      }
    },
  };
}

/** Known provider adapters (for backward compatibility). */
export const emailCategoryAdapters = KNOWN_EMAIL_PROVIDERS.map(createEmailCategoryAdapter);

/**
 * Get email adapter for ANY provider in the email category.
 * Always returns an adapter — unknown providers get generic extraction.
 */
export function getEmailAdapter(provider: string): CaptureAdapter {
  return createEmailCategoryAdapter(provider);
}
