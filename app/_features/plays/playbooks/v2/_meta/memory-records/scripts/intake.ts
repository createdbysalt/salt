/**
 * Memory Records Playbook - Intake Script
 *
 * Handles entity intake from two sources:
 * 1. Ask Salt — User explicitly requests to add records
 * 2. Captures — Emails, meetings, files that imply new records
 *
 * This module is the source of truth for:
 * - Entity parsing from text
 * - Record qualifiers (when to suggest creating a record)
 * - Dependency ordering for multi-entity creation
 * - Watch trigger fields for incomplete records
 */

/**
 * Entity types that can be created during intake.
 * Ordered by dependency tier (earlier tiers must be created first).
 */
export type IntakeEntityType =
  | "organization"
  | "person"
  | "file"
  | "work"
  | "meeting"
  | "billing";

/**
 * Dependency tiers for entity creation order.
 * - Tier 1: No dependencies (org)
 * - Tier 2: Can link to tier 1 (person → org, file → org)
 * - Tier 3: Can link to tier 1 + 2 (work → org + person, meeting → person)
 * - Tier 4: Can link to all (billing → org + person + work + file)
 */
export const ENTITY_TIERS: Record<IntakeEntityType, 1 | 2 | 3 | 4> = {
  organization: 1,
  person: 2,
  file: 2,
  work: 3,
  meeting: 3,
  billing: 4,
};

/**
 * A parsed entity from user input.
 */
export interface ParsedEntity {
  type: IntakeEntityType;
  tier: 1 | 2 | 3 | 4;
  name?: string;
  email?: string;
  domain?: string;
  /** Other hints extracted from user input */
  hints: Record<string, string>;
  /** Explicit links mentioned by user (e.g., "Liam is the contact for Photon") */
  explicitLinks: Array<{
    targetType: IntakeEntityType;
    targetName: string;
    relationship: string;
  }>;
}

/**
 * Result of parsing user intake request.
 */
export interface ParsedIntakeRequest {
  /** All entities mentioned in the request */
  entities: ParsedEntity[];
  /** Entities grouped by creation tier */
  tiers: Map<1 | 2 | 3 | 4, ParsedEntity[]>;
  /** Original user message */
  originalMessage: string;
  /** Whether this is a multi-entity request */
  isMultiEntity: boolean;
}

/**
 * Fields that trigger watch registration when missing.
 */
export const WATCH_TRIGGER_FIELDS: Record<IntakeEntityType, string[]> = {
  person: ["email", "phone", "organization"],
  organization: ["domain", "website", "billing_email"],
  work: ["deadline", "organization", "contract_value_cents"],
  billing: ["due_at", "linked_work", "amount_cents"],
  file: ["category", "linked_person", "linked_org", "description"],
  meeting: ["attendees", "location", "linked_work"],
};

/**
 * Record Qualifiers — how each entity type can be sourced from captures.
 *
 * Two intake sources:
 * 1. Ask Salt — User explicitly requests to add records ("Add John Doe as a contact")
 * 2. Captures — Emails, meetings, files that imply a new record should be created
 *
 * For captures, these qualifiers describe what signals suggest a new record.
 */
export interface RecordQualifier {
  /** Where this entity can be detected */
  sources: Array<"email" | "meeting" | "file" | "invoice" | "calendar" | "drive">;
  /** Signals that suggest this entity should be created */
  signals: string[];
  /** What to extract when the signal fires */
  extractFields: string[];
  /** Confidence threshold for auto-suggest (vs. just watching) */
  suggestThreshold: number;
}

