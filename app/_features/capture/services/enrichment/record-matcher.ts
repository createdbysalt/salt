/**
 * Record Matcher
 *
 * Matches captures to existing Memory records (People, Orgs, Work, Billing, Meetings, Files).
 * Uses deterministic matching first (email, domain, invoice #), then fuzzy matching for
 * work names, meeting titles, and file names.
 */

import type { CaptureEnvelope } from "../../adapters/types";
import type { LinkedRecord, MemorySurface } from "./types";
import { createAdminClient } from "@/app/_lib/supabase/admin";

interface MatchContext {
  workspaceId: string;
  userEmail: string | null;
}

/** Consumer email domains to exclude from org matching */
const CONSUMER_DOMAINS = new Set([
  "gmail.com", "googlemail.com", "yahoo.com", "yahoo.co.uk", "hotmail.com",
  "outlook.com", "live.com", "msn.com", "icloud.com", "me.com", "mac.com",
  "aol.com", "protonmail.com", "zoho.com", "mail.com", "yandex.com",
]);

/**
 * Extract potential match identifiers from a capture envelope.
 */
function extractMatchIdentifiers(envelope: CaptureEnvelope): {
  emails: string[];
  domains: string[];
  invoiceNumbers: string[];
  keywords: string[];
  meetingTitle: string | null;
  fileNames: string[];
  calendarEventId: string | null;
} {
  const emails: string[] = [];
  const domains = new Set<string>();
  const invoiceNumbers: string[] = [];
  const keywords: string[] = [];
  const fileNames: string[] = [];

  for (const participant of envelope.participants) {
    if (participant.email) {
      emails.push(participant.email.toLowerCase());
      const domain = participant.email.split("@")[1]?.toLowerCase();
      if (domain && !CONSUMER_DOMAINS.has(domain)) {
        domains.add(domain);
      }
    }
  }

  const extracted = envelope.extracted as Record<string, unknown>;

  if (typeof extracted.invoice_number === "string") {
    invoiceNumbers.push(extracted.invoice_number);
  }
  if (typeof extracted.invoiceNumber === "string") {
    invoiceNumbers.push(extracted.invoiceNumber);
  }

  // Extract keywords from title/subject (for work matching)
  const titleSource = envelope.title ?? (extracted.subject as string | undefined);
  if (titleSource) {
    const words = titleSource
      .toLowerCase()
      .split(/[\s\-_.,;:!?()[\]{}]+/)
      .filter((w) => w.length > 3)
      .filter((w) => !STOP_WORDS.has(w));
    keywords.push(...words.slice(0, 15));
  }

  // Extract meeting title for calendar events
  const meetingTitle = (extracted.summary as string) ??
    (extracted.title as string) ??
    (envelope.sourceType.includes("calendar") ? envelope.title : null);

  // Extract calendar event external ID
  const calendarEventId = (extracted.event_id as string) ??
    (extracted.eventId as string) ??
    (extracted.id as string) ?? null;

  // Extract file names from attachments or file events
  if (Array.isArray(extracted.attachments)) {
    for (const att of extracted.attachments) {
      if (typeof att === "object" && att !== null && typeof (att as { name?: string }).name === "string") {
        fileNames.push((att as { name: string }).name);
      }
    }
  }
  if (typeof extracted.file_name === "string") {
    fileNames.push(extracted.file_name);
  }
  if (typeof extracted.fileName === "string") {
    fileNames.push(extracted.fileName);
  }
  if (typeof extracted.name === "string" && envelope.sourceType.includes("drive")) {
    fileNames.push(extracted.name);
  }

  return {
    emails,
    domains: [...domains],
    invoiceNumbers,
    keywords,
    meetingTitle,
    fileNames,
    calendarEventId,
  };
}

/** Common words to exclude from keyword matching */
const STOP_WORDS = new Set([
  "about", "after", "again", "also", "been", "before", "being", "between",
  "both", "could", "does", "doing", "down", "during", "each", "from",
  "further", "have", "having", "here", "into", "just", "more", "most",
  "other", "over", "same", "should", "some", "such", "than", "that",
  "their", "them", "then", "there", "these", "they", "this", "those",
  "through", "under", "until", "very", "what", "when", "where", "which",
  "while", "will", "with", "would", "your", "email", "meeting", "call",
  "update", "follow", "quick", "check", "thanks", "hello", "please",
]);

/**
 * Match by exact email address → People
 */
async function matchByEmail(
  emails: string[],
  context: MatchContext
): Promise<LinkedRecord[]> {
  if (emails.length === 0) return [];

  const supabase = createAdminClient();
  const { data: people } = await supabase
    .from("people")
    .select("id, name, email")
    .eq("workspace_id", context.workspaceId)
    .in("email", emails)
    .limit(5);

  if (!people) return [];

  return people.map((person: { id: string; name: string | null; email: string | null }) => ({
    surface: "people" as MemorySurface,
    entity_id: person.id,
    entity_label: person.name ?? person.email ?? "Unknown",
    match_type: "email" as const,
    confidence: 100,
  }));
}

