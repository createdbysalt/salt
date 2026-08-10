/**
 * Record Capture Criteria Engine
 *
 * Three-tier decision model for record creation:
 * - CREATE: High confidence → propose system:create-person/org
 * - WATCH: Medium confidence → track for accumulation
 * - NOTHING: Low confidence → drop silently
 *
 * Uses admission signals, linked records, and sender classification
 * to make signal-based decisions (not pattern-based heuristics).
 */

import type { AdmissionSignal } from "../../types/gate-result";
import type { LinkedRecord, MemorySurface } from "./types";
import type { MemoryProposal } from "../../types/memory-proposals";
import type { CaptureSenderKind } from "../../types/sender-profiles";

/** Consumer email domains - low signal without strong relationship signals */
const CONSUMER_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "yahoo.co.uk",
  "hotmail.com",
  "outlook.com",
  "live.com",
  "msn.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "aol.com",
  "protonmail.com",
  "zoho.com",
  "mail.com",
  "yandex.com",
]);

/** Automated/noreply patterns */
const AUTOMATED_PATTERNS = [
  /^noreply@/i,
  /^no-reply@/i,
  /^donotreply@/i,
  /^notifications@/i,
  /^alerts@/i,
  /^mailer-daemon@/i,
  /^postmaster@/i,
  /^bounce@/i,
];

export interface RecordCaptureInput {
  /** From admission gate */
  admissionScore: number;
  admissionSignals: AdmissionSignal[];

  /** From record matcher */
  linkedRecords: LinkedRecord[];

  /** From sender profile learning */
  senderClassification: CaptureSenderKind | "unknown";

  /** From capture envelope */
  senderEmail: string | null;
  senderName: string | null;
  senderDomain: string | null;

  /** From email classification (content signals) */
  contentSignals?: string[];
}

/** CREATE decision: propose record creation */
export interface CreateDecision {
  tier: "create";
  proposals: MemoryProposal[];
  confidence: number;
  reason: string;
}

/** WATCH decision: track for accumulation */
export interface WatchDecision {
  tier: "watch";
  watchType: "email" | "domain";
  target: string;
  reason: string;
  initialSignals: string[];
}

/** NOTHING decision: drop silently */
export interface NothingDecision {
  tier: "nothing";
  reason: string;
}

export type RecordCaptureDecision = CreateDecision | WatchDecision | NothingDecision;

/** Thresholds for decision tiers */
const CREATE_THRESHOLD = 70;
const WATCH_THRESHOLD = 30;
const MIN_PROPOSAL_CONFIDENCE = 70;

function hasSignal(signals: AdmissionSignal[], type: string): boolean {
  return signals.some((s) => s.type === type);
}

function hasContentSignal(signals: string[] | undefined, type: string): boolean {
  return signals?.includes(type) ?? false;
}

/** Content signals that indicate high commercial intent */
const HIGH_VALUE_CONTENT_SIGNALS = [
  "email_money_amount_detected",
  "email_invoice_attached",
  "email_payment_link_detected",
];

/** Content signals that indicate engagement */
const ENGAGEMENT_CONTENT_SIGNALS = [
  "email_action_requested",
  "email_question_asked",
  "email_urgency_high",
];

function hasHighValueContent(signals: string[] | undefined): boolean {
  return HIGH_VALUE_CONTENT_SIGNALS.some((s) => hasContentSignal(signals, s));
}

function hasEngagementContent(signals: string[] | undefined): boolean {
  return ENGAGEMENT_CONTENT_SIGNALS.some((s) => hasContentSignal(signals, s));
}

function hasLinkedPerson(records: LinkedRecord[]): boolean {
  return records.some((r) => r.surface === "people" && r.confidence >= 80);
}

function hasLinkedOrg(records: LinkedRecord[]): boolean {
  return records.some((r) => r.surface === "orgs" && r.confidence >= 80);
}

function isConsumerDomain(domain: string | null): boolean {
  return domain ? CONSUMER_DOMAINS.has(domain.toLowerCase()) : true;
}

function isAutomatedSender(email: string | null): boolean {
  if (!email) return false;
  return AUTOMATED_PATTERNS.some((p) => p.test(email));
}

function extractDomain(email: string | null): string | null {
  if (!email) return null;
  const parts = email.split("@");
  return parts.length === 2 ? parts[1].toLowerCase() : null;
}

