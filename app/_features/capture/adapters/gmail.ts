import type {
  CaptureAdapter,
  CaptureEnvelope,
  EnvelopeParticipant,
  SignalDerivationContext,
} from "./types";
import type { PersonSignals } from "@/app/_features/capture/services/system-plays/person-signals";

/**
 * Gmail capture adapter (connector-platform Phase 3.4).
 *
 * Consumes GMAIL_NEW_GMAIL_MESSAGE trigger payloads (Composio polling
 * trigger; 1-minute interval on Salt's own OAuth client) AND metadata rows
 * from GMAIL_FETCH_EMAILS (the paginated backfill path — same fields, but
 * `preview` is an object instead of a string). Field names are parsed
 * defensively across the payload spellings Composio has shipped
 * (messageId/id, messageTimestamp/internalDate, sender/from) — the
 * conformance fixtures pin the shapes we've actually seen; when a live
 * capture reveals a new spelling, add a fixture, then extend.
 */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function firstString(...values: unknown[]): string | null {
  for (const value of values) {
    const parsed = str(value);
    if (parsed) return parsed;
  }
  return null;
}

/** "Ada Lovelace <ada@example.com>" | "ada@example.com" → participant. */
export function parseAddress(
  input: string,
  role: EnvelopeParticipant["role"],
): EnvelopeParticipant {
  const match = input.match(/^\s*"?([^"<]*)"?\s*<([^>]+)>\s*$/);
  if (match) {
    return {
      name: match[1].trim() || null,
      email: match[2].trim().toLowerCase(),
      role,
    };
  }
  const trimmed = input.trim();
  return {
    name: null,
    email: trimmed.includes("@") ? trimmed.toLowerCase() : null,
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

function toIso(value: unknown): string | null {
  if (typeof value === "string") {
    const ms = /^\d+$/.test(value) ? Number(value) : Date.parse(value);
    if (!Number.isNaN(ms)) return new Date(ms).toISOString();
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    // Gmail internalDate is epoch millis; trigger payloads sometimes send seconds.
    const ms = value > 10_000_000_000 ? value : value * 1000;
    return new Date(ms).toISOString();
  }
  return null;
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
    if (!isRecord(payload)) return null;
    // Some envelope versions nest the message under `message`.
    const message = isRecord(payload.message) ? payload.message : payload;

    const externalId = firstString(
      message.messageId,
      message.message_id,
      message.id,
    );
    if (!externalId) return null;

    const subject = firstString(message.subject, message.messageSubject);
    // GMAIL_FETCH_EMAILS metadata rows carry preview as { body }; trigger
    // payloads send it as a plain string.
    const previewText = isRecord(message.preview)
      ? firstString(message.preview.body, message.preview.snippet)
      : str(message.preview);
    const snippet = firstString(
      previewText,
      message.snippet,
      message.messageText,
      message.message_text,
    );
    const fromRaw = firstString(message.sender, message.from, message.fromEmail);
    const labels = Array.isArray(message.labelIds)
      ? message.labelIds.filter((label): label is string => typeof label === "string")
      : Array.isArray(message.label_ids)
        ? message.label_ids.filter(
            (label): label is string => typeof label === "string",
          )
        : [];

    const participants: EnvelopeParticipant[] = [
      ...(fromRaw ? [parseAddress(fromRaw, "from")] : []),
      ...parseAddressList(message.to ?? message.recipient_email, "to"),
      ...parseAddressList(message.cc, "cc"),
    ];

    const fromParticipant = participants.find((p) => p.role === "from");
    const isSentByUser = labels.includes("SENT");

    return {
      sourceType: "gmail",
      captureType: "message",
      externalId,
      title: subject ?? snippet?.slice(0, 100) ?? null,
      occurredAt: toIso(
        message.messageTimestamp ??
          message.message_timestamp ??
          message.internalDate,
      ),
      participants,
      threadId: firstString(message.threadId, message.thread_id),
      extracted: {
        subject,
        snippet: snippet?.slice(0, 500) ?? null,
        from: fromParticipant?.email ?? null,
        fromName: fromParticipant?.name ?? null,
        to: participants.filter((p) => p.role === "to").map((p) => p.email),
        labels,
        isSentByUser,
      },
      // Envelope retention: headers/ids only — full bodies are re-fetched on
      // demand via GMAIL_FETCH_MESSAGE_BY_MESSAGE_ID using this pointer.
      raw: {
        messageId: externalId,
        threadId: firstString(message.threadId, message.thread_id),
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
