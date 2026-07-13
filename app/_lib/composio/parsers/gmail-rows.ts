/**
 * Shared Gmail Row Parsing
 *
 * Unified parsers for Composio Gmail payloads used by both:
 * - Capture adapter (`app/_features/capture/adapters/gmail.ts`)
 * - Enrichment extractor (`app/_lib/composio/enrichment/extractors/gmail.ts`)
 *
 * Handles multiple payload shapes:
 * - GMAIL_NEW_GMAIL_MESSAGE trigger (camelCase: messageId, sender)
 * - GMAIL_FETCH_EMAILS metadata rows (camelCase with preview as object)
 * - Legacy nested message format (snake_case: message_id, from)
 *
 * Per AD-4 (enrichment-unification plan): shared parsers live in _lib/composio/parsers/
 * as infrastructure that both capture and enrichment import.
 */

export interface ParsedAddress {
  email: string | null;
  name: string | null;
}

export interface GmailRowFields {
  messageId: string | null;
  threadId: string | null;
  sender: string | null;
  subject: string | null;
  snippet: string | null;
  to: string[];
  labels: string[];
  timestamp: string | null;
}

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

/**
 * Parse an email address string into email and display name.
 *
 * Handles formats:
 * - "Ada Lovelace <ada@example.com>"
 * - "<ada@example.com>"
 * - "ada@example.com"
 */
export function parseAddress(input: string): ParsedAddress {
  const trimmed = input.trim();

  const match = trimmed.match(/^\s*"?([^"<]*)"?\s*<([^>]+)>\s*$/);
  if (match) {
    const name = match[1].trim();
    return {
      name: name.length > 0 ? name : null,
      email: match[2].trim().toLowerCase(),
    };
  }

  const emailMatch = trimmed.match(/[\w.+-]+@[\w.-]+\.\w+/);
  return {
    name: null,
    email: emailMatch?.[0]?.toLowerCase() ?? null,
  };
}

/**
 * Extract email address from a From/To header value.
 */
export function extractEmailFromHeader(header: string): string | null {
  return parseAddress(header).email;
}

/**
 * Extract display name from a From/To header value.
 */
export function extractNameFromHeader(header: string): string | null {
  return parseAddress(header).name;
}

/**
 * Extract message ID from a Composio Gmail row.
 *
 * Handles:
 * - { messageId: "..." } (GMAIL_FETCH_EMAILS)
 * - { id: "..." } (some legacy paths)
 * - { message: { message_id: "..." } } (nested snake_case)
 */
export function extractMessageIdFromRow(row: unknown): string | null {
  if (!isRecord(row)) return null;

  const nested = isRecord(row.message) ? row.message : null;

  return firstString(
    row.messageId,
    row.message_id,
    row.id,
    nested?.messageId,
    nested?.message_id,
    nested?.id
  );
}

/**
 * Extract sender/from field from a Composio Gmail row.
 *
 * Returns the raw header string (e.g., "Jane Example <lisa@acme.com>").
 * Use parseAddress() to extract email/name separately.
 */
export function extractSenderFromRow(row: unknown): string | null {
  if (!isRecord(row)) return null;

  const nested = isRecord(row.message) ? row.message : null;

  return firstString(
    row.sender,
    row.from,
    row.fromEmail,
    nested?.sender,
    nested?.from,
    nested?.fromEmail
  );
}

/**
 * Extract subject from a Composio Gmail row.
 */
export function extractSubjectFromRow(row: unknown): string | null {
  if (!isRecord(row)) return null;

  const nested = isRecord(row.message) ? row.message : null;

  return firstString(
    row.subject,
    row.messageSubject,
    nested?.subject,
    nested?.messageSubject
  );
}

/**
 * Extract snippet/preview text from a Composio Gmail row.
 *
 * GMAIL_FETCH_EMAILS rows have preview as { body } or { snippet };
 * trigger payloads have it as a plain string.
 */
