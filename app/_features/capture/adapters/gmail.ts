import type {
  CaptureAdapter,
  CaptureEnvelope,
  EnvelopeParticipant,
  SignalDerivationContext,
} from "./types";
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

/**
 * Gmail capture adapter (connector-platform Phase 3.4).
 *
 * Consumes GMAIL_NEW_GMAIL_MESSAGE trigger payloads (Composio polling
 * trigger; 1-minute interval on Salt's own OAuth client) AND metadata rows
 * from GMAIL_FETCH_EMAILS (the paginated backfill path — same fields, but
 * `preview` is an object instead of a string). Field names are parsed
 * defensively via shared parsers in `app/_lib/composio/parsers/gmail-rows.ts`.
 */

/** Wrap shared parseAddress to add role for CaptureEnvelope participants. */
export function parseAddress(
  input: string,
  role: EnvelopeParticipant["role"],
): EnvelopeParticipant {
  const parsed = parseAddressShared(input);
  return {
    name: parsed.name,
    email: parsed.email,
    role,
  };
}

function parseAddressList(
  value: unknown,
  role: EnvelopeParticipant["role"],
): EnvelopeParticipant[] {
  if (typeof value === "string") {
    return value
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => parseAddress(part, role));
  }
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === "string")
      .map((item) => parseAddress(item, role));
  }
  return [];
}

function isSelf(email: string, userEmail: string | null): boolean {
  return userEmail !== null && email === userEmail.toLowerCase();
}

/**
 * Fold gmail envelopes into per-contact signals (Phase 5.1). Bidirectional =
 * they wrote to you AND you wrote to them; you_initiated = any outbound to
 * them (creation-worthy even before a reply, per the admission criteria).
 */
function deriveGmailSignals(
  envelopes: readonly CaptureEnvelope[],
  context: SignalDerivationContext,
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
    if (envelope.sourceType !== "gmail") continue;
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

export const gmailCaptureAdapter: CaptureAdapter = {
  sourceType: "gmail",
  toolkit: "gmail",
  triggerSlugs: ["GMAIL_NEW_GMAIL_MESSAGE"],
  deriveSignals: deriveGmailSignals,

  normalize(payload: unknown): CaptureEnvelope | null {
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
      title: subject ?? snippet?.slice(0, 100) ?? null,
      occurredAt,
      participants,
      threadId,
      extracted: {
        subject,
        snippet: snippet?.slice(0, 500) ?? null,
        from: fromParticipant?.email ?? null,
        fromName: fromParticipant?.name ?? null,
        to: participants.filter((p) => p.role === "to").map((p) => p.email),
        labels,
        isSentByUser,
      },
      raw: {
        messageId: externalId,
        threadId,
        subject,
        snippet: snippet?.slice(0, 500) ?? null,
        sender: fromRaw,
        labels,
        source: "composio_trigger",
      },
      noise: {
        sourceType: "gmail",
        fromEmail: fromParticipant?.email ?? undefined,
        subject: subject ?? undefined,
        bodyText: snippet ?? undefined,
        labels,
        isSentByUser,
      },
    };
  },
};
