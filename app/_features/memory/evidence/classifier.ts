/**
 * Evidence Signal Classifier
 *
 * Detects signals from captures that suggest new records should be created.
 * Checks against existing Memory records to identify unknown contacts.
 */

import { createClient } from "@/app/_lib/supabase/server";
import type { IntakeEntityType } from "@/app/_features/memory/care/intake";
import { canonicalizeIdentifier } from "@/app/_features/memory/care/intake";
import { isKnownSaasVendorDomain, isStrongReceiptOrBillingSignal } from "@/app/_features/capture/services/intelligence/vendor-domains";

/**
 * A detected signal with extracted data.
 */
export interface DetectedSignal {
  entityType: IntakeEntityType;
  identifier: string;
  signal: string;
  extractedData: Record<string, string>;
}

/**
 * Email capture data for classification.
 */
export interface EmailCaptureData {
  from: string;
  to: string[];
  cc?: string[];
  subject?: string;
  body?: string;
  signature?: string;
  hasAttachments?: boolean;
  isReply?: boolean;
  threadId?: string;
}

/**
 * Meeting capture data for classification.
 */
export interface MeetingCaptureData {
  title: string;
  attendees: string[];
  organizer: string;
  startTime: string;
  endTime?: string;
  location?: string;
  meetingUrl?: string;
  /** Source-system event id (the capture's source_external_id) — dedupe key. */
  externalId?: string;
  /** Capture source_type (googlecalendar, calcom, fireflies, …). */
  provider?: string;
}

/**
 * Calendar source types whose meeting captures represent calendar events.
 * Transcript sources (fireflies, granola, …) also emit capture_type
 * "meeting" but describe past recordings — they never drive record creation.
 */
const CALENDAR_SOURCE_TYPES = new Set([
  "googlecalendar",
  "outlook_calendar",
  "calcom",
  "calendly",
]);

/**
 * Classify an email capture and detect signals for unknown contacts.
 */
