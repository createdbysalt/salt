/**
 * Signal Extractor
 *
 * Extracts signals from capture envelope data.
 * Uses deterministic patterns first (no AI cost), AI only for complex cases.
 *
 * Signals are area-based, not app-specific:
 * - email: capture_email_received, is_bidirectional_thread, is_reply, etc.
 * - calendar: meeting_synced, is_organizer, has_external_attendees, etc.
 * - communication: message_received, is_direct_message, mentions_you, etc.
 * - billing: payment_received, invoice_sent, payment_overdue, etc.
 * - storage: file_shared, file_updated, etc.
 */

import type { CaptureEnvelope } from "../../adapters/types";

/** Signal keys that can be extracted from captures */
export type CaptureSignalKey =
  // Email signals
  | "capture_email_received"
  | "capture_email_sent"
  | "is_bidirectional_thread"
  | "you_initiated"
  | "is_reply"
  | "has_attachment"
  | "from_known_contact"
  | "is_automated_sender"
  | "is_marketing_email"
  // Calendar signals
  | "meeting_synced_from_calendar"
  | "meeting_upcoming"
  | "is_organizer"
  | "has_external_attendees"
  // Communication signals
  | "message_received"
  | "is_direct_message"
  | "is_thread_reply"
  | "mentions_you"
  // Billing signals
  | "billing_payment_received"
  | "billing_invoice_sent"
  | "billing_payment_overdue"
  | "billing_large_amount"
  // Storage signals
  | "file_shared_with_me"
  | "file_updated"
  | "file_from_known_entity"
  // Generic
  | "from_known_contact";

/** Prefixes that indicate automated/noreply senders */
const AUTOMATED_SENDER_PREFIXES = [
  "noreply@",
  "no-reply@",
  "notifications@",
  "notif@",
  "info@",
  "newsletter@",
  "updates@",
  "account@",
  "support@",
  "mailer@",
  "alerts@",
  "donotreply@",
];

/** Domains known to send marketing/promotional emails */
const MARKETING_DOMAINS = [
  "mailchimp.com",
  "sendgrid.net",
  "constantcontact.com",
  "hubspot.com",
  "marketo.com",
  "klaviyo.com",
  "mailgun.org",
  "amazonses.com",
];

function isAutomatedSender(email: string | null | undefined): boolean {
  if (!email) return false;
  const lower = email.toLowerCase();
  return AUTOMATED_SENDER_PREFIXES.some((prefix) => lower.includes(prefix));
}

function isMarketingDomain(email: string | null | undefined): boolean {
  if (!email) return false;
  const lower = email.toLowerCase();
  return MARKETING_DOMAINS.some((domain) => lower.includes(domain));
}

interface ExtractedData {
  isSentByUser?: boolean;
  is_reply?: boolean;
  has_attachments?: boolean;
  labels?: string[];
  [key: string]: unknown;
}

/**
 * Extract signals from an email capture envelope.
 */
function extractEmailSignals(
  envelope: CaptureEnvelope,
  _userEmail: string | null
): CaptureSignalKey[] {
  const signals: CaptureSignalKey[] = [];
  const extracted = envelope.extracted as ExtractedData;
  const fromParticipant = envelope.participants.find((p) => p.role === "from");
  const fromEmail = fromParticipant?.email;

  if (extracted.isSentByUser) {
    signals.push("capture_email_sent");
    signals.push("you_initiated");
  } else {
    signals.push("capture_email_received");
  }

  if (extracted.is_reply) {
    signals.push("is_reply");
  }

  if (extracted.has_attachments) {
    signals.push("has_attachment");
  }

  if (isAutomatedSender(fromEmail)) {
    signals.push("is_automated_sender");
  }

  if (isMarketingDomain(fromEmail)) {
    signals.push("is_marketing_email");
  }

  const labels = extracted.labels ?? [];
  if (labels.includes("CATEGORY_PROMOTIONS") || labels.includes("CATEGORY_SOCIAL")) {
    signals.push("is_marketing_email");
  }

  return [...new Set(signals)];
}

/**
 * Extract signals from a calendar capture envelope.
 */
function extractCalendarSignals(
  envelope: CaptureEnvelope,
  userEmail: string | null
): CaptureSignalKey[] {
  const signals: CaptureSignalKey[] = ["meeting_synced_from_calendar"];
  const extracted = envelope.extracted as Record<string, unknown>;

  const organizer = envelope.participants.find((p) => p.role === "organizer");
  if (organizer?.email && userEmail && organizer.email.toLowerCase() === userEmail.toLowerCase()) {
    signals.push("is_organizer");
  }

  const attendees = envelope.participants.filter((p) => p.role === "attendee");
  const hasExternal = attendees.some((a) => {
    if (!a.email || !userEmail) return false;
    const userDomain = userEmail.split("@")[1]?.toLowerCase();
    const attendeeDomain = a.email.split("@")[1]?.toLowerCase();
    return userDomain && attendeeDomain && userDomain !== attendeeDomain;
  });
  if (hasExternal) {
    signals.push("has_external_attendees");
  }

  if (extracted.occurredAt) {
    const eventTime = new Date(extracted.occurredAt as string);
    const now = new Date();
    if (eventTime > now) {
      signals.push("meeting_upcoming");
    }
  }

  return signals;
}