export const RECORD_QUALIFIERS: Record<IntakeEntityType, RecordQualifier> = {
  person: {
    sources: ["email", "meeting", "calendar"],
    signals: [
      "email_from_unknown_address", // Received email from address not in Memory
      "email_to_unknown_address", // Sent email to address not in Memory
      "email_cc_unknown_address", // CC'd address not in Memory
      "meeting_attendee_unknown", // Calendar attendee not in Memory
      "email_signature_has_name", // Signature block contains name + contact info
      "invoice_addressee_unknown", // Invoice to/from unknown person
    ],
    extractFields: ["name", "email", "phone", "title", "organization"],
    suggestThreshold: 80,
  },
  organization: {
    sources: ["email", "invoice", "file"],
    signals: [
      "email_domain_unknown", // Email from domain not linked to any org
      "email_signature_has_company", // Signature contains company name
      "invoice_from_unknown_company", // Invoice from unrecognized company
      "contract_mentions_company", // Contract/proposal references company
      "domain_appears_frequently", // Same domain appears 3+ times without org
    ],
    extractFields: ["name", "domain", "website", "billing_email", "industry"],
    suggestThreshold: 75,
  },
  work: {
    sources: ["email", "meeting", "file"],
    signals: [
      "email_subject_project_pattern", // Subject matches project patterns ("RE: Website Redesign")
      "meeting_title_project_pattern", // Meeting title suggests project ("Kickoff: Brand Refresh")
      "proposal_or_sow_attached", // Proposal/SOW file attached
      "invoice_line_items_suggest_project", // Invoice references work not in Memory
      "thread_discusses_scope", // Email thread mentions scope, deliverables, timeline
    ],
    extractFields: [
      "name",
      "organization",
      "deadline",
      "contract_value_cents",
      "work_type",
    ],
    suggestThreshold: 70,
  },
  billing: {
    sources: ["email", "invoice", "file"],
    signals: [
      "invoice_attachment_detected", // PDF/image attachment that looks like invoice
      "payment_notification_email", // Payment received/sent notification
      "stripe_webhook_payment", // Stripe payment event
      "email_mentions_amount_due", // Email body contains "$X due" or "payment of $X"
      "receipt_attachment_detected", // Receipt PDF attached
    ],
    extractFields: [
      "amount_cents",
      "due_at",
      "organization",
      "linked_work",
      "number",
    ],
    suggestThreshold: 85,
  },
  file: {
    sources: ["email", "drive", "file"],
    signals: [
      // Contracts & Agreements (HIGH priority for solopreneurs)
      "contract_detected", // Contract, agreement, terms
      "msa_detected", // Master Service Agreement
      "nda_detected", // Non-disclosure agreement
      "signature_request_received", // DocuSign, HelloSign, PandaDoc

      // Proposals & Quotes (HIGH priority)
      "proposal_detected", // Proposal, quote, estimate
      "sow_detected", // Scope of Work
      "brief_detected", // Client brief, creative brief

      // Deliverables (MEDIUM priority)
      "deliverable_detected", // Final deliverables
      "asset_delivered", // Design files (PSD, AI, Figma)
      "revision_detected", // Revisions

      // Client Communication
      "feedback_detected", // Client feedback
      "approval_detected", // Approval confirmations
      "onboarding_doc_detected", // Welcome packets, questionnaires

      // Drive & Sharing
      "drive_share_received", // Google Drive
      "figma_share_received", // Figma files
      "notion_share_received", // Notion pages

      // Generic (weak signal)
      "email_has_attachment",
    ],
    extractFields: [
      "title",
      "category",
      "document_type",
      "linked_person",
      "linked_org",
      "linked_work",
    ],
    suggestThreshold: 75, // Lower threshold - solopreneurs need to capture more
  },
  meeting: {
    sources: ["calendar", "email"],
    signals: [
      "calendar_event_created", // New calendar event (auto from gcal sync)
      "email_scheduling_discussion", // Email thread about scheduling a call
      "zoom_invite_detected", // Zoom/Meet link in email
      "calendar_invite_received", // Calendar invite from external party
    ],
    extractFields: [
      "title",
      "start_time",
      "attendees",
      "location",
      "meeting_url",
    ],
    suggestThreshold: 95,
  },
};

// =============================================================================
// EVIDENCE ACCUMULATION SYSTEM
// =============================================================================

/**
 * Log-odds weights for each signal.
 *
 * Based on Fellegi-Sunter model: weight = log2(m / u)
 * where m = P(match|true match), u = P(match|not match)
 *
 * Positive = evidence FOR creating record
 * Negative = evidence AGAINST (spam, noise)
 * Higher absolute value = stronger signal
 */