export async function classifyEmailCapture(
  workspaceId: string,
  email: EmailCaptureData,
  captureId?: string
): Promise<DetectedSignal[]> {
  const supabase = await createClient();
  const signals: DetectedSignal[] = [];

  // Collect all email addresses from the email
  const allAddresses = new Set<string>();
  allAddresses.add(email.from);
  email.to.forEach((addr) => allAddresses.add(addr));
  email.cc?.forEach((addr) => allAddresses.add(addr));

  // Get workspace member emails to exclude
  const { data: members } = await supabase
    .from("workspace_members")
    .select("user:users(email)")
    .eq("workspace_id", workspaceId);

  const memberEmails = new Set<string>();
  for (const m of members || []) {
    const userArr = m.user as Array<{ email?: string }> | null;
    const email = userArr?.[0]?.email?.toLowerCase();
    if (email) memberEmails.add(email);
  }

  // Get existing people by email
  const { data: existingPeople } = await supabase
    .from("people")
    .select("email")
    .eq("workspace_id", workspaceId)
    .not("email", "is", null);

  const knownEmails = new Set<string>();
  for (const p of existingPeople || []) {
    const email = (p.email as string | null)?.toLowerCase();
    if (email) knownEmails.add(email);
  }

  // Get existing orgs by domain
  const { data: existingOrgs } = await supabase
    .from("organizations")
    .select("domain")
    .eq("workspace_id", workspaceId)
    .not("domain", "is", null);

  const knownDomains = new Set<string>();
  for (const o of existingOrgs || []) {
    const domain = (o.domain as string | null)?.toLowerCase();
    if (domain) knownDomains.add(domain);
  }

  // Receipt/billing mail from ANY domain (listed or not) is spend evidence,
  // never an org relationship — suppress the org domain signal for it.
  const receiptMail = isStrongReceiptOrBillingSignal(
    email.subject ?? "",
    email.body ?? "",
    email.from.toLowerCase().split("@")[0]?.trim() ?? ""
  );

  // Process each email address
  for (const rawAddress of allAddresses) {
    const address = rawAddress.toLowerCase().trim();

    // Skip workspace members
    if (memberEmails.has(address)) continue;

    // Skip known contacts
    if (knownEmails.has(address)) continue;

    // Skip no-reply addresses
    if (isNoReplyAddress(address)) {
      signals.push({
        entityType: "person",
        identifier: address,
        signal: "no_reply_address",
        extractedData: { email: address },
      });
      continue;
    }

    // Skip newsletters/bulk senders
    if (isNewsletterAddress(address)) {
      signals.push({
        entityType: "person",
        identifier: address,
        signal: "looks_like_newsletter",
        extractedData: { email: address },
      });
      continue;
    }

    // This is an unknown contact - determine the signal type
    const isFromAddress = address === email.from.toLowerCase();
    const isCc = email.cc?.some((cc) => cc.toLowerCase() === address);

    let signal: string;
    if (isFromAddress) {
      signal = "email_from_unknown_address";
    } else if (isCc) {
      signal = "email_cc_unknown_address";
    } else {
      signal = "email_to_unknown_address";
    }

    // Extract name from email if possible
    const name = extractNameFromEmail(rawAddress);

    signals.push({
      entityType: "person",
      identifier: address,
      signal,
      extractedData: {
        email: address,
        ...(name ? { name } : {}),
      },
    });

    // Also check for unknown organization — but never for SaaS vendor
    // domains or receipt/billing mail: a receipt from a tool you pay is
    // spend, not a relationship.
    const domain = address.split("@")[1];
    if (
      domain &&
      !receiptMail &&
      !isPersonalDomain(domain) &&
      !isKnownSaasVendorDomain(domain) &&
      !knownDomains.has(domain)
    ) {
      signals.push({
        entityType: "organization",
        identifier: domain,
        signal: "email_domain_unknown",
        extractedData: { domain },
      });
    }
  }

  // Check for signature data
  if (email.signature) {
    const signatureData = parseEmailSignature(email.signature);
    if (signatureData.company) {
      const domain = canonicalizeIdentifier("organization", signatureData.company);
      if (!knownDomains.has(domain)) {
        signals.push({
          entityType: "organization",
          identifier: domain,
          signal: "email_signature_has_company",
          extractedData: { name: signatureData.company },
        });
      }
    }
  }

  // Detect solopreneur-critical documents from email content
  const fileSignals = detectSolopreneurDocuments(email);
  signals.push(...fileSignals);

  return signals;
}

/**
 * Stable identifier for a document/billing signal: one evidence row per
 * (sender, subject). A timestamp here would fork a fresh row on every
 * re-arrival — breaking both evidence accumulation and dismissal.
 */