/**
 * Match by domain → Organizations
 */
async function matchByDomain(
  domains: string[],
  context: MatchContext
): Promise<LinkedRecord[]> {
  if (domains.length === 0) return [];

  const supabase = createAdminClient();
  const { data: orgs } = await supabase
    .from("organizations")
    .select("id, name, domain")
    .eq("workspace_id", context.workspaceId)
    .in("domain", domains)
    .limit(3);

  if (!orgs) return [];

  return orgs.map((org: { id: string; name: string | null; domain: string | null }) => ({
    surface: "orgs" as MemorySurface,
    entity_id: org.id,
    entity_label: org.name ?? org.domain ?? "Unknown",
    match_type: "domain" as const,
    confidence: 90,
  }));
}

/**
 * Match by invoice number → Billing records
 */
async function matchByInvoiceNumber(
  invoiceNumbers: string[],
  context: MatchContext
): Promise<LinkedRecord[]> {
  if (invoiceNumbers.length === 0) return [];

  const supabase = createAdminClient();
  const { data: billings } = await supabase
    .from("billing_records")
    .select("id, number, vendor_label")
    .eq("workspace_id", context.workspaceId)
    .in("number", invoiceNumbers)
    .limit(3);

  if (!billings) return [];

  return billings.map((billing: { id: string; number: string | null; vendor_label: string | null }) => ({
    surface: "billing" as MemorySurface,
    entity_id: billing.id,
    entity_label: billing.number ? `Invoice ${billing.number}` : (billing.vendor_label ?? "Unknown"),
    match_type: "invoice_number" as const,
    confidence: 95,
  }));
}

/**
 * Match by existing record links (already linked)
 */
async function matchByExistingLinks(
  captureId: string,
  workspaceId: string
): Promise<LinkedRecord[]> {
  const supabase = createAdminClient();
  const { data: links } = await supabase
    .from("capture_record_links")
    .select("target_surface, target_entity_id, confidence")
    .eq("capture_event_id", captureId)
    .eq("workspace_id", workspaceId)
    .limit(5);

  if (!links) return [];

  type LinkRow = { target_surface: string; target_entity_id: string; confidence: number };
  return links.map((link: LinkRow) => ({
    surface: link.target_surface as MemorySurface,
    entity_id: link.target_entity_id,
    entity_label: "Linked record",
    match_type: "existing_link" as const,
    confidence: link.confidence ?? 80,
  }));
}

/**
 * Match by keywords → Work records
 * Uses case-insensitive substring matching on work name
 */
async function matchByKeywords(
  keywords: string[],
  context: MatchContext
): Promise<LinkedRecord[]> {
  if (keywords.length === 0) return [];

  const supabase = createAdminClient();

  // Use the most distinctive keywords (longer = more specific)
  const searchKeywords = keywords
    .sort((a, b) => b.length - a.length)
    .slice(0, 5);

  const matches: LinkedRecord[] = [];

  for (const keyword of searchKeywords) {
    if (matches.length >= 3) break;

    const { data: workRecords } = await supabase
      .from("work")
      .select("id, name, slug")
      .eq("workspace_id", context.workspaceId)
      .is("deleted_at", null)
      .is("archived_at", null)
      .ilike("name", `%${keyword}%`)
      .limit(2);

    if (workRecords) {
      for (const work of workRecords) {
        const alreadyMatched = matches.some((m) => m.entity_id === work.id);
        if (!alreadyMatched) {
          // Confidence based on how much of the name the keyword covers
          const nameLength = (work.name ?? "").length;
          const keywordCoverage = keyword.length / Math.max(nameLength, 1);
          const confidence = Math.min(85, 50 + Math.round(keywordCoverage * 35));

          matches.push({
            surface: "work" as MemorySurface,
            entity_id: work.id,
            entity_label: work.name ?? work.slug ?? "Work",
            match_type: "keyword" as const,
            confidence,
          });
        }
      }
    }
  }

  return matches;
}

/**
 * Match by meeting title → Meetings
 * Matches calendar event titles to existing meetings
 */
