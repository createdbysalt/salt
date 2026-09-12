/**
 * Evidence Signal Classifier
 *
 * Detects signals from captures that suggest new records should be created.
 * Checks against existing Memory records to identify unknown contacts.
 */

// Admin client, not the session-scoped one: the evidence lane runs from
// crons and backlog scripts with no request scope — `cookies()` throws there
// (same trap as hydrate-capture). All reads below are workspace-scoped.
import { createAdminClient } from "@/app/_lib/supabase/admin";
import type { IntakeEntityType } from "@/app/_features/memory/care/intake";
import { canonicalizeIdentifier } from "@/app/_features/memory/care/intake";
import { isKnownSaasVendorDomain, isStrongReceiptOrBillingSignal } from "@/app/_features/capture/services/intelligence/vendor-domains";
import {
  getOperatorIdentity,
  isOperatorDomain,
  isOperatorEmail,
  isOperatorName,
  type OperatorIdentity,
} from "@/app/_lib/identity/operator";

/**
 * A detected signal with extracted data.
 */
export interface DetectedSignal {
  entityType: IntakeEntityType;
  identifier: string;
  signal: string;
  extractedData: Record<string, string>;
}

/** Attachment metadata from the capture envelope (names drive document detection). */
export interface EmailAttachmentMeta {
  name: string;
  contentType?: string;
  size?: number;
  /** Gmail attachment id — the GMAIL_GET_ATTACHMENT download pointer. */
  attachmentId?: string;
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
  /** Attachment filenames/types — the strongest document evidence an email carries. */
  attachments?: EmailAttachmentMeta[];
  isReply?: boolean;
  threadId?: string;
}

/**
 * File capture data for classification (storage adapters: Drive, Dropbox,
 * OneDrive). Filenames only — v1 deliberately reads no file content.
 */