function stableDocumentIdentifier(
  email: EmailCaptureData,
  kind: string,
  prefix: "file" | "billing" = "file"
): string {
  const subject = (email.subject || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
  return `${prefix}:${email.from.toLowerCase().trim()}:${subject || kind}`;
}

/**
 * Detect solopreneur-critical documents from email content.
 * These are the non-negotiable files for independent professionals.
 */
function detectSolopreneurDocuments(email: EmailCaptureData): DetectedSignal[] {
  const signals: DetectedSignal[] = [];
  const subject = (email.subject || "").toLowerCase();
  const body = (email.body || "").toLowerCase();
  const combined = `${subject} ${body}`;

  // Only process if there are attachments or body suggests a document
  const hasContent = email.hasAttachments || body.length > 100;
  if (!hasContent) return signals;

  const baseData = {
    title: email.subject || "Untitled",
    from: email.from,
  };

  // ==========================================================================
  // CONTRACTS & AGREEMENTS (highest priority for solopreneurs)
  // ==========================================================================

  // Master Service Agreement
  if (
    combined.includes("master service agreement") ||
    combined.includes("msa") ||
    combined.includes("master agreement")
  ) {
    signals.push({
      entityType: "resource",
      identifier: stableDocumentIdentifier(email, "msa"),
      signal: "msa_detected",
      extractedData: { ...baseData, category: "contract", document_type: "msa" },
    });
  }
  // NDA / Confidentiality
  else if (
    combined.includes("non-disclosure") ||
    combined.includes("nda") ||
    combined.includes("confidentiality agreement") ||
    combined.includes("confidential agreement")
  ) {
    signals.push({
      entityType: "resource",
      identifier: stableDocumentIdentifier(email, "nda"),
      signal: "nda_detected",
      extractedData: { ...baseData, category: "contract", document_type: "nda" },
    });
  }
  // General contract/agreement
  else if (
    combined.includes("contract") ||
    combined.includes("agreement") ||
    combined.includes("terms of service") ||
    combined.includes("terms and conditions")
  ) {
    signals.push({
      entityType: "resource",
      identifier: stableDocumentIdentifier(email, "contract"),
      signal: "contract_detected",
      extractedData: { ...baseData, category: "contract" },
    });
  }

  // ==========================================================================
  // PROPOSALS & QUOTES (critical for winning work)
  // ==========================================================================

  // Scope of Work
  if (
    combined.includes("scope of work") ||
    combined.includes("sow") ||
    combined.includes("project scope")
  ) {
    signals.push({
      entityType: "resource",
      identifier: stableDocumentIdentifier(email, "sow"),
      signal: "sow_detected",
      extractedData: { ...baseData, category: "proposal", document_type: "sow" },
    });
  }
  // Proposal/Quote/Estimate
  else if (
    combined.includes("proposal") ||
    combined.includes("quote") ||
    combined.includes("estimate") ||
    combined.includes("pricing")
  ) {
    signals.push({
      entityType: "resource",
      identifier: stableDocumentIdentifier(email, "proposal"),
      signal: "proposal_detected",
      extractedData: { ...baseData, category: "proposal" },
    });
  }

  // Client Brief
  if (
    combined.includes("brief") ||
    combined.includes("creative brief") ||
    combined.includes("project brief") ||
    combined.includes("design brief")
  ) {
    signals.push({
      entityType: "resource",
      identifier: stableDocumentIdentifier(email, "brief"),
      signal: "brief_detected",
      extractedData: { ...baseData, category: "reference", document_type: "brief" },
    });
  }

  // ==========================================================================
  // INVOICES & PAYMENTS (goes to Billing entity, not File)
  // ==========================================================================

  if (
    combined.includes("invoice") ||
    subject.includes("payment due") ||
    subject.includes("amount due")
  ) {
    signals.push({
      entityType: "billing",
      identifier: stableDocumentIdentifier(email, "invoice", "billing"),
      signal: "invoice_attachment_detected",
      extractedData: { subject: email.subject || "", from: email.from },
    });
  }

  if (combined.includes("receipt") || combined.includes("payment received")) {
    signals.push({
      entityType: "resource",
      identifier: stableDocumentIdentifier(email, "receipt"),
      signal: "receipt_detected",
      extractedData: { ...baseData, category: "invoice", document_type: "receipt" },
    });
  }

  // ==========================================================================
  // DELIVERABLES (what solopreneurs send to clients)
  // ==========================================================================

  // Final deliverables
  if (
    combined.includes("final") ||
    combined.includes("approved") ||
    combined.includes("deliverable") ||
    combined.includes("here is the") ||
    combined.includes("attached is the")
  ) {
    // Check for design file indicators
    const isDesignFile =
      combined.includes("design") ||
      combined.includes("mockup") ||
      combined.includes("logo") ||
      combined.includes("brand") ||
      combined.includes("website");

    if (isDesignFile || email.hasAttachments) {
      signals.push({
        entityType: "resource",
        identifier: stableDocumentIdentifier(email, "deliverable"),
        signal: "deliverable_detected",
        extractedData: { ...baseData, category: "deliverable" },
      });
    }
  }

  // Revisions
  if (
    combined.includes("revision") ||
    combined.includes("round 2") ||
    combined.includes("round 3") ||
    combined.includes("v2") ||
    combined.includes("updated version") ||
    combined.includes("changes")
  ) {
    signals.push({
      entityType: "resource",
      identifier: stableDocumentIdentifier(email, "revision"),
      signal: "revision_detected",
      extractedData: { ...baseData, category: "deliverable", document_type: "revision" },
    });
  }

  // ==========================================================================
  // CLIENT FEEDBACK & APPROVAL
  // ==========================================================================

  // Approval signals
  if (
    combined.includes("approved") ||
    combined.includes("looks good") ||
    combined.includes("sign off") ||
    combined.includes("go ahead") ||
    combined.includes("good to go") ||
    combined.includes("love it")
  ) {
    signals.push({
      entityType: "resource",
      identifier: stableDocumentIdentifier(email, "approval"),
      signal: "approval_detected",
      extractedData: { ...baseData, category: "notes", document_type: "approval" },
    });
  }

  // Feedback signals
  if (
    combined.includes("feedback") ||
    combined.includes("comments") ||
    combined.includes("thoughts on") ||
    combined.includes("review")
  ) {
    signals.push({
      entityType: "resource",
      identifier: stableDocumentIdentifier(email, "feedback"),
      signal: "feedback_detected",
      extractedData: { ...baseData, category: "notes", document_type: "feedback" },
    });
  }

  // ==========================================================================
  // ONBOARDING DOCUMENTS
  // ==========================================================================

  if (
    combined.includes("welcome") ||
    combined.includes("onboarding") ||
    combined.includes("getting started") ||
    combined.includes("questionnaire") ||
    combined.includes("intake form")
  ) {
    signals.push({
      entityType: "resource",
      identifier: stableDocumentIdentifier(email, "onboarding"),
      signal: "onboarding_doc_detected",
      extractedData: { ...baseData, category: "process", document_type: "onboarding" },
    });
  }

  // ==========================================================================
  // SIGNATURE REQUESTS (DocuSign, HelloSign, PandaDoc)
  // ==========================================================================

  if (
    combined.includes("docusign") ||
    combined.includes("hellosign") ||
    combined.includes("pandadoc") ||
    combined.includes("sign this document") ||
    combined.includes("signature required") ||
    combined.includes("please sign")
  ) {
    signals.push({
      entityType: "resource",
      identifier: stableDocumentIdentifier(email, "signature"),
      signal: "signature_request_received",
      extractedData: { ...baseData, category: "contract" },
    });
  }

  // ==========================================================================
  // DRIVE/TOOL SHARES (Figma, Notion, Drive)
  // ==========================================================================

  if (
    combined.includes("shared a file with you") ||
    combined.includes("google drive") ||
    combined.includes("shared folder")
  ) {
    signals.push({
      entityType: "resource",
      identifier: stableDocumentIdentifier(email, "drive"),
      signal: "drive_share_received",
      extractedData: { ...baseData, category: "reference" },
    });
  }

  if (combined.includes("figma") && combined.includes("shared")) {
    signals.push({
      entityType: "resource",
      identifier: stableDocumentIdentifier(email, "figma"),
      signal: "figma_share_received",
      extractedData: { ...baseData, category: "deliverable" },
    });
  }

  if (combined.includes("notion") && combined.includes("shared")) {
    signals.push({
      entityType: "resource",
      identifier: stableDocumentIdentifier(email, "notion"),
      signal: "notion_share_received",
      extractedData: { ...baseData, category: "reference" },
    });
  }

  return signals;
}

/**
 * Classify a meeting capture and detect signals.
 */
export async function classifyMeetingCapture(
  workspaceId: string,
  meeting: MeetingCaptureData,
  captureId?: string
): Promise<DetectedSignal[]> {
  const supabase = await createClient();
  const signals: DetectedSignal[] = [];

  // Get workspace member emails to exclude
  const { data: members } = await supabase
    .from("workspace_members")
    .select("user:users(email)")
    .eq("workspace_id", workspaceId);

  const memberEmails = new Set<string>();
  for (const m of members || []) {
    const userArr = m.user as Array<{ email?: string }> | null;
    const email = userArr?.[0]?.email?.toLowerCase();
    if (email) memberEmails.add(email);
  }

  // Get existing people by email
  const { data: existingPeople } = await supabase
    .from("people")
    .select("email")
    .eq("workspace_id", workspaceId)
    .not("email", "is", null);

  const knownEmails = new Set<string>();
  for (const p of existingPeople || []) {
    const email = (p.email as string | null)?.toLowerCase();
    if (email) knownEmails.add(email);
  }

  // Check attendees for unknown contacts
  for (const rawAttendee of meeting.attendees) {
    const attendee = rawAttendee.toLowerCase().trim();

    // Skip workspace members
    if (memberEmails.has(attendee)) continue;

    // Skip known contacts
    if (knownEmails.has(attendee)) continue;

    // Skip no-reply/calendar addresses
    if (isNoReplyAddress(attendee) || isCalendarAddress(attendee)) continue;

    const name = extractNameFromEmail(rawAttendee);

    signals.push({
      entityType: "person",
      identifier: attendee,
      signal: "meeting_attendee_unknown",
      extractedData: {
        email: attendee,
        ...(name ? { name } : {}),
      },
    });
  }

  // Check meeting title for project patterns
  if (isProjectMeeting(meeting.title)) {
    signals.push({
      entityType: "work",
      identifier: meeting.title.toLowerCase(),
      signal: "meeting_title_project_pattern",
      extractedData: { name: meeting.title },
    });
  }

  // Meeting-entity record signal (audit #7): calendar captures mirror into
  // Memory as meeting records. Gated to calendar sources — transcript
  // captures (fireflies et al.) describe past recordings, not events, and
  // keep person-signal-only behavior. A start time is required: without it
  // the intake tier could never create the record.
  if (
    meeting.provider &&
    CALENDAR_SOURCE_TYPES.has(meeting.provider) &&
    meeting.startTime
  ) {
    // Stable identifier: the source event id when present, else the event's
    // own coordinates — so repeat syncs accumulate onto one evidence row and
    // dismissals stick.
    const identifier = meeting.externalId
      ? `${meeting.provider}:${meeting.externalId}`
      : `${meeting.title}:${meeting.startTime}`;

    const extractedData: Record<string, string> = {
      title: meeting.title,
      // `name` mirrors title so the New records lane can display it.
      name: meeting.title,
      start_time: meeting.startTime,
      provider: meeting.provider,
    };
    if (meeting.endTime) extractedData.end_time = meeting.endTime;
    if (meeting.location) extractedData.location = meeting.location;
    if (meeting.meetingUrl) extractedData.meeting_url = meeting.meetingUrl;
    if (meeting.attendees.length > 0) {
      extractedData.attendees = JSON.stringify(meeting.attendees);
    }
    if (meeting.externalId) extractedData.external_event_id = meeting.externalId;

    signals.push({
      entityType: "meeting",
      identifier,
      signal: "calendar_event_created",
      extractedData,
    });

    if (meeting.meetingUrl) {
      signals.push({
        entityType: "meeting",
        identifier,
        signal: "zoom_invite_detected",
        extractedData,
      });
    }
  }

  return signals;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function isNoReplyAddress(email: string): boolean {
  const noReplyPatterns = [
    "noreply",
    "no-reply",
    "no_reply",
    "donotreply",
    "do-not-reply",
    "mailer-daemon",
    "postmaster",
    "notifications",
    "alerts",
  ];
  const localPart = email.split("@")[0].toLowerCase();
  return noReplyPatterns.some((pattern) => localPart.includes(pattern));
}

function isNewsletterAddress(email: string): boolean {
  const newsletterPatterns = [
    "newsletter",
    "marketing",
    "promotions",
    "updates",
    "digest",
    "weekly",
    "monthly",
    "news@",
    "info@",
    "hello@",
    "team@",
  ];
  const lowerEmail = email.toLowerCase();
  return newsletterPatterns.some((pattern) => lowerEmail.includes(pattern));
}

function isCalendarAddress(email: string): boolean {
  const calendarPatterns = [
    "calendar-notification",
    "calendar@",
    "calendly",
    "cal.com",
  ];
  const lowerEmail = email.toLowerCase();
  return calendarPatterns.some((pattern) => lowerEmail.includes(pattern));
}

function isPersonalDomain(domain: string): boolean {
  const personalDomains = [
    "gmail.com",
    "yahoo.com",
    "hotmail.com",
    "outlook.com",
    "icloud.com",
    "aol.com",
    "protonmail.com",
    "me.com",
    "live.com",
    "msn.com",
  ];
  return personalDomains.includes(domain.toLowerCase());
}

function extractNameFromEmail(email: string): string | null {
  // Try to extract name from "Name <email@domain.com>" format
  const match = email.match(/^([^<]+)<[^>]+>$/);
  if (match) {
    return match[1].trim();
  }
  return null;
}

export interface ParsedSignature {
  company?: string;
  title?: string;
  phone?: string;
}

const TITLE_PATTERN =
  /\b(CEO|CTO|CFO|COO|CMO|VP|President|Founder|Co-Founder|Owner|Principal|Partner|Director|Manager|Head of [A-Za-z ]+|Lead [A-Za-z ]+|Senior [A-Za-z ]+|Designer|Developer|Engineer|Consultant|Photographer|Producer|Editor|Writer|Coach|Attorney|Accountant|Bookkeeper|Realtor|Broker|Architect|Strategist)\b/i;

/**
 * Parse company, title, and phone from an email signature block.
 * Simple line-based heuristics — values feed confidence-gated enrichment,
 * so false positives accumulate as evidence instead of being applied.
 */
export function parseEmailSignature(signature: string): ParsedSignature {
  const result: ParsedSignature = {};

  const lines = signature.split("\n").map((l) => l.trim()).filter(Boolean);

  for (const line of lines) {
    // Skip lines that look like URLs or emails — they match nothing useful here
    const isContactLine = line.includes("@") || /https?:\/\//i.test(line);

    // Look for company patterns
    if (
      !isContactLine &&
      line.match(/\b(Inc|LLC|Corp|Ltd|Co|Studio|Agency|Media|Group)\b/i) &&
      !result.company
    ) {
      result.company = line;
    }
    // Look for title patterns (short lines only — avoid sentence matches)
    if (
      !isContactLine &&
      !result.title &&
      line.length <= 60 &&
      TITLE_PATTERN.test(line)
    ) {
      // Titles often appear as "Title, Company" or "Title | Company"
      const segment = line.split(/[|,•·]/)[0].trim();
      if (segment.length >= 2 && segment.length <= 60) {
        result.title = segment;
      }
    }
    // Look for phone patterns
    if (line.match(/\+?[\d\s\-().]{10,}/) && !result.phone) {
      result.phone = line.match(/\+?[\d\s\-().]{10,}/)?.[0]?.trim();
    }
  }

  return result;
}

/**
 * Parse a signature from the tail of a full email body when no explicit
 * signature block was captured. Looks at the last ~10 non-empty lines.
 */
export function parseSignatureFromBody(body: string): ParsedSignature {
  const lines = body.split("\n").map((l) => l.trim()).filter(Boolean);
  const tail = lines.slice(-10).join("\n");
  return parseEmailSignature(tail);
}

function isProjectMeeting(title: string): boolean {
  const projectPatterns = [
    /kickoff/i,
    /kick-off/i,
    /project\s+meeting/i,
    /\bsync\b/i,
    /\breview\b/i,
    /\bdiscovery\b/i,
    /\bplanning\b/i,
    /\bsprint\b/i,
    /\bretro\b/i,
    /\bstandup\b/i,
    /\bstand-up\b/i,
  ];
  return projectPatterns.some((pattern) => pattern.test(title));
}
