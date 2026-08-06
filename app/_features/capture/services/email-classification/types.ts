/**
 * Email Intelligence Layer Types
 *
 * Multi-dimensional email classification for triage, priority, and learning.
 * See: docs/plans/2026-07-13-email-intelligence-layer.md
 */

export type EmailCategoryValue =
  | "action_required"
  | "money_moves"
  | "opportunities"
  | "updates"
  | "subscribed"
  | "noise";

export type EmailPriorityTierValue =
  | "urgent"
  | "important"
  | "normal"
  | "low"
  | "noise";

export type EmailType =
  | "personal"
  | "transactional"
  | "promotional"
  | "automated"
  | "unknown";

export type UrgencyLevel = "none" | "low" | "medium" | "high" | "critical";

export type TriageAction = "surface_now" | "batch_digest" | "silent_archive";

export interface PriorityFactor {
  factor: string;
  weight: number;
  matched: boolean;
  evidence?: string;
}

export interface SenderReputation {
  responseRate: number;
  avgResponseTimeHours: number | null;
  captureCount: number;
  archivedCount: number;
  repliedCount: number;
  reputationScore: number;
  lastCalculatedAt: string | null;
}

export interface EmailClassification {
  type: EmailType;
  typeConfidence: number;

  category: EmailCategoryValue;
  categoryConfidence: number;

  priorityScore: number;
  priorityTier: EmailPriorityTierValue;
  priorityFactors: PriorityFactor[];

  urgencyLevel: UrgencyLevel;
  urgencyMarkers: string[];

  senderReputation: SenderReputation | null;
  relationshipStrength: number;

  triageAction: TriageAction;

  signals: string[];
}

export interface EmailClassificationInput {
  messageId: string;
  threadId: string | null;
  subject: string;
  bodyPreview: string;
  fromEmail: string;
  fromName: string | null;
  toEmails: string[];
  ccEmails: string[];
  receivedAt: string;
  hasAttachments: boolean;
  attachmentNames: string[];
  headers: Record<string, string>;
  labels?: string[];
  isReply: boolean;
  threadDepth: number;
}

export interface ClassificationContext {
  workspaceId: string;
  operatorEmail: string;
  workspaceDomains: string[];
  clientEmails: Set<string>;
  clientDomains: Set<string>;
  vipEmails: Set<string>;
  senderProfiles: Map<string, SenderReputation>;
}

export const PRIORITY_WEIGHTS = {
  from_client: 30,
  from_vip: 25,
  mentions_money: 20,
  mentions_deadline: 15,
  requires_action: 15,
  ongoing_thread: 10,
  you_initiated: 10,
  has_attachment: 5,
  is_reply: 5,
  from_newsletter: -20,
  from_automated: -30,
  bulk_headers: -25,
  list_unsubscribe: -20,
  consumer_domain_unknown: -10,
} as const;

export type PriorityWeightKey = keyof typeof PRIORITY_WEIGHTS;

export const PRIORITY_TIER_THRESHOLDS = {
  urgent: 80,
  important: 60,
  normal: 40,
  low: 20,
} as const;

export const URGENCY_KEYWORDS = {
  critical: [
    "urgent",
    "asap",
    "immediately",
    "emergency",
    "critical",
    "time-sensitive",
  ],
  high: ["today", "eod", "end of day", "this afternoon", "right away", "rush"],
  medium: ["soon", "by tomorrow", "this week", "deadline", "due date"],
  low: ["when you can", "at your convenience", "whenever", "no rush"],
} as const;

export const MONEY_PATTERNS = [
  /\$[\d,]+(?:\.\d{2})?/,
  /(?:USD|EUR|GBP|CAD)\s*[\d,]+(?:\.\d{2})?/,
  /invoice\s*#?\s*\d+/i,
  /payment\s+(?:of|for|received)/i,
  /quote\s*#?\s*\d+/i,
  /estimate\s*#?\s*\d+/i,
  /receipt\s*#?\s*\d+/i,
  /amount\s+due/i,
  /total\s+due/i,
  /pay\s+now/i,
] as const;

export const ACTION_PATTERNS = [
  /please\s+(?:review|sign|approve|confirm|respond|let me know)/i,
  /could\s+you\s+(?:please\s+)?(?:review|sign|approve|confirm|respond)/i,
  /waiting\s+(?:on|for)\s+(?:your|you)/i,
  /need\s+(?:your|a)\s+(?:response|approval|signature|decision)/i,
  /action\s+required/i,
  /your\s+(?:review|approval|signature)\s+(?:is\s+)?(?:needed|required)/i,
  /^(?:can|could|would)\s+you\b/im,
] as const;

export const DEADLINE_PATTERNS = [
  /by\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i,
  /by\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{1,2}/i,
  /by\s+\d{1,2}\/\d{1,2}/,
  /(?:due|deadline|expires?)\s*:?\s*(?:on\s+)?(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d{1,2}\/\d{1,2})/i,
  /due\s+(?:today|tomorrow|this week|next week)/i,
  /before\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d{1,2}\/\d{1,2})/i,
] as const;

export const QUESTION_PATTERNS = [
  /\?$/m,
  /^(?:can|could|would|will|do|does|is|are|have|has|what|when|where|why|how|which)\s/im,
  /let\s+me\s+know\b/i,
  /thoughts\s*\?/i,
] as const;

export const NEWSLETTER_PATTERNS = [
  /list-unsubscribe/i,
  /^(?:the\s+)?(?:weekly|daily|monthly)\s+(?:digest|newsletter|update|roundup)/i,
  /unsubscribe\s+(?:here|from|link)/i,
  /you(?:'re|\s+are)\s+receiving\s+this\s+(?:email|message)\s+because/i,
  /manage\s+(?:your\s+)?(?:email\s+)?preferences/i,
] as const;

export const PAYMENT_LINK_DOMAINS = [
  "stripe.com",
  "paypal.com",
  "paypal.me",
  "venmo.com",
  "square.com",
  "squareup.com",
  "checkout.stripe.com",
  "invoice.stripe.com",
  "buy.stripe.com",
  "payments.google.com",
  "pay.google.com",
] as const;

export const INVOICE_ATTACHMENT_PATTERNS = [
  /invoice/i,
  /receipt/i,
  /statement/i,
  /bill/i,
  /quote/i,
  /estimate/i,
  /\.pdf$/i,
] as const;

export const CONSUMER_EMAIL_DOMAINS = [
  "gmail.com",
  "yahoo.com",
  "hotmail.com",
  "outlook.com",
  "icloud.com",
  "aol.com",
  "live.com",
  "msn.com",
  "protonmail.com",
  "proton.me",
  "fastmail.com",
  "hey.com",
  "me.com",
  "mac.com",
] as const;