/**
 * Extract signals from a messaging/communication capture envelope.
 */
function extractCommunicationSignals(
  envelope: CaptureEnvelope,
  _userEmail: string | null
): CaptureSignalKey[] {
  const signals: CaptureSignalKey[] = ["message_received"];
  const extracted = envelope.extracted as Record<string, unknown>;

  if (extracted.is_dm || extracted.is_direct_message) {
    signals.push("is_direct_message");
  }

  if (envelope.threadId && extracted.is_reply) {
    signals.push("is_thread_reply");
  }

  if (extracted.mentions_you) {
    signals.push("mentions_you");
  }

  return signals;
}

/**
 * Extract signals from a billing capture envelope.
 */
function extractBillingSignals(
  envelope: CaptureEnvelope,
  _userEmail: string | null
): CaptureSignalKey[] {
  const signals: CaptureSignalKey[] = [];
  const extracted = envelope.extracted as Record<string, unknown>;

  if (envelope.captureType === "payment") {
    const extracted = envelope.extracted as Record<string, unknown>;
    if (extracted.type === "invoice" || extracted.object === "invoice") {
      signals.push("billing_invoice_sent");
    } else {
      signals.push("billing_payment_received");
    }
  }

  if (extracted.status === "overdue" || extracted.is_overdue) {
    signals.push("billing_payment_overdue");
  }

  // Canonical `amount` (decimal dollars) with fallbacks for rows written
  // before the alias existed. Threshold is $1,000.
  const amountRaw = extracted.amount ?? extracted.amount_paid ?? extracted.amount_due;
  const amount = typeof amountRaw === "number" ? amountRaw : undefined;
  if (amount && amount >= 1000) {
    signals.push("billing_large_amount");
  }

  return signals;
}

/**
 * Extract signals from a storage/file capture envelope.
 */
function extractStorageSignals(
  envelope: CaptureEnvelope,
  _userEmail: string | null
): CaptureSignalKey[] {
  const signals: CaptureSignalKey[] = [];
  const extracted = envelope.extracted as Record<string, unknown>;

  if (extracted.shared_with_me || extracted.is_shared) {
    signals.push("file_shared_with_me");
  }

  if (extracted.is_update || extracted.modified) {
    signals.push("file_updated");
  }

  return signals;
}

/**
 * Extract signals from a finance (banking) capture envelope.
 * Money vocabulary is shared with billing — a bank credit IS a payment
 * received — but debits must not misclassify, so finance is its own area.
 */
function extractFinanceSignals(
  envelope: CaptureEnvelope,
  _userEmail: string | null
): CaptureSignalKey[] {
  const signals: CaptureSignalKey[] = [];
  const extracted = envelope.extracted as Record<string, unknown>;

  if (extracted.direction === "credit") {
    signals.push("billing_payment_received");
  }

  const amount = typeof extracted.amount === "number" ? Math.abs(extracted.amount) : undefined;
  if (amount && amount >= 1000) {
    signals.push("billing_large_amount");
  }

  return signals;
}

/** Capture area (category) */
type CaptureArea =
  | "email"
  | "calendar"
  | "communication"
  | "billing"
  | "storage"
  | "crm"
  | "meetings"
  | "documents"
  | "project_management"
  | "finance";

const SOURCE_TO_AREA: Record<string, CaptureArea> = {
  gmail: "email",
  outlook: "email",
  yahoo_mail: "email",
  googlecalendar: "calendar",
  outlook_calendar: "calendar",
  cal: "calendar",
  calendly: "calendar",
  slack: "communication",
  stripe: "billing",
  quickbooks: "billing",
  xero: "billing",
  mercury: "finance",
  googledrive: "storage",
  dropbox: "storage",
  onedrive: "storage",
  hubspot: "crm",
  salesforce: "crm",
  pipedrive: "crm",
  fireflies: "meetings",
  otter: "meetings",
  notion: "documents",
  googledocs: "documents",
  asana: "project_management",
  linear: "project_management",
  jira: "project_management",
  trello: "project_management",
  monday: "project_management",
};

/**
 * Extract signals from a capture envelope based on its source type.
 * Area-based, not app-specific — Gmail and Outlook both route through email signals.
 */
export function extractCaptureSignals(
  envelope: CaptureEnvelope,
  userEmail: string | null
): CaptureSignalKey[] {
  const area = SOURCE_TO_AREA[envelope.sourceType] ?? "email";

  switch (area) {
    case "email":
      return extractEmailSignals(envelope, userEmail);
    case "calendar":
      return extractCalendarSignals(envelope, userEmail);
    case "communication":
      return extractCommunicationSignals(envelope, userEmail);
    case "billing":
      return extractBillingSignals(envelope, userEmail);
    case "finance":
      return extractFinanceSignals(envelope, userEmail);
    case "storage":
      return extractStorageSignals(envelope, userEmail);
    default:
      return [];
  }
}