export interface FileCaptureData {
  fileName: string;
  mimeType?: string;
  ownerEmail?: string;
  ownerName?: string;
  webViewLink?: string;
  folderPath?: string;
  isFolder?: boolean;
  /** Source-system file id (the capture's source_external_id) — dedupe key. */
  externalId?: string;
  /** Capture source_type (googledrive, dropbox, onedrive, …). */
  provider?: string;
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
 * Operator identity (member emails, profile emails/names, business_email,
 * website domain, workspace name). The operator must never emit person/org
 * intake signals — self-contamination guard shared with the records
 * executor and evidence auto-create.
 */
async function loadOperator(
  workspaceId: string
): Promise<OperatorIdentity> {
  return getOperatorIdentity(workspaceId);
}

/**
 * Classify an email capture and detect signals for unknown contacts.
 */
export async function classifyEmailCapture(
  workspaceId: string,
  email: EmailCaptureData,
  captureId?: string
): Promise<DetectedSignal[]> {
  const supabase = createAdminClient();
  const signals: DetectedSignal[] = [];

  // Collect all email addresses from the email
  const allAddresses = new Set<string>();
  allAddresses.add(email.from);
  email.to.forEach((addr) => allAddresses.add(addr));
  email.cc?.forEach((addr) => allAddresses.add(addr));

  // Operator self-exclusion: covers workspace_members, profile emails,
  // and business_email — not just exact membership rows.
  const operator = await loadOperator(workspaceId);

  // Get existing people by email (and name — person-name subjects must
  // never christen work records)
  const { data: existingPeople } = await supabase
    .from("people")
    .select("email, name")
    .eq("workspace_id", workspaceId);

  const knownEmails = new Set<string>();
  const knownNames = new Set<string>();
  for (const p of existingPeople || []) {
    const email = (p.email as string | null)?.toLowerCase();
    if (email) knownEmails.add(email);
    const name = (p as { name?: string | null }).name;
    if (name) knownNames.add(normalizePersonName(name));
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

    // Skip the operator (members, profile emails, business email)
    if (isOperatorEmail(operator, address)) continue;

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
    // domains, the operator's own domain, or receipt/billing mail: a
    // receipt from a tool you pay is spend, not a relationship, and your
    // own business is the Me record, not an org.
    const domain = address.split("@")[1];
    if (
      domain &&
      !receiptMail &&
      !isPersonalDomain(domain) &&
      !isKnownSaasVendorDomain(domain) &&
      !isOperatorDomain(operator, domain) &&
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

  // Check for signature data. Outbound mail carries the OPERATOR'S
  // signature — parsing it must never birth the operator's own business as
  // an org, so suppress when the sender is the operator or the parsed
  // company matches the operator's names/domains.
  if (email.signature && !isOperatorEmail(operator, email.from)) {
    const signatureData = parseEmailSignature(email.signature);
    if (signatureData.company) {
      const domain = canonicalizeIdentifier("organization", signatureData.company);
      if (
        !knownDomains.has(domain) &&
        !isOperatorDomain(operator, domain) &&
        !isOperatorName(operator, signatureData.company)
      ) {
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
  const fileSignals = detectSolopreneurDocuments(email, knownNames);
  signals.push(...fileSignals);

  // Work signals (subject pattern, scope discussion) — relationship-anchored
  signals.push(...detectWorkSignals(email, knownEmails, knownNames));

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
  prefix: "file" | "billing" | "work" = "file"
): string {
  const subject = (email.subject || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
  return `${prefix}:${email.from.toLowerCase().trim()}:${subject || kind}`;
}

/**
 * Project-pattern vocabulary for email subjects ("Website redesign
 * kickoff"). Deliberately tighter than the meeting-title patterns — no
 * "sync"/"review"/"standup", which are noise on a subject line.
 */
const PROJECT_SUBJECT_PATTERN =
  /\b(kick\s?-?off|project|redesign|rebrand|brand refresh|revamp)\b/i;

/**
 * Scope vocabulary for `thread_discusses_scope`. A single term is small
 * talk ("the timeline works"); two or more distinct terms mean the thread
 * is actually negotiating the work.
 */
const SCOPE_TERM_PATTERNS = [
  /\bscope\b/i,
  /\bdeliverables?\b/i,
  /\btimeline\b/i,
  /\bmilestones?\b/i,
];

/** Strip reply/forward prefixes so a thread stacks on one evidence row. */
function cleanSubjectName(subject: string): string {
  return subject
    .replace(/^(?:\s*(?:re|fw|fwd)\s*:\s*)+/i, "")
    .trim();
}

/**
 * Stable work identifier keyed to (sender, cleaned subject) — the initial
 * email and every reply accumulate onto the same evidence row, so a subject
 * pattern (1.0) plus a scope discussion (2.0) compound toward the bar.
 */
function workThreadIdentifier(email: EmailCaptureData): string {
  const cleaned = cleanSubjectName(email.subject || "")
    .toLowerCase()
    .replace(/\s+/g, " ");
  return `work:${email.from.toLowerCase().trim()}:${cleaned || "thread"}`;
}

/**
 * Detect work-birth signals from an email capture.
 *
 * Relationship-anchored: both signals require a known-contact sender. A
 * stranger's "project" subject is cold outreach, not the operator's work —
 * and the work auto bar additionally requires a relationship-grade signal
 * (proposal/SOW) before anything births.
 */
function detectWorkSignals(
  email: EmailCaptureData,
  knownEmails: ReadonlySet<string>,
  knownNames: ReadonlySet<string> = new Set()
): DetectedSignal[] {
  const from = email.from.toLowerCase().trim();
  if (!knownEmails.has(from)) return [];

  const signals: DetectedSignal[] = [];
  const subject = email.subject ?? "";
  const cleaned = cleanSubjectName(subject) || subject.trim();
  const senderName = extractNameFromEmail(email.from);
  // A person-name subject ("Sam Example") is about the client, not the
  // project — the work name must come from a substantive subject or a
  // document. The signal still fires; the name stays clean.
  const threadData: Record<string, string> =
    cleaned && !isPersonNameSubject(cleaned, senderName, knownNames)
      ? { name: cleaned }
      : { counterparty: senderName ?? from };
  const identifier = workThreadIdentifier(email);

  if (subject && PROJECT_SUBJECT_PATTERN.test(subject)) {
    signals.push({
      entityType: "work",
      identifier,
      signal: "email_subject_project_pattern",
      extractedData: threadData,
    });
  }

  const isThread = Boolean(email.isReply || email.threadId);
  if (isThread) {
    const body = (email.body ?? "").toLowerCase();
    const distinctTerms = SCOPE_TERM_PATTERNS.filter((re) => re.test(body)).length;
    if (distinctTerms >= 2) {
      signals.push({
        entityType: "work",
        identifier,
        signal: "thread_discusses_scope",
        extractedData: threadData,
      });
    }
  }

  return signals;
}

/**
 * Document patterns for filenames, mirroring detectSolopreneurDocuments'
 * priority order (specific before general). Matched against the normalized
 * base name — extension stripped, separators replaced with spaces — so
 * "Acme_MSA-v2.pdf" reads as "acme msa v2". Shared by storage-file
 * captures (classifyFileCapture) and email attachment filenames
 * (detectSolopreneurDocuments corroboration).
 */
const FILE_DOCUMENT_PATTERNS: ReadonlyArray<{
  re: RegExp;
  signal: string;
  category: string;
  documentType?: string;
}> = [
  { re: /\b(msa|master service agreement|master agreement)\b/, signal: "msa_detected", category: "contract", documentType: "msa" },
  { re: /\b(nda|non disclosure|confidentiality agreement|confidential agreement)\b/, signal: "nda_detected", category: "contract", documentType: "nda" },
  { re: /\b(sow|scope of work|project scope|statement of work)\b/, signal: "sow_detected", category: "proposal", documentType: "sow" },
  { re: /\b(contract|agreement|service agreement|terms of service|terms and conditions)\b/, signal: "contract_detected", category: "contract" },
  { re: /\b(proposal|quote|estimate|pricing)\b/, signal: "proposal_detected", category: "proposal" },
  { re: /\b(brief|creative brief|project brief|design brief)\b/, signal: "brief_detected", category: "reference", documentType: "brief" },
  { re: /\b(invoice|inv[\s-]?\d+)\b/, signal: "invoice_document_detected", category: "invoice", documentType: "invoice" },
  { re: /\b((meeting|call|discovery)\s+notes|recap|minutes|notes by gemini)\b/, signal: "meeting_notes_detected", category: "notes", documentType: "meeting_notes" },
  { re: /\b(receipt|payment received)\b/, signal: "receipt_detected", category: "invoice", documentType: "receipt" },
];

function normalizeFileBaseName(fileName: string): string {
  return fileName
    .toLowerCase()
    .replace(/\.[a-z0-9]{1,8}$/, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

type FileDocumentPattern = (typeof FILE_DOCUMENT_PATTERNS)[number];

/**
 * First attachment whose filename classifies as a business document.
 * The filename is the strongest evidence an email carries — the body can
 * say "contract" without one attached, but "MSA.pdf" IS the document.
 */
function matchAttachmentDocument(
  attachments: EmailAttachmentMeta[] | undefined,
): { pattern: FileDocumentPattern; name: string } | null {
  for (const attachment of attachments ?? []) {
    if (!attachment.name) continue;
    const baseName = normalizeFileBaseName(attachment.name);
    if (!baseName) continue;
    const pattern = FILE_DOCUMENT_PATTERNS.find((p) => p.re.test(baseName));
    if (pattern) return { pattern, name: attachment.name };
  }
  return null;
}

/** Normalize a display name for person-name comparisons. */
function normalizePersonName(value: string): string {
  return value.toLowerCase().trim().replace(/\s+/g, " ");
}

/**
 * True when a subject/title is just a person's name (the sender's display
 * name or a known contact) — "Sam Example" as a thread subject is about a
 * person, it doesn't NAME the work. Work records must never be christened
 * with a client name; the project name comes from documents (SOW,
 * proposal, contract) or a substantive subject line.
 */
function isPersonNameSubject(
  subject: string,
  senderName: string | null,
  knownNames: ReadonlySet<string>,
): boolean {
  const normalized = normalizePersonName(subject);
  if (!normalized) return false;
  if (senderName && normalized === normalizePersonName(senderName)) return true;
  return knownNames.has(normalized);
}

/** Body excerpt carried on document signals so a born resource's content
 * analysis has the email text to read (attachments themselves are metadata-
 * only — bytes never leave the mail provider). */
function sourceExcerpt(email: EmailCaptureData): string | undefined {
  const body = (email.body ?? "").trim();
  if (body.length < 40) return undefined;
  return body.slice(0, 3000);
}

/**
 * Detect solopreneur-critical documents from email content.
 * These are the non-negotiable files for independent professionals.
 *
 * Attachment corroboration: a body keyword alone ("here's the contract")
 * watches; the same keyword with a matching attachment filename
 * ("Contract.pdf") crosses the birth bar in one capture via the
 * document_file_present corroboration signal on the same evidence row.
 * A document-patterned attachment filename with no body keyword emits the
 * document signal itself plus the corroboration — the attached file is
 * both the detection and the proof.
 */
function detectSolopreneurDocuments(
  email: EmailCaptureData,
  knownNames: ReadonlySet<string> = new Set(),
): DetectedSignal[] {
  const signals: DetectedSignal[] = [];
  const subject = (email.subject || "").toLowerCase();
  const body = (email.body || "").toLowerCase();
  const combined = `${subject} ${body}`;

  // Only process if there are attachments or body suggests a document
  const hasContent =
    email.hasAttachments ||
    (email.attachments?.length ?? 0) > 0 ||
    body.length > 100;
  if (!hasContent) return signals;

  const attachmentMatch = matchAttachmentDocument(email.attachments);

  // Bulk/marketing senders write keyword-rich copy that false-positives on
  // the document vocabulary — a Costco "warehouse insider" is not a
  // proposal and a Redfin listing digest is not meeting notes. Document
  // platforms (DocuSign, RocketLawyer, …) send from bulk-looking addresses
  // too, and a matching attachment filename is independent evidence, so the
  // guard only suppresses body-keyword detection for bulk senders with no
  // document attachment and no platform provenance.
  const fromLower = email.from.toLowerCase();
  const isBulkSender = isNoReplyAddress(fromLower) || isNewsletterAddress(fromLower);
  const isDocumentPlatform = DOCUMENT_PLATFORM_MARKERS.some((marker) =>
    fromLower.includes(marker),
  );
  if (isBulkSender && !isDocumentPlatform && !attachmentMatch) return signals;

  const excerpt = sourceExcerpt(email);

  const baseData = {
    title: email.subject || attachmentMatch?.name || "Untitled",
    from: email.from,
    ...(excerpt ? { source_excerpt: excerpt } : {}),
  };

  /** Corroborate when the attachment filename matches the same document
   * family the body detected — one capture, two independent observations. */
  const corroborate = (signal: string, identifier: string) => {
    if (!attachmentMatch || attachmentMatch.pattern.signal !== signal) return;
    signals.push({
      entityType: "resource",
      identifier,
      signal: "document_file_present",
      extractedData: {
        title: attachmentMatch.name,
        attachment: attachmentMatch.name,
      },
    });
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
    const identifier = stableDocumentIdentifier(email, "msa");
    signals.push({
      entityType: "resource",
      identifier,
      signal: "msa_detected",
      extractedData: { ...baseData, category: "contract", document_type: "msa" },
    });
    corroborate("msa_detected", identifier);
  }
  // NDA / Confidentiality
  else if (
    combined.includes("non-disclosure") ||
    combined.includes("nda") ||
    combined.includes("confidentiality agreement") ||
    combined.includes("confidential agreement")
  ) {
    const identifier = stableDocumentIdentifier(email, "nda");
    signals.push({
      entityType: "resource",
      identifier,
      signal: "nda_detected",
      extractedData: { ...baseData, category: "contract", document_type: "nda" },
    });
    corroborate("nda_detected", identifier);
  }
  // General contract/agreement
  else if (
    combined.includes("contract") ||
    combined.includes("agreement") ||
    combined.includes("terms of service") ||
    combined.includes("terms and conditions")
  ) {
    const identifier = stableDocumentIdentifier(email, "contract");
    signals.push({
      entityType: "resource",
      identifier,
      signal: "contract_detected",
      extractedData: { ...baseData, category: "contract" },
    });
    corroborate("contract_detected", identifier);
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
    const identifier = stableDocumentIdentifier(email, "sow");
    signals.push({
      entityType: "resource",
      identifier,
      signal: "sow_detected",
      extractedData: { ...baseData, category: "proposal", document_type: "sow" },
    });
    corroborate("sow_detected", identifier);
    // Work mirror: a SOW is the documented birth story for work ("a signed
    // contract or accepted proposal becomes work in progress"). Weight 4.0
    // vs the work suggest bar of 5.0 — one document watches, corroboration
    // suggests. A person-name subject never names the work.
    signals.push({
      entityType: "work",
      identifier: stableDocumentIdentifier(email, "sow", "work"),
      signal: "proposal_or_sow_attached",
      extractedData: workMirrorData(email, knownNames),
    });
  }
  // Proposal/Quote/Estimate
  else if (
    combined.includes("proposal") ||
    combined.includes("quote") ||
    combined.includes("estimate") ||
    combined.includes("pricing")
  ) {
    const identifier = stableDocumentIdentifier(email, "proposal");
    signals.push({
      entityType: "resource",
      identifier,
      signal: "proposal_detected",
      extractedData: { ...baseData, category: "proposal" },
    });
    corroborate("proposal_detected", identifier);
    signals.push({
      entityType: "work",
      identifier: stableDocumentIdentifier(email, "proposal", "work"),
      signal: "proposal_or_sow_attached",
      extractedData: workMirrorData(email, knownNames),
    });
  }

  // Client Brief
  if (
    combined.includes("brief") ||
    combined.includes("creative brief") ||
    combined.includes("project brief") ||
    combined.includes("design brief")
  ) {
    const identifier = stableDocumentIdentifier(email, "brief");
    signals.push({
      entityType: "resource",
      identifier,
      signal: "brief_detected",
      extractedData: { ...baseData, category: "reference", document_type: "brief" },
    });
    corroborate("brief_detected", identifier);
  }

  // ==========================================================================
  // MEETING NOTES (the project memory solopreneurs lose in their inbox)
  // ==========================================================================

  if (
    combined.includes("meeting notes") ||
    combined.includes("call notes") ||
    combined.includes("notes from our") ||
    combined.includes("meeting recap") ||
    combined.includes("recap of our") ||
    combined.includes("minutes from") ||
    combined.includes("notes by gemini") ||
    combined.includes("meeting summary")
  ) {
    const identifier = stableDocumentIdentifier(email, "notes");
    signals.push({
      entityType: "resource",
      identifier,
      signal: "meeting_notes_detected",
      extractedData: { ...baseData, category: "notes", document_type: "meeting_notes" },
    });
    corroborate("meeting_notes_detected", identifier);
  }

  // ==========================================================================
  // INVOICES & PAYMENTS (billing record AND the invoice document resource)
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
    // Resource mirror: the invoice DOCUMENT is one of the big-three
    // resources (contracts, notes, invoices) — it must land in Resources
    // alongside whatever the billing lane does with the amount.
    const identifier = stableDocumentIdentifier(email, "invoice");
    signals.push({
      entityType: "resource",
      identifier,
      signal: "invoice_document_detected",
      extractedData: { ...baseData, category: "invoice", document_type: "invoice" },
    });
    corroborate("invoice_document_detected", identifier);
  }

  if (combined.includes("receipt") || combined.includes("payment received")) {
    const identifier = stableDocumentIdentifier(email, "receipt");
    signals.push({
      entityType: "resource",
      identifier,
      signal: "receipt_detected",
      extractedData: { ...baseData, category: "invoice", document_type: "receipt" },
    });
    corroborate("receipt_detected", identifier);
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
    const identifier = stableDocumentIdentifier(email, "signature");
    signals.push({
      entityType: "resource",
      identifier,
      signal: "signature_request_received",
      extractedData: { ...baseData, category: "contract" },
    });
    corroborate("signature_request_received", identifier);
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

  // Attachment-only detection: the body said nothing document-shaped, but
  // an attachment's filename classifies it ("MSA.pdf" on a one-line email).
  // The filename is the detection AND the attached file is the proof, so
  // the corroboration signal rides along — a document that actually arrived
  // must not sit in Watching.
  if (attachmentMatch) {
    const alreadyEmitted = signals.some(
      (s) => s.entityType === "resource" && s.signal === attachmentMatch.pattern.signal,
    );
    if (!alreadyEmitted) {
      const identifier = stableDocumentIdentifier(email, attachmentMatch.pattern.signal);
      signals.push({
        entityType: "resource",
        identifier,
        signal: attachmentMatch.pattern.signal,
        extractedData: {
          ...baseData,
          title: email.subject || attachmentMatch.name,
          attachment: attachmentMatch.name,
          category: attachmentMatch.pattern.category,
          ...(attachmentMatch.pattern.documentType
            ? { document_type: attachmentMatch.pattern.documentType }
            : {}),
        },
      });
      signals.push({
        entityType: "resource",
        identifier,
        signal: "document_file_present",
        extractedData: {
          title: attachmentMatch.name,
          attachment: attachmentMatch.name,
        },
      });
      // Work mirror (same as the body-detected path): a SOW/proposal file
      // that actually arrived is the documented birth story for work.
      if (
        attachmentMatch.pattern.signal === "sow_detected" ||
        attachmentMatch.pattern.signal === "proposal_detected"
      ) {
        signals.push({
          entityType: "work",
          identifier: stableDocumentIdentifier(
            email,
            attachmentMatch.pattern.signal,
            "work",
          ),
          signal: "proposal_or_sow_attached",
          extractedData: workMirrorData(email, knownNames),
        });
      }
    }
  }

  return signals;
}

/**
 * Work-mirror extracted data for document signals: the subject names the
 * work unless the subject is just a person's name — then the counterparty
 * rides along instead and the project name waits for a substantive source.
 */
function workMirrorData(
  email: EmailCaptureData,
  knownNames: ReadonlySet<string>,
): Record<string, string> {
  const subject = email.subject || "";
  const senderName = extractNameFromEmail(email.from);
  if (
    subject &&
    !isPersonNameSubject(cleanSubjectName(subject), senderName, knownNames)
  ) {
    return { name: subject };
  }
  return { ...(senderName ? { counterparty: senderName } : {}) };
}

/**
 * Classify a storage file capture (Drive/Dropbox/OneDrive) and detect
 * resource-lane document signals from the filename. Pure: no DB reads, no
 * LLM — the email classifier's document vocabulary applied to filenames.
 *
 * Signals accumulate into the evidence lane; a repeat sync of the same file
 * re-adds the signal weight, so a contract sitting in Drive crosses the
 * birth bar on its second sync.
 */
export function classifyFileCapture(file: FileCaptureData): DetectedSignal[] {
  if (file.isFolder) return [];
  if (!file.fileName) return [];

  const baseName = normalizeFileBaseName(file.fileName);
  if (!baseName) return [];

  const match = FILE_DOCUMENT_PATTERNS.find((p) => p.re.test(baseName));
  if (!match) return [];

  // Stable identifier: the source file id when present, else the normalized
  // name — repeat syncs of the same file accumulate onto one evidence row.
  const identifier =
    file.provider && file.externalId
      ? `${file.provider}:${file.externalId}`
      : `file:${baseName}`;

  const extractedData: Record<string, string> = {
    title: file.fileName,
    name: file.fileName,
    category: match.category,
  };
  if (match.documentType) extractedData.document_type = match.documentType;
  if (file.webViewLink) extractedData.web_view_link = file.webViewLink;
  if (file.ownerEmail) extractedData.owner_email = file.ownerEmail;

  const signals: DetectedSignal[] = [
    {
      entityType: "resource",
      identifier,
      signal: match.signal,
      extractedData,
    },
    // The synced file IS the document — the same corroboration an email
    // attachment provides, so a contract in Drive births on first sync
    // instead of waiting for a re-sync to restack the detection weight.
    {
      entityType: "resource",
      identifier,
      signal: "document_file_present",
      extractedData: { title: file.fileName },
    },
  ];

  // Work mirror (same as email): a proposal/SOW file implies work.
  if (match.signal === "sow_detected" || match.signal === "proposal_detected") {
    signals.push({
      entityType: "work",
      identifier: `work:${baseName}`,
      signal: "proposal_or_sow_attached",
      extractedData: { name: file.fileName },
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
  const supabase = createAdminClient();
  const signals: DetectedSignal[] = [];

  // Operator self-exclusion (members + profile emails + business email)
  const operator = await loadOperator(workspaceId);

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

    // Skip the operator
    if (isOperatorEmail(operator, attendee)) continue;

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

  // Check meeting title for project patterns. Work is client work: generic
  // ceremony titles (standups, syncs, check-ins) never emit, and the signal
  // requires an external participant (a non-operator attendee or
  // organizer) — an operator-only project-pattern meeting is not a work
  // candidate either.
  const participants = [...meeting.attendees, meeting.organizer].filter(
    (participant) => participant.trim().length > 0,
  );
  const hasExternalParticipant = participants.some(
    (participant) => !isOperatorEmail(operator, participant),
  );

  if (isProjectMeeting(meeting.title) && hasExternalParticipant) {
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
      // `name` mirrors title so evidence views can display it.
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
    "listings@",
    "deals@",
    "offers@",
    "promo@",
    "mailer@",
    "@edm.",
    "@news.",
  ];
  const lowerEmail = email.toLowerCase();
  return newsletterPatterns.some((pattern) => lowerEmail.includes(pattern));
}

// Transactional document platforms send signature requests and executed
// contracts from bulk-looking addresses (team@notifications.rocketlawyer.com,
// no-reply@docusign.net). Their mail must never be suppressed as marketing.
const DOCUMENT_PLATFORM_MARKERS = [
  "docusign",
  "hellosign",
  "dropboxsign",
  "pandadoc",
  "rocketlawyer",
  "signnow",
  "adobesign",
  "echosign",
  "sign.adobe",
  "legalzoom",
  "ironclad",
  "jotform",
];

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

/**
 * Generic ceremony titles — "stand-up meeting", "Weekly sync", "1:1" —
 * name a recurring ritual, not client work. They never emit a work signal,
 * even with an external participant (agencies invite clients and
 * contractors to standups all the time). Anchored to the whole title: a
 * substantive subject ("Acme brand sync") still qualifies via the project
 * patterns below.
 */
const GENERIC_CEREMONY_TITLE = new RegExp(
  "^\\s*" +
    "(daily|weekly|bi-?weekly|monthly|team|staff|internal|recurring|morning|scrum|status)?\\s*" +
    "(stand\\s?-?ups?|syncs?|check\\s?-?ins?|catch\\s?-?ups?|1\\s?[:.-]?\\s?1s?|one\\s?-?on\\s?-?ones?|huddles?|touch\\s?base|all\\s?-?hands|retro(spective)?s?|sprint\\s+(planning|review|retro)|plannings?|reviews?|status\\s+(meeting|call|update)|scrums?)" +
    "\\s*(meeting|call|session)?\\s*$",
  "i",
);

/** True when a title names a recurring ritual, not client work. */
export function isGenericCeremonyTitle(title: string): boolean {
  return GENERIC_CEREMONY_TITLE.test(title);
}

function isProjectMeeting(title: string): boolean {
  if (GENERIC_CEREMONY_TITLE.test(title)) return false;
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
  ];
  return projectPatterns.some((pattern) => pattern.test(title));
}
