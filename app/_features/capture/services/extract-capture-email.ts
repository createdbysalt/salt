import type { GmailMessage, GmailMessagePart } from "@/app/_lib/composio/types";
import type { ExtractedData, MessageExtractedData } from "../types";
import type { EmailToAnalyze } from "./intelligence/email-analyzer";
import { extractCalendarInviteFromPayload } from "./calendar-attachment-parser";

export interface CaptureEmailFields {
  from_email: string;
  from_name: string | null;
  to_emails: string[];
  subject: string;
  snippet: string;
  body_text: string | null;
  sent_at: string;
  thread_id: string;
  is_sent_by_user: boolean;
}

function parseFromHeader(fromHeader: string): { from_name: string | null; from_email: string } {
  const fromMatch = fromHeader.match(/(?:(.+?)\s*<)?([^<>]+@[^<>]+)>?/);
  const fromName = fromMatch?.[1]?.trim() || null;
  const fromEmail = fromMatch?.[2]?.trim().toLowerCase() || fromHeader.trim().toLowerCase();
  return { from_name: fromName, from_email: fromEmail };
}

function parseToEmails(toHeader: string): string[] {
  return toHeader
    .split(",")
    .map((t) => {
      const match = t.match(/([^<>]+@[^<>]+)/);
      return match?.[1]?.trim().toLowerCase();
    })
    .filter(Boolean) as string[];
}

function getGmailHeaders(
  rawPayload: Record<string, unknown>
): Array<{ name: string; value: string }> {
  const nestedPayload = rawPayload.payload as Record<string, unknown> | undefined;
  const headers =
    (nestedPayload?.headers as Array<{ name: string; value: string }> | undefined) ??
    (rawPayload.headers as Array<{ name: string; value: string }> | undefined);
  return headers ?? [];
}

function decodeBase64Url(data: string): string {
  const normalized = data.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(normalized, "base64").toString("utf-8");
}

function extractPlainTextFromPart(part: GmailMessagePart): string | null {
  if (part.mimeType === "text/plain" && part.body?.data) {
    return decodeBase64Url(part.body.data);
  }

  if (part.parts?.length) {
    for (const child of part.parts) {
      const text = extractPlainTextFromPart(child);
      if (text) return text;
    }
  }

  return null;
}

function extractBodyText(rawPayload: Record<string, unknown>, snippet: string): string | null {
  const nestedPayload = rawPayload.payload as GmailMessage["payload"] | undefined;
  if (nestedPayload?.body?.data) {
    return decodeBase64Url(nestedPayload.body.data);
  }

  if (nestedPayload?.parts?.length) {
    for (const part of nestedPayload.parts) {
      const text = extractPlainTextFromPart(part);
      if (text) return text;
    }
  }

  return snippet || null;
}

function fromExtractedData(
  captureId: string,
  extracted: MessageExtractedData
): CaptureEmailFields | null {
  const fromEmail = extracted.sender?.email?.trim().toLowerCase();
  if (!fromEmail) return null;

  const labels = extracted.labels ?? [];
  const isSent = labels.includes("SENT");

  return {
    from_email: fromEmail,
    from_name: extracted.sender?.name?.trim() || null,
    to_emails: (extracted.recipients ?? [])
      .map((r) => r.email?.trim().toLowerCase())
      .filter(Boolean) as string[],
    subject: extracted.subject ?? "",
    snippet: extracted.body_preview ?? "",
    body_text: extracted.body_preview ?? null,
    sent_at: new Date().toISOString(),
    thread_id: extracted.thread_id ?? "",
    is_sent_by_user: isSent,
  };
}

/**
 * Category email adapters (adapters/categories/email.ts) write a flat shape —
 * sender_email/snippet/isSentByUser — with no `type` discriminant and, for
 * non-Gmail sources, a raw_payload that carries no headers to fall back on.
 */