function createPersonProposal(
  input: RecordCaptureInput,
  confidence: number,
  reason: string
): MemoryProposal {
  return {
    surface: "people",
    action: "create",
    hint: {
      name: input.senderName ?? undefined,
      domain: input.senderDomain ?? undefined,
    },
    confidence,
    reason,
    system_play: "system:create-person",
  };
}

function createOrgProposal(
  input: RecordCaptureInput,
  confidence: number,
  reason: string
): MemoryProposal {
  return {
    surface: "orgs",
    action: "create",
    hint: {
      domain: input.senderDomain ?? undefined,
    },
    confidence,
    reason,
    system_play: "system:create-org",
  };
}

/**
 * Evaluate a capture and decide: CREATE, WATCH, or NOTHING.
 *
 * Decision priority:
 * 1. Check blockers (vendor, already linked, automated)
 * 2. Check CREATE criteria (high-signal combinations)
 * 3. Check WATCH criteria (promising but needs accumulation)
 * 4. Default to NOTHING
 */
export function evaluateRecordCapture(input: RecordCaptureInput): RecordCaptureDecision {
  const {
    admissionScore,
    admissionSignals,
    linkedRecords,
    senderClassification,
    senderEmail,
    senderName,
    senderDomain,
  } = input;

  const signalTypes = admissionSignals.map((s) => s.type);

  // ---------- BLOCKERS (never create even if signals match) ----------

  if (senderClassification === "vendor_saas") {
    return { tier: "nothing", reason: "Known vendor/SaaS - excluded from Memory" };
  }

  if (hasLinkedPerson(linkedRecords)) {
    return { tier: "nothing", reason: "Already linked to Person record" };
  }

  if (isAutomatedSender(senderEmail)) {
    return { tier: "nothing", reason: "Automated/noreply sender" };
  }

  // ---------- CREATE TIER (high confidence) ----------

  const proposals: MemoryProposal[] = [];

  // Payment signal → always create Person + Org (95% confidence)
  if (hasSignal(admissionSignals, "payment_customer")) {
    proposals.push(
      createPersonProposal(input, 95, "Payment received from this sender"),
      createOrgProposal(input, 90, "Organization associated with payment sender")
    );
    return {
      tier: "create",
      proposals: proposals.filter((p) => p.confidence >= MIN_PROPOSAL_CONFIDENCE),
      confidence: 95,
      reason: "Payment relationship - high confidence contact",
    };
  }

  // Bidirectional thread → create Person (90% confidence)
  if (hasSignal(admissionSignals, "bidirectional")) {
    proposals.push(
      createPersonProposal(input, 90, "Bidirectional email thread - ongoing conversation")
    );

    if (senderDomain && !isConsumerDomain(senderDomain) && !hasLinkedOrg(linkedRecords)) {
      proposals.push(createOrgProposal(input, 80, "Business domain from bidirectional thread"));
    }

    return {
      tier: "create",
      proposals: proposals.filter((p) => p.confidence >= MIN_PROPOSAL_CONFIDENCE),
      confidence: 90,
      reason: "Bidirectional thread - confirmed relationship",
    };
  }

  // You initiated + they replied → create Person (85% confidence)
  if (
    hasSignal(admissionSignals, "you_initiated") &&
    hasSignal(admissionSignals, "they_replied")
  ) {
    proposals.push(createPersonProposal(input, 85, "You initiated and they replied"));
    return {
      tier: "create",
      proposals,
      confidence: 85,
      reason: "You reached out and received a reply",
    };
  }

  // Calendar meeting → create Person (85% confidence)
  if (hasSignal(admissionSignals, "calendar_meeting")) {
    proposals.push(createPersonProposal(input, 85, "Calendar meeting with this contact"));
    return {
      tier: "create",
      proposals,
      confidence: 85,
      reason: "Calendar meeting relationship",
    };
  }

  // ---------- CONTENT SIGNAL BOOST (email body/subject analysis) ----------
  // These signals come from email classification and boost cold inbound to WATCH or CREATE

  // High-value content (invoice, payment, money) + business domain → create Person (80% confidence)
  if (hasHighValueContent(input.contentSignals) && !isConsumerDomain(senderDomain) && senderName) {
    proposals.push(
      createPersonProposal(input, 80, "Commercial content detected (invoice/payment)")
    );
    return {
      tier: "create",
      proposals,
      confidence: 80,
      reason: "Email mentions payment or invoice - commercial relationship signal",
    };
  }

  // High-value content from consumer domain → watch email (may be freelancer)
  if (hasHighValueContent(input.contentSignals) && senderEmail) {
    return {
      tier: "watch",
      watchType: "email",
      target: senderEmail.toLowerCase(),
      reason: "Email mentions payment/invoice - watching for relationship confirmation",
      initialSignals: [...signalTypes, ...(input.contentSignals ?? [])],
    };
  }

  // Engagement content (action requested, question, urgency) + business domain → watch domain
  if (hasEngagementContent(input.contentSignals) && !isConsumerDomain(senderDomain) && senderDomain) {
    return {
      tier: "watch",
      watchType: "domain",
      target: senderDomain.toLowerCase(),
      reason: "Email requests action or asks question - engagement signal",
      initialSignals: [...signalTypes, ...(input.contentSignals ?? [])],
    };
  }

  // High admission score + business domain + sender name → create Person (80% confidence)
  if (admissionScore >= CREATE_THRESHOLD && senderName && !isConsumerDomain(senderDomain)) {
    proposals.push(
      createPersonProposal(input, 80, `High-signal business contact: ${senderName}`)
    );
    return {
      tier: "create",
      proposals,
      confidence: 80,
      reason: "High-signal business domain contact with name",
    };
  }

  // ---------- WATCH TIER (medium confidence) ----------

  // You initiated, no reply yet → watch sender email
  // This applies even to consumer domains (freelancers often use personal email)
  if (hasSignal(admissionSignals, "you_initiated") && senderEmail) {
    return {
      tier: "watch",
      watchType: "email",
      target: senderEmail.toLowerCase(),
      reason: isConsumerDomain(senderDomain)
        ? "You initiated contact (consumer email), awaiting reply"
        : "You initiated contact, awaiting reply",
      initialSignals: signalTypes,
    };
  }

  // Business domain with some signal → watch domain
  if (admissionScore >= WATCH_THRESHOLD && !isConsumerDomain(senderDomain) && senderDomain) {
    return {
      tier: "watch",
      watchType: "domain",
      target: senderDomain.toLowerCase(),
      reason: "Business domain with initial signal",
      initialSignals: signalTypes,
    };
  }

  // Shared file → watch sender email
  if (hasSignal(admissionSignals, "shared_file") && senderEmail) {
    return {
      tier: "watch",
      watchType: "email",
      target: senderEmail.toLowerCase(),
      reason: "Shared file - watching for further interaction",
      initialSignals: signalTypes,
    };
  }

  // Business domain single interaction (no other signals) → watch domain
  if (!isConsumerDomain(senderDomain) && senderDomain && admissionScore >= 20) {
    return {
      tier: "watch",
      watchType: "domain",
      target: senderDomain.toLowerCase(),
      reason: "Single interaction from business domain",
      initialSignals: signalTypes,
    };
  }

  // ---------- NOTHING TIER (low confidence) ----------

  if (admissionScore < WATCH_THRESHOLD) {
    return {
      tier: "nothing",
      reason: "Cold inbound with no prior interaction",
    };
  }

  if (isConsumerDomain(senderDomain) && admissionSignals.length === 0) {
    return {
      tier: "nothing",
      reason: "Consumer domain with no qualifying signals",
    };
  }

  return {
    tier: "nothing",
    reason: "Low signal score, does not meet watch threshold",
  };
}

/**
 * Build RecordCaptureInput from enrichment pipeline context.
 * Helper to extract the right fields from various sources.
 */
export function buildRecordCaptureInput(params: {
  admissionScore: number;
  admissionSignals: AdmissionSignal[];
  linkedRecords: LinkedRecord[];
  senderClassification: CaptureSenderKind | "unknown";
  senderEmail: string | null;
  senderName: string | null;
  contentSignals?: string[];
}): RecordCaptureInput {
  const senderDomain = extractDomain(params.senderEmail);

  return {
    admissionScore: params.admissionScore,
    admissionSignals: params.admissionSignals,
    linkedRecords: params.linkedRecords,
    senderClassification: params.senderClassification,
    senderEmail: params.senderEmail,
    senderName: params.senderName,
    senderDomain,
    contentSignals: params.contentSignals,
  };
}