async function matchByMeetingTitle(
  meetingTitle: string | null,
  calendarEventId: string | null,
  context: MatchContext
): Promise<LinkedRecord[]> {
  if (!meetingTitle && !calendarEventId) return [];

  const supabase = createAdminClient();
  const matches: LinkedRecord[] = [];

  // First try exact external_id match (most reliable)
  if (calendarEventId) {
    const { data: exactMatch } = await supabase
      .from("meetings")
      .select("id, title")
      .eq("workspace_id", context.workspaceId)
      .eq("external_event_id", calendarEventId)
      .is("deleted_at", null)
      .maybeSingle();

    if (exactMatch) {
      return [{
        surface: "meetings" as MemorySurface,
        entity_id: exactMatch.id,
        entity_label: exactMatch.title ?? "Meeting",
        match_type: "meeting_title" as const,
        confidence: 100,
      }];
    }
  }

  // Fall back to title matching
  if (meetingTitle && meetingTitle.length >= 5) {
    const { data: titleMatches } = await supabase
      .from("meetings")
      .select("id, title")
      .eq("workspace_id", context.workspaceId)
      .is("deleted_at", null)
      .ilike("title", `%${meetingTitle.slice(0, 50)}%`)
      .limit(2);

    if (titleMatches) {
      for (const meeting of titleMatches) {
        // Higher confidence for closer title match
        const titleSimilarity = meetingTitle.toLowerCase() === (meeting.title ?? "").toLowerCase()
          ? 95
          : 70;

        matches.push({
          surface: "meetings" as MemorySurface,
          entity_id: meeting.id,
          entity_label: meeting.title ?? "Meeting",
          match_type: "meeting_title" as const,
          confidence: titleSimilarity,
        });
      }
    }
  }

  return matches;
}

/**
 * Match by file name → Files
 * Matches attachment names or file event names to existing files
 */
async function matchByFileName(
  fileNames: string[],
  context: MatchContext
): Promise<LinkedRecord[]> {
  if (fileNames.length === 0) return [];

  const supabase = createAdminClient();
  const matches: LinkedRecord[] = [];

  for (const fileName of fileNames.slice(0, 5)) {
    if (matches.length >= 3) break;

    // Strip common extensions for more flexible matching
    const baseName = fileName.replace(/\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|csv|jpg|png|gif)$/i, "");
    if (baseName.length < 3) continue;

    const { data: files } = await supabase
      .from("resources")
      .select("id, file_name")
      .eq("workspace_id", context.workspaceId)
      .is("deleted_at", null)
      .is("archived_at", null)
      .ilike("file_name", `%${baseName}%`)
      .limit(2);

    if (files) {
      for (const file of files) {
        const alreadyMatched = matches.some((m) => m.entity_id === file.id);
        if (!alreadyMatched) {
          // Exact name match = higher confidence
          const isExact = (file.file_name ?? "").toLowerCase() === fileName.toLowerCase();
          matches.push({
            surface: "files" as MemorySurface,
            entity_id: file.id,
            entity_label: file.file_name ?? "File",
            match_type: "file_name" as const,
            confidence: isExact ? 95 : 75,
          });
        }
      }
    }
  }

  return matches;
}

/**
 * Find matching Memory records for a capture.
 * Returns linked records sorted by confidence (highest first).
 *
 * Match priority:
 * 1. Exact email → People (100%)
 * 2. Invoice number → Billing (95%)
 * 3. Calendar event ID → Meetings (100%)
 * 4. Domain → Organizations (90%)
 * 5. Meeting title → Meetings (70-95%)
 * 6. Keywords → Work (50-85%)
 * 7. File name → Files (75-95%)
 * 8. Existing links → Any (80%)
 */
export async function findMatchingRecords(
  envelope: CaptureEnvelope,
  captureId: string | null,
  context: MatchContext
): Promise<LinkedRecord[]> {
  const identifiers = extractMatchIdentifiers(envelope);

  const [
    emailMatches,
    domainMatches,
    invoiceMatches,
    meetingMatches,
    keywordMatches,
    fileMatches,
    existingLinks,
  ] = await Promise.all([
    matchByEmail(identifiers.emails, context),
    matchByDomain(identifiers.domains, context),
    matchByInvoiceNumber(identifiers.invoiceNumbers, context),
    matchByMeetingTitle(identifiers.meetingTitle, identifiers.calendarEventId, context),
    matchByKeywords(identifiers.keywords, context),
    matchByFileName(identifiers.fileNames, context),
    captureId ? matchByExistingLinks(captureId, context.workspaceId) : Promise.resolve([]),
  ]);

  const allMatches = [
    ...emailMatches,
    ...domainMatches,
    ...invoiceMatches,
    ...meetingMatches,
    ...keywordMatches,
    ...fileMatches,
    ...existingLinks,
  ];

  // Dedupe by entity, keeping highest confidence match
  const dedupedById = new Map<string, LinkedRecord>();
  for (const match of allMatches) {
    const key = `${match.surface}:${match.entity_id}`;
    const existing = dedupedById.get(key);
    if (!existing || match.confidence > existing.confidence) {
      dedupedById.set(key, match);
    }
  }

  // Sort by confidence (highest first), limit to top 8
  return [...dedupedById.values()]
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 8);
}