export const SIGNAL_WEIGHTS: Record<string, number> = {
  // Person signals (positive)
  email_from_unknown_address: 2.5,
  email_to_unknown_address: 2.0,
  email_cc_unknown_address: 1.0,
  meeting_attendee_unknown: 3.0,
  email_signature_has_name: 1.5,
  invoice_addressee_unknown: 3.5,

  // Organization signals (positive)
  email_domain_unknown: 1.5,
  email_signature_has_company: 2.0,
  invoice_from_unknown_company: 3.5,
  contract_mentions_company: 3.0,
  domain_appears_frequently: 0.5, // accumulates per occurrence

  // Work signals (positive)
  email_subject_project_pattern: 1.0,
  meeting_title_project_pattern: 1.5,
  proposal_or_sow_attached: 4.0,
  invoice_line_items_suggest_project: 2.5,
  thread_discusses_scope: 2.0,

  // Billing signals (positive)
  invoice_attachment_detected: 4.0,
  payment_notification_email: 3.5,
  stripe_webhook_payment: 5.0,
  email_mentions_amount_due: 2.5,
  receipt_attachment_detected: 3.0,

  // File signals (positive) - Solopreneur critical documents
  // Contracts & Agreements
  contract_detected: 4.0, // "contract", "agreement", "terms"
  msa_detected: 4.5, // Master Service Agreement
  nda_detected: 3.5, // Non-disclosure agreement
  signature_request_received: 4.5, // DocuSign, HelloSign, PandaDoc

  // Proposals & Quotes
  proposal_detected: 4.0, // "proposal", "quote", "estimate"
  sow_detected: 4.5, // Scope of Work
  brief_detected: 3.5, // Client brief, creative brief

  // Deliverables
  deliverable_detected: 3.5, // "final", "approved", "deliverable"
  asset_delivered: 3.0, // Design files (PSD, AI, Figma)
  revision_detected: 2.5, // "revision", "v2", "round 2"

  // Invoices & Payments (scores already in Billing signals above)
  receipt_detected: 3.0, // Payment receipts

  // Client Communication
  feedback_detected: 2.5, // Client feedback, comments
  approval_detected: 3.5, // "approved", "sign off", "looks good"
  onboarding_doc_detected: 3.0, // Welcome packet, questionnaire

  // Drive & Sharing
  drive_share_received: 2.5, // Google Drive share notification
  figma_share_received: 3.0, // Figma file share
  notion_share_received: 2.5, // Notion page share

  // Generic attachment (weak - needs other signals)
  email_has_attachment: 0.5,

  // Negative file signals
  marketing_attachment: -2.0, // Promotional PDFs
  newsletter_attachment: -2.5, // Newsletter content

  // Meeting signals (positive)
  calendar_event_created: 5.0,
  email_scheduling_discussion: 2.0,
  zoom_invite_detected: 3.0,
  calendar_invite_received: 4.0,

  // Negative signals (reduce score)
  looks_like_newsletter: -3.0,
  domain_is_known_spam: -5.0,
  no_reply_address: -4.0,
  unsubscribe_link_present: -2.5,
  bulk_sender_header: -3.0,
  automated_notification: -2.0,
};

/**
 * Thresholds for evidence-based decisions.
 * All values are in log-odds (base 2).
 *
 * suggest: Show in HQ as "suggested record"
 * auto: Auto-create if workspace has auto-create enabled
 * dismiss: Stop watching (too much negative evidence)
 */
export const EVIDENCE_THRESHOLDS: Record<
  IntakeEntityType,
  { suggest: number; auto: number; dismiss: number }
> = {
  person: { suggest: 4.0, auto: 8.0, dismiss: -3.0 },
  organization: { suggest: 3.5, auto: 7.0, dismiss: -3.0 },
  work: { suggest: 5.0, auto: 10.0, dismiss: -2.0 },
  billing: { suggest: 6.0, auto: 12.0, dismiss: -2.0 },
  file: { suggest: 3.0, auto: 6.0, dismiss: -2.0 },
  meeting: { suggest: 2.0, auto: 4.0, dismiss: -2.0 },
};

/**
 * A single piece of evidence for a pending record.
 */
export interface EvidenceSignal {
  signal: string;
  weight: number;
  captureId: string;
  timestamp: Date;
  extractedData?: Record<string, string>;
}

/**
 * Accumulated evidence for a potential record.
 */
export interface PendingEvidence {
  id: string;
  entityType: IntakeEntityType;
  identifier: string; // canonical key (email, domain, etc.)

  signals: EvidenceSignal[];
  logOddsScore: number;

  status: "watching" | "suggested" | "created" | "dismissed";
  firstSeenAt: Date;
  lastSignalAt: Date;

  extractedFields: Record<string, ExtractedValue>;
}

/**
 * A field value extracted from evidence, with provenance.
 */
export interface ExtractedValue {
  value: string;
  confidence: number;
  sources: string[]; // capture IDs
}

/**
 * Canonicalize an identifier for deduplication.
 */