export function extractSnippetFromRow(row: unknown): string | null {
  if (!isRecord(row)) return null;

  const nested = isRecord(row.message) ? row.message : null;

  if (isRecord(row.preview)) {
    const preview = firstString(row.preview.body, row.preview.snippet);
    if (preview) return preview;
  }

  return firstString(
    row.preview,
    row.snippet,
    row.messageText,
    row.message_text,
    nested?.preview,
    nested?.snippet
  );
}

/**
 * Extract thread ID from a Composio Gmail row.
 */
export function extractThreadIdFromRow(row: unknown): string | null {
  if (!isRecord(row)) return null;

  const nested = isRecord(row.message) ? row.message : null;

  return firstString(
    row.threadId,
    row.thread_id,
    nested?.threadId,
    nested?.thread_id
  );
}

/**
 * Extract timestamp from a Composio Gmail row.
 *
 * Handles:
 * - ISO date strings
 * - Unix epoch milliseconds (as string or number)
 * - Unix epoch seconds (detected by magnitude)
 */
export function extractTimestampFromRow(row: unknown): string | null {
  if (!isRecord(row)) return null;

  const nested = isRecord(row.message) ? row.message : null;

  const raw = firstString(
    row.messageTimestamp,
    row.message_timestamp,
    row.internalDate,
    nested?.messageTimestamp,
    nested?.message_timestamp,
    nested?.internalDate
  ) ?? (typeof row.internalDate === "number" ? row.internalDate : null);

  if (raw === null) return null;

  if (typeof raw === "string") {
    const ms = /^\d+$/.test(raw) ? Number(raw) : Date.parse(raw);
    if (!Number.isNaN(ms)) return new Date(ms).toISOString();
  }

  if (typeof raw === "number" && Number.isFinite(raw)) {
    const ms = raw > 10_000_000_000 ? raw : raw * 1000;
    return new Date(ms).toISOString();
  }

  return null;
}

/**
 * Extract recipient list from a Composio Gmail row.
 */
export function extractRecipientsFromRow(row: unknown): string[] {
  if (!isRecord(row)) return [];

  const nested = isRecord(row.message) ? row.message : null;

  const raw = row.to ?? row.recipient_email ?? nested?.to ?? nested?.recipient_email;

  if (typeof raw === "string") {
    return raw
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
  }

  if (Array.isArray(raw)) {
    return raw.filter((item): item is string => typeof item === "string");
  }

  return [];
}

/**
 * Extract label IDs from a Composio Gmail row.
 */
export function extractLabelsFromRow(row: unknown): string[] {
  if (!isRecord(row)) return [];

  const nested = isRecord(row.message) ? row.message : null;

  const labels = row.labelIds ?? row.label_ids ?? nested?.labelIds ?? nested?.label_ids;

  if (Array.isArray(labels)) {
    return labels.filter((label): label is string => typeof label === "string");
  }

  return [];
}

/**
 * Extract all standard fields from a Composio Gmail row.
 *
 * Convenience function that calls all individual extractors.
 */
export function extractGmailRowFields(row: unknown): GmailRowFields {
  return {
    messageId: extractMessageIdFromRow(row),
    threadId: extractThreadIdFromRow(row),
    sender: extractSenderFromRow(row),
    subject: extractSubjectFromRow(row),
    snippet: extractSnippetFromRow(row),
    to: extractRecipientsFromRow(row),
    labels: extractLabelsFromRow(row),
    timestamp: extractTimestampFromRow(row),
  };
}

/**
 * Check if a From header matches a target name or email.
 *
 * Used by enrichment to filter messages from/to the target person.
 */
export function headerMatchesTarget(
  header: string,
  target: { email?: string; name?: string }
): boolean {
  const headerLower = header.toLowerCase();

  if (target.email && headerLower.includes(target.email.toLowerCase())) {
    return true;
  }

  if (target.name?.trim()) {
    const normalizedName = target.name.trim().toLowerCase();
    if (headerLower.includes(normalizedName)) {
      return true;
    }

    const parsed = parseAddress(header);
    if (parsed.name?.toLowerCase() === normalizedName) {
      return true;
    }
  }

  return false;
}
