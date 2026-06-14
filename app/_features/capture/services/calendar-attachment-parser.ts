/**
 * Lightweight ICS extraction from Gmail MIME payloads (Phase 5).
 * Avoids mailparser/node-ical until raw MIME is confirmed in all environments.
 */

import type { GmailMessagePart } from "@/app/_lib/composio/types";

export interface ParsedCalendarInvite {
  title: string;
  start_at: string;
}

function decodeBase64Url(data: string): string {
  const normalized = data.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(normalized, "base64").toString("utf-8");
}

function unfoldIcsLine(text: string): string {
  return text.replace(/\r?\n[ \t]/g, "");
}

function parseIcsEvent(icsText: string): ParsedCalendarInvite | null {
  const unfolded = unfoldIcsLine(icsText);
  const summaryMatch = unfolded.match(/SUMMARY(?:;[^:]*)?:(.+)/i);
  const dtStartMatch = unfolded.match(/DTSTART(?:;[^:]*)?:(\d{8}T\d{6}Z?)/i);

  if (!summaryMatch?.[1]) return null;

  let startAt = new Date().toISOString();
  if (dtStartMatch?.[1]) {
    const raw = dtStartMatch[1].replace(/Z?$/, "Z");
    const iso = raw.replace(
      /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z?$/,
      "$1-$2-$3T$4:$5:$6Z"
    );
    const parsed = new Date(iso);
    if (!Number.isNaN(parsed.getTime())) {
      startAt = parsed.toISOString();
    }
  }

  return {
    title: summaryMatch[1].trim(),
    start_at: startAt,
  };
}

function findCalendarPart(part: GmailMessagePart): string | null {
  if (
    (part.mimeType === "text/calendar" || part.mimeType === "application/ics") &&
    part.body?.data
  ) {
    return decodeBase64Url(part.body.data);
  }

  if (part.parts?.length) {
    for (const child of part.parts) {
      const found = findCalendarPart(child);
      if (found) return found;
    }
  }

  return null;
}

export function extractCalendarInviteFromPayload(
  rawPayload: Record<string, unknown> | null | undefined
): ParsedCalendarInvite | null {
  if (!rawPayload || typeof rawPayload !== "object") return null;

  const nestedPayload = rawPayload.payload as GmailMessagePart | undefined;
  if (!nestedPayload) return null;

  const icsText = findCalendarPart(nestedPayload);
  if (!icsText) return null;

  return parseIcsEvent(icsText);
}