export function canonicalizeIdentifier(
  entityType: IntakeEntityType,
  rawValue: string
): string {
  switch (entityType) {
    case "person":
      // Email: lowercase, trim
      return rawValue.toLowerCase().trim();

    case "organization": {
      // Domain: extract from email if needed, lowercase, strip www
      const domain = rawValue.includes("@")
        ? rawValue.split("@")[1]
        : rawValue;
      return domain?.toLowerCase().replace(/^www\./, "") ?? rawValue.toLowerCase();
    }

    case "work":
    case "billing":
    case "file":
    case "meeting":
      // Normalize whitespace, lowercase
      return rawValue.toLowerCase().trim().replace(/\s+/g, " ");

    default:
      return rawValue.toLowerCase().trim();
  }
}

/**
 * Compute the new log-odds score after adding a signal.
 */
export function accumulateEvidence(
  currentScore: number,
  signal: string
): number {
  const weight = SIGNAL_WEIGHTS[signal] ?? 0;
  return currentScore + weight;
}

/**
 * Determine the action to take based on accumulated evidence.
 */
export function evaluateEvidence(
  entityType: IntakeEntityType,
  logOddsScore: number
): "watch" | "suggest" | "auto" | "dismiss" {
  const thresholds = EVIDENCE_THRESHOLDS[entityType];

  if (logOddsScore <= thresholds.dismiss) {
    return "dismiss";
  }
  if (logOddsScore >= thresholds.auto) {
    return "auto";
  }
  if (logOddsScore >= thresholds.suggest) {
    return "suggest";
  }
  return "watch";
}

/**
 * Convert log-odds to probability (0-100%).
 * Useful for displaying confidence to users.
 */
export function logOddsToProbability(logOdds: number): number {
  // P = 2^logOdds / (1 + 2^logOdds)
  const odds = Math.pow(2, logOdds);
  const probability = odds / (1 + odds);
  return Math.round(probability * 100);
}

/**
 * Convert probability (0-100%) to log-odds.
 */
export function probabilityToLogOdds(probability: number): number {
  const p = probability / 100;
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  return Math.log2(p / (1 - p));
}

// =============================================================================
// ENTITY DETECTION PATTERNS
// =============================================================================

/**
 * Patterns for detecting entity types in user input.
 */