function fromAdapterExtracted(extracted: Record<string, unknown>): CaptureEmailFields | null {
  const senderEmail =
    typeof extracted.sender_email === "string" && extracted.sender_email.trim()
      ? extracted.sender_email.trim().toLowerCase()
      : null;
  if (!senderEmail) return null;

  const snippet = typeof extracted.snippet === "string" ? extracted.snippet : "";
  const toEmails = Array.isArray(extracted.to)
    ? extracted.to.filter((e): e is string => typeof e === "string")
    : [];

  return {
    from_email: senderEmail,
    from_name:
      typeof extracted.sender_name === "string" && extracted.sender_name.trim()
        ? extracted.sender_name.trim()
        : null,
    to_emails: toEmails.map((e) => e.trim().toLowerCase()),
    subject: typeof extracted.subject === "string" ? extracted.subject : "",
    snippet,
    // Inline backfill analysis (Sources plan 3.4) attaches the transient full
    // body to the in-memory row only — it is never persisted. Prefer it over
    // the snippet fallback when present.
    body_text:
      typeof extracted.body_text === "string" && extracted.body_text
        ? extracted.body_text
        : snippet || null,
    sent_at: new Date().toISOString(),
    thread_id: typeof extracted.thread_id === "string" ? extracted.thread_id : "",
    is_sent_by_user: extracted.isSentByUser === true,
  };
}

function fromRawPayload(rawPayload: Record<string, unknown>): CaptureEmailFields | null {
  const headers = getGmailHeaders(rawPayload);
  const getHeader = (name: string) =>
    headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || "";

  const fromHeader = getHeader("From");
  const { from_name, from_email } = parseFromHeader(fromHeader);
  if (!from_email) return null;

  const snippet = (rawPayload.snippet as string) || "";
  const labelIds = (rawPayload.labelIds as string[]) || [];

  return {
    from_email,
    from_name,
    to_emails: parseToEmails(getHeader("To")),
    subject: getHeader("Subject"),
    snippet,
    body_text: extractBodyText(rawPayload, snippet),
    sent_at: getHeader("Date") || new Date().toISOString(),
    thread_id: (rawPayload.threadId as string) || "",
    is_sent_by_user: labelIds.includes("SENT"),
  };
}

/**
 * Normalize a capture_events row into email fields for linking + intelligence.
 * Prefers extracted_data (ingestion output), falls back to Gmail raw_payload.
 */
export function extractCaptureEmailFields(
  rawPayload: Record<string, unknown> | null | undefined,
  extractedData?: ExtractedData | null
): CaptureEmailFields | null {
  if (extractedData && extractedData.type === "message") {
    const fromExtracted = fromExtractedData("", extractedData);
    if (fromExtracted) return fromExtracted;
  }

  if (extractedData && typeof extractedData === "object") {
    const fromAdapter = fromAdapterExtracted(extractedData as unknown as Record<string, unknown>);
    if (fromAdapter) return fromAdapter;
  }

  if (!rawPayload || typeof rawPayload !== "object") {
    return null;
  }

  return fromRawPayload(rawPayload);
}

export function extractEmailToAnalyze(
  captureId: string,
  rawPayload: Record<string, unknown> | null | undefined,
  extractedData?: ExtractedData | null,
  options?: { has_prior_thread?: boolean }
): EmailToAnalyze | null {
  const fields = extractCaptureEmailFields(rawPayload, extractedData);
  if (!fields) return null;

  const calendarInvite = extractCalendarInviteFromPayload(rawPayload ?? undefined);

  return {
    id: captureId,
    from_email: fields.from_email,
    from_name: fields.from_name,
    to_emails: fields.to_emails,
    subject: fields.subject,
    snippet: fields.snippet,
    body_text: fields.body_text,
    sent_at: fields.sent_at,
    thread_id: fields.thread_id,
    is_sent_by_user: fields.is_sent_by_user,
    has_prior_thread: options?.has_prior_thread ?? false,
    calendar_invite: calendarInvite ?? undefined,
  };
}