const ENTITY_PATTERNS: Array<{
  type: IntakeEntityType;
  patterns: RegExp[];
}> = [
  {
    type: "organization",
    patterns: [
      /(?:add|create|new)\s+(?:an?\s+)?(?:org(?:anization)?|company|client\s+company|business)\s+(?:called\s+|named\s+)?["']?([^"',]+)["']?/i,
      /([A-Z][a-zA-Z0-9]+(?:\s+(?:Inc|LLC|Corp|Ltd|Co|Studio|Agency|Labs?|Media|Group|Digital|Design|Creative)\.?))/,
      /(?:for|from|at|with)\s+(?:the\s+)?([A-Z][a-zA-Z0-9]+(?:\s+[A-Z][a-zA-Z0-9]+)*)\s+(?:team|org|company)/i,
    ],
  },
  {
    type: "person",
    patterns: [
      /(?:add|create|new)\s+(?:a\s+)?(?:person|contact|client)\s+(?:called\s+|named\s+)?["']?([^"',]+)["']?/i,
      /(?:^|[\s.!,;])(?:okay\s+)?(?:add|create)\s+(?!a\s+(?:person|contact|client|organization|org|company|work|project|job|gig|invoice|bill|receipt|meeting|file)\b)([a-zA-Z]+(?:\s+[a-zA-Z]+)?)\b/i,
      /([A-Z][a-z]+(?:\s+[A-Z]\.?)?(?:\s+[A-Z][a-z]+)?)\s+(?:is|as)\s+(?:the\s+)?(?:main\s+)?contact/i,
      /(?:with|add)\s+([A-Z][a-z]+(?:\s+[A-Z]\.?)?(?:\s+[A-Z][a-z]+)?)\s+as\s+(?:the\s+)?(?:contact|point\s+of\s+contact)/i,
    ],
  },
  {
    type: "work",
    patterns: [
      /(?:add|create|new|log)\s+(?:a\s+)?(?:work|project|job|gig)\s+(?:called\s+|named\s+)?["']?([^"',]+)["']?/i,
      /(?:working\s+on|started|doing)\s+(?:a\s+)?([a-z][a-z0-9]+(?:\s+[a-z][a-z0-9]+){0,2})\s+(?:for|with)\b/i,
    ],
  },
  {
    type: "billing",
    patterns: [
      /(?:add|create|log|track)\s+(?:a\s+)?(?:invoice|bill|receipt|payment)\s+(?:from\s+|for\s+)?["']?([^"',]+)["']?/i,
      /(?:invoice|bill)\s+(?:#|number)?\s*(\w+)/i,
      /\$[\d,]+(?:\.\d{2})?/,
    ],
  },
  {
    type: "file",
    patterns: [
      /(?:save|add|upload|store)\s+(?:the\s+)?(?:file|document|pdf|contract|attachment)/i,
      /(?:this|the)\s+(?:pdf|file|document|contract|attachment)/i,
    ],
  },
  {
    type: "meeting",
    patterns: [
      /(?:schedule|book|set\s+up|create)\s+(?:a\s+)?(?:meeting|call|appointment|chat)\s+(?:with\s+)?([^"',]+)/i,
      /(?:meeting|call)\s+(?:with\s+)?([A-Z][a-z]+(?:\s+[A-Z]\.?)?)/i,
    ],
  },
];

/**
 * Patterns for detecting explicit links between entities.
 */
const LINK_PATTERNS: Array<{
  pattern: RegExp;
  sourceType: IntakeEntityType;
  targetType: IntakeEntityType;
  relationship: string;
}> = [
  {
    pattern: /([A-Z][a-z]+(?:\s+[A-Z]\.?)?(?:\s+[A-Z][a-z]+)?)\s+(?:is|as)\s+(?:the\s+)?(?:main\s+)?contact\s+(?:for|at|of)\s+([A-Z][a-zA-Z0-9\s]+)/i,
    sourceType: "person",
    targetType: "organization",
    relationship: "primary_contact",
  },
  {
    pattern: /(?:working\s+on|for)\s+(?:a\s+)?([a-z]+(?:\s+[a-z]+)*)\s+(?:for|with)\s+([A-Z][a-zA-Z0-9\s]+)/i,
    sourceType: "work",
    targetType: "organization",
    relationship: "for_client",
  },
  {
    pattern: /invoice\s+(?:from|for)\s+([A-Z][a-zA-Z0-9\s]+)\s+(?:for\s+)?(?:the\s+)?([a-z]+(?:\s+[a-z]+)*)\s+project/i,
    sourceType: "billing",
    targetType: "work",
    relationship: "for_work",
  },
];

const PRONOUNS = new Set(["her", "him", "them", "their", "she", "he", "they"]);

function titleCaseWords(value: string): string {
  return value
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function isGarbageWorkName(name: string): boolean {
  const normalized = name.toLowerCase().trim();
  if (!normalized || normalized === "a" || normalized === "the") return true;
  if (/^(re\s+)?working\s+on(\s+a)?$/i.test(normalized)) return true;
  if (/^(on\s+)?a$/i.test(normalized)) return true;
  return false;
}

function dedupeEntities(entities: ParsedEntity[]): ParsedEntity[] {
  const seen = new Set<string>();
  const deduped: ParsedEntity[] = [];

  for (const entity of entities) {
    const key = `${entity.type}:${(entity.name ?? entity.type).toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(entity);
  }

  return deduped;
}

/**
 * Normalize names, resolve pronoun-linked work, and drop weak pattern false positives.
 */
export function finalizeIntakeEntities(entities: ParsedEntity[]): ParsedEntity[] {
  const filtered = entities.filter(
    (entity) => entity.type !== "work" || !isGarbageWorkName(entity.name ?? ""),
  );

  const person = filtered.find((entity) => entity.type === "person");

  for (const entity of filtered) {
    if (entity.type === "person" && entity.name) {
      entity.name = titleCaseWords(entity.name);
    }

    entity.explicitLinks = entity.explicitLinks.filter(
      (link) => !PRONOUNS.has(link.targetName.toLowerCase()),
    );

    if (entity.type === "work" && entity.name?.toLowerCase() === "project" && person?.name) {
      entity.name = `Project for ${person.name}`;
      entity.explicitLinks.push({
        targetType: "person",
        targetName: person.name,
        relationship: "primary_contact",
      });
      delete entity.hints.linked_person_pronoun;
    }
  }

  return dedupeEntities(filtered);
}

/**
 * Parse user message to extract all mentioned entities.
 */
export function parseIntakeRequest(message: string): ParsedIntakeRequest {
  const entities: ParsedEntity[] = [];
  const seenNames = new Set<string>();

  // Extract entities using patterns
  for (const { type, patterns } of ENTITY_PATTERNS) {
    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        const name = match[1].trim();
        const normalizedName = name.toLowerCase();

        // Avoid duplicates
        if (!seenNames.has(normalizedName)) {
          seenNames.add(normalizedName);
          entities.push({
            type,
            tier: ENTITY_TIERS[type],
            name,
            hints: {},
            explicitLinks: [],
          });
        }
      }
    }
  }

  // Extract email addresses
  const emailMatch = message.match(/[\w.-]+@[\w.-]+\.\w+/g);
  if (emailMatch) {
    for (const email of emailMatch) {
      const domain = email.split("@")[1];
      const person = entities.find((e) => e.type === "person");
      if (person) {
        person.email = email;
      }
      const org = entities.find((e) => e.type === "organization");
      if (org) {
        org.domain = domain;
      }
    }
  }

  // Work linked to a person via pronoun ("project for her")
  const projectForPronoun = message.match(
    /(?:working\s+on|we'?re\s+working\s+on)\s+(?:a\s+)?(?:new\s+)?project\s+for\s+(her|him|them)\b/i,
  );
  if (projectForPronoun) {
    const existingWork = entities.find((e) => e.type === "work");
    if (existingWork) {
      existingWork.hints.linked_person_pronoun = projectForPronoun[1].toLowerCase();
    } else {
      entities.push({
        type: "work",
        tier: ENTITY_TIERS.work,
        name: "project",
        hints: { linked_person_pronoun: projectForPronoun[1].toLowerCase() },
        explicitLinks: [],
      });
    }
  }

  // Extract explicit links
  for (const { pattern, sourceType, targetType, relationship } of LINK_PATTERNS) {
    const match = message.match(pattern);
    if (match) {
      const source = entities.find(
        (e) => e.type === sourceType && e.name?.toLowerCase().includes(match[1].toLowerCase())
      );
      const targetName = match[2].trim();
      if (source) {
        source.explicitLinks.push({
          targetType,
          targetName,
          relationship,
        });
      }
    }
  }

  // Group by tier
  const tiers = new Map<1 | 2 | 3 | 4, ParsedEntity[]>();
  const finalizedEntities = finalizeIntakeEntities(entities);
  for (const entity of finalizedEntities) {
    const tier = entity.tier;
    if (!tiers.has(tier)) {
      tiers.set(tier, []);
    }
    tiers.get(tier)!.push(entity);
  }

  return {
    entities: finalizedEntities,
    tiers,
    originalMessage: message,
    isMultiEntity: finalizedEntities.length > 1,
  };
}

/**
 * Get the creation order for entities (sorted by tier, then by type within tier).
 */
export function getCreationOrder(request: ParsedIntakeRequest): ParsedEntity[] {
  return [...request.entities].sort((a, b) => {
    if (a.tier !== b.tier) {
      return a.tier - b.tier;
    }
    // Within same tier, org before person before file, etc.
    const order: IntakeEntityType[] = ["organization", "person", "file", "work", "meeting", "billing"];
    return order.indexOf(a.type) - order.indexOf(b.type);
  });
}

/**
 * Determine which fields should trigger watch registration.
 */
export function getMissingFieldsToWatch(
  entityType: IntakeEntityType,
  presentFields: string[]
): string[] {
  const watchFields = WATCH_TRIGGER_FIELDS[entityType] || [];
  return watchFields.filter((field) => !presentFields.includes(field));
}

/**
 * Extract amount in cents from user message.
 */
export function extractAmountCents(message: string): number | null {
  const match = message.match(/\$[\s]*([\d,]+(?:\.\d{2})?)/);
  if (match) {
    const amount = parseFloat(match[1].replace(/,/g, ""));
    return Math.round(amount * 100);
  }
  return null;
}

/**
 * Extract date mentions from user message.
 */
export function extractDateHints(message: string): { dueDate?: string; deadline?: string } {
  const hints: { dueDate?: string; deadline?: string } = {};

  // "due in X days"
  const dueInMatch = message.match(/due\s+in\s+(\d+)\s+days?/i);
  if (dueInMatch) {
    const days = parseInt(dueInMatch[1], 10);
    const date = new Date();
    date.setDate(date.getDate() + days);
    hints.dueDate = date.toISOString().split("T")[0];
  }

  // "deadline: DATE" or "by DATE"
  const deadlineMatch = message.match(/(?:deadline|by)\s+(\w+\s+\d+|\d+\/\d+\/\d+)/i);
  if (deadlineMatch) {
    hints.deadline = deadlineMatch[1];
  }

  return hints;
}
