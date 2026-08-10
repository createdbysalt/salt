/**
 * Workspace Signal Registry
 *
 * Single source of truth for all signals that can trigger playbooks.
 * Every signal is registry-bounded with a description for the model
 * (anti-hallucination). Used by:
 * - Records engine (Memory Care profile rules)
 * - Trigger dispatch (acting playbooks)
 * - Frontmatter validation (compile-time)
 * - Ask SALT routing (chat-time)
 */

import {
  PERSON_PROFILE_SIGNAL_KEYS,
  ORG_PROFILE_SIGNAL_KEYS,
  WORK_PROFILE_SIGNAL_KEYS,
  BILLING_PROFILE_SIGNAL_KEYS,
  MEETING_PROFILE_SIGNAL_KEYS,
  FILE_PROFILE_SIGNAL_KEYS,
  NOTE_PROFILE_SIGNAL_KEYS,
  OPERATOR_FACT_SIGNAL_KEYS,
  CAPTURE_SIGNAL_KEYS,
  EMAIL_INTELLIGENCE_SIGNAL_KEYS,
  WORKSPACE_SIGNAL_KEYS,
  type ProfileSignalKey,
} from "@/app/_features/plays/playbooks/records-engine/types";

import type { SignalSurface, SignalDefinition } from "./types";

const PERSON_SIGNAL_DESCRIPTIONS: Record<
  string,
  { description: string; firesWhen: string; canTriggerActing: boolean }
> = {
  person_created: {
    description: "Person was just created in Memory",
    firesWhen: "New person added",
    canTriggerActing: true,
  },
  person_updated: {
    description: "Person record was updated",
    firesWhen: "Person field changed",
    canTriggerActing: false,
  },
  has_payment_received: {
    description: "Person has received a payment",
    firesWhen: "Stripe payment event captured",
    canTriggerActing: true,
  },
  has_stripe_payment: {
    description: "Person has a Stripe payment on record",
    firesWhen: "Stripe payment linked",
    canTriggerActing: false,
  },
  has_invoice_sent: {
    description: "Person has been sent an invoice",
    firesWhen: "Invoice captured for this person",
    canTriggerActing: true,
  },
  is_bidirectional_thread: {
    description: "Two-way email thread exists with this person",
    firesWhen: "Email exchange detected",
    canTriggerActing: true,
  },
  you_initiated: {
    description: "You sent the first email to this person",
    firesWhen: "Outbound email captured",
    canTriggerActing: false,
  },
  has_calendar_meeting: {
    description: "Person has an upcoming or past calendar meeting",
    firesWhen: "Calendar event with this person",
    canTriggerActing: true,
  },
  has_signature: {
    description: "Person has signed a document",
    firesWhen: "Signature event captured",
    canTriggerActing: true,
  },
  email_count: {
    description: "Number of emails exchanged with this person",
    firesWhen: "Email count threshold met",
    canTriggerActing: false,
  },
  email_domain_is_personal: {
    description: "Person's email is from a personal domain (gmail, etc)",
    firesWhen: "Email domain classified",
    canTriggerActing: false,
  },
  email_domain_matches_workspace: {
    description: "Person's email domain matches your workspace domain",
    firesWhen: "Email domain compared",
    canTriggerActing: false,
  },
  email_domain_in_partner_list: {
    description: "Person's email domain is in your partner list",
    firesWhen: "Domain matched to partners",
    canTriggerActing: false,
  },
  email_domain_in_vendor_list: {
    description: "Person's email domain is in your vendor list",
    firesWhen: "Domain matched to vendors",
    canTriggerActing: false,
  },
  person_no_contact_30_days: {
    description: "No contact with this person in 30+ days",
    firesWhen: "Daily scan detects silence",
    canTriggerActing: true,
  },
  person_appears_in_multiple_orgs: {
    description: "Person appears linked to multiple organizations",
    firesWhen: "Duplicate detection run",
    canTriggerActing: false,
  },
  person_duplicate_email: {
    description: "Another person record has the same email",
    firesWhen: "Duplicate detection run",
    canTriggerActing: false,
  },
  person_duplicate_phone: {
    description: "Another person record has the same phone number",
    firesWhen: "Duplicate detection run",
    canTriggerActing: false,
  },
  person_no_activity_90d: {
    description: "No activity on this person record in 90+ days",
    firesWhen: "Hygiene staleness scan",
    canTriggerActing: false,
  },
  person_missing_email: {
    description: "Person record has no email address",
    firesWhen: "Completeness check run",
    canTriggerActing: false,
  },
  person_orphan: {
    description: "Person has no organization, work, or billing connections",
    firesWhen: "Orphan detection run",
    canTriggerActing: false,
  },
};

const ORG_SIGNAL_DESCRIPTIONS: Record<
  string,
  { description: string; firesWhen: string; canTriggerActing: boolean }
> = {
  org_created: {
    description: "Organization was just created in Memory",
    firesWhen: "New organization added",
    canTriggerActing: true,
  },
  org_updated: {
    description: "Organization record was updated",
    firesWhen: "Organization field changed",
    canTriggerActing: false,
  },
  org_domain_known: {
    description: "Organization has a known domain",
    firesWhen: "Domain extracted",
    canTriggerActing: false,
  },
  org_created_from_domain: {
    description: "Organization was auto-created from an email domain",
    firesWhen: "Domain-based org creation",
    canTriggerActing: false,
  },
  org_has_payment_received: {
    description: "Organization has made a payment",
    firesWhen: "Payment captured for org",
    canTriggerActing: true,
  },
  org_has_invoice_sent: {
    description: "Organization has been sent an invoice",
    firesWhen: "Invoice captured for org",
    canTriggerActing: true,
  },
  org_has_primary_contact: {
    description: "Organization has a designated primary contact",
    firesWhen: "Key contact linked",
    canTriggerActing: false,
  },
  org_has_people: {
    description: "Organization has people linked to it",
    firesWhen: "Person linked to org",
    canTriggerActing: false,
  },
  org_domain_in_partner_list: {
    description: "Organization's domain is in your partner list",
    firesWhen: "Domain matched to partners",
    canTriggerActing: false,
  },
  org_domain_in_vendor_list: {
    description: "Organization's domain is in your vendor list",
    firesWhen: "Domain matched to vendors",
    canTriggerActing: false,
  },
  inferred_industry: {
    description: "Industry was inferred for this organization",
    firesWhen: "Industry classification run",
    canTriggerActing: false,
  },
  inferred_industry_parent: {
    description: "Parent industry was inferred",
    firesWhen: "Industry classification run",
    canTriggerActing: false,
  },
  inferred_industry_child: {
    description: "Child industry was inferred",
    firesWhen: "Industry classification run",
    canTriggerActing: false,
  },
  org_missing_industry: {
    description: "Organization is missing industry classification",
    firesWhen: "Completeness check run",
    canTriggerActing: false,
  },
  org_missing_key_contact: {
    description: "Organization is missing a key contact",
    firesWhen: "Completeness check run",
    canTriggerActing: false,
  },
  org_duplicate_domain: {
    description: "Another organization has the same domain",
    firesWhen: "Duplicate detection run",
    canTriggerActing: false,
  },
  org_no_activity_90d: {
    description: "No activity on this organization record in 90+ days",
    firesWhen: "Hygiene staleness scan",
    canTriggerActing: false,
  },
  org_missing_domain: {
    description: "Organization has no domain or website",
    firesWhen: "Completeness check run",
    canTriggerActing: false,
  },
};

const WORK_SIGNAL_DESCRIPTIONS: Record<
  string,
  { description: string; firesWhen: string; canTriggerActing: boolean }
> = {
  work_created: {
    description: "Work record was just created",
    firesWhen: "New work created",
    canTriggerActing: true,
  },
  work_updated: {
    description: "Work record was updated",
    firesWhen: "Work field changed",
    canTriggerActing: false,
  },
  work_has_signed_contract: {
    description: "Work has a signed contract attached",
    firesWhen: "Contract signed",
    canTriggerActing: true,
  },
  work_has_kickoff: {
    description: "Work has a kickoff meeting scheduled or completed",
    firesWhen: "Kickoff meeting detected",
    canTriggerActing: true,
  },
  work_is_blocked: {
    description: "Work has blocker tags or status",
    firesWhen: "Blocker added to work",
    canTriggerActing: true,
  },
  work_has_completed_deliverable: {
    description: "Work has a completed deliverable",
    firesWhen: "Deliverable marked complete",
    canTriggerActing: true,
  },
  work_has_due_date: {
    description: "Work has a due date set",
    firesWhen: "Due date set",
    canTriggerActing: false,
  },
  inferred_description: {
    description: "Description was inferred for this work",
    firesWhen: "AI description inferred",
    canTriggerActing: false,
  },
  inferred_deadline: {
    description: "Deadline was inferred for this work",
    firesWhen: "AI deadline inferred",
    canTriggerActing: false,
  },
  inferred_start_date: {
    description: "Start date was inferred for this work",
    firesWhen: "AI start date inferred",
    canTriggerActing: false,
  },
  work_stale_active: {
    description: "Active work item with no recent activity",
    firesWhen: "Hygiene staleness scan",
    canTriggerActing: false,
  },
};

const BILLING_SIGNAL_DESCRIPTIONS: Record<
  string,
  { description: string; firesWhen: string; canTriggerActing: boolean }
> = {
  billing_created: {
    description: "Billing record was just created",
    firesWhen: "New invoice or payment record added",
    canTriggerActing: true,
  },
  billing_updated: {
    description: "Billing record was updated",
    firesWhen: "Billing field changed",
    canTriggerActing: false,
  },
  billing_payment_matched: {
    description: "Payment was matched to this billing record",
    firesWhen: "Payment reconciliation",
    canTriggerActing: true,
  },
  billing_amount_paid_covers_total: {
    description: "Amount paid covers the total due",
    firesWhen: "Payment covers invoice",
    canTriggerActing: true,
  },
  billing_due_date_passed: {
    description: "Due date has passed without full payment",
    firesWhen: "Daily overdue scan",
    canTriggerActing: true,
  },
  billing_party_email_match: {
    description: "Billing party matched by email",
    firesWhen: "Party matching run",
    canTriggerActing: false,
  },
  billing_party_customer_id_match: {
    description: "Billing party matched by customer ID",
    firesWhen: "Party matching run",
    canTriggerActing: false,
  },
  inferred_organization_id: {
    description: "Organization was inferred for this billing record",
    firesWhen: "Party inference run",
    canTriggerActing: false,
  },
  inferred_person_id: {
    description: "Person was inferred for this billing record",
    firesWhen: "Party inference run",
    canTriggerActing: false,
  },
  inferred_work_id: {
    description: "Work was inferred for this billing record",
    firesWhen: "Work inference run",
    canTriggerActing: false,
  },
  billing_duplicate_number: {
    description: "Another billing record has the same number",
    firesWhen: "Duplicate detection run",
    canTriggerActing: false,
  },
};

const MEETING_SIGNAL_DESCRIPTIONS: Record<
  string,
  { description: string; firesWhen: string; canTriggerActing: boolean }
> = {
  meeting_created: {
    description: "Meeting was just created",
    firesWhen: "New meeting added",
    canTriggerActing: true,
  },
  meeting_updated: {
    description: "Meeting record was updated",
    firesWhen: "Meeting field changed",
    canTriggerActing: false,
  },
  meeting_synced_from_calendar: {
    description: "Meeting was synced from calendar",
    firesWhen: "Calendar sync",
    canTriggerActing: false,
  },
  meeting_end_passed: {
    description: "Meeting end time has passed",
    firesWhen: "Meeting completed",
    canTriggerActing: true,
  },
  meeting_has_attendance_evidence: {
    description: "Meeting has evidence of attendance (transcript, notes)",
    firesWhen: "Meeting content captured",
    canTriggerActing: true,
  },
  meeting_cancelled_by_calendar: {
    description: "Meeting was cancelled in calendar",
    firesWhen: "Calendar cancellation",
    canTriggerActing: false,
  },
  meeting_attendee_email_match: {
    description: "Meeting attendee matched to a person",
    firesWhen: "Attendee matching run",
    canTriggerActing: false,
  },
  inferred_meeting_type: {
    description: "Meeting type was inferred",
    firesWhen: "Meeting classification run",
    canTriggerActing: false,
  },
  meeting_duplicate_time_attendees: {
    description: "Another meeting has the same time and attendees",
    firesWhen: "Duplicate detection run",
    canTriggerActing: false,
  },
};

const FILE_SIGNAL_DESCRIPTIONS: Record<
  string,
  { description: string; firesWhen: string; canTriggerActing: boolean }
> = {
  file_signature_event_sent: {
    description: "File was sent for signature",
    firesWhen: "Signature request captured",
    canTriggerActing: true,
  },
  file_signature_event_viewed: {
    description: "Signature request was viewed",
    firesWhen: "Document viewed event",
    canTriggerActing: true,
  },
  file_signature_event_signed: {
    description: "Document was signed",
    firesWhen: "Signature completed",
    canTriggerActing: true,
  },
  file_signature_event_expired: {
    description: "Signature request expired",
    firesWhen: "Signature expired",
    canTriggerActing: true,
  },
  file_source_context_match: {
    description: "File source context matched to work/org/person",
    firesWhen: "Context matching run",
    canTriggerActing: false,
  },
  inferred_category: {
    description: "File category was inferred",
    firesWhen: "File classification run",
    canTriggerActing: false,
  },
  inferred_document_type: {
    description: "Document type was inferred",
    firesWhen: "File classification run",
    canTriggerActing: false,
  },
  inferred_due_date: {
    description: "Due date was inferred for this file",
    firesWhen: "Date extraction run",
    canTriggerActing: false,
  },
  inferred_expiry_date: {
    description: "Expiry date was inferred for this file",
    firesWhen: "Date extraction run",
    canTriggerActing: false,
  },
  inferred_signed_date: {
    description: "Signed date was inferred for this file",
    firesWhen: "Date extraction run",
    canTriggerActing: false,
  },
  file_duplicate_hash: {
    description: "Another file has the same content hash",
    firesWhen: "Duplicate detection run",
    canTriggerActing: false,
  },
};

const NOTE_SIGNAL_DESCRIPTIONS: Record<
  string,
  { description: string; firesWhen: string; canTriggerActing: boolean }
> = {
  pattern_employment: {
    description:
      "Content matches employment pattern (works at, employed by, joined)",
    firesWhen: "Note extraction pattern match",
    canTriggerActing: false,
  },
  pattern_location: {
    description:
      "Content matches location pattern (lives in, based in, located in)",
    firesWhen: "Note extraction pattern match",
    canTriggerActing: false,
  },
  pattern_birthday: {
    description: "Content matches birthday pattern (birthday, born on, turns)",
    firesWhen: "Note extraction pattern match",
    canTriggerActing: false,
  },
  pattern_education: {
    description:
      "Content matches education pattern (graduated, studied, degree)",
    firesWhen: "Note extraction pattern match",
    canTriggerActing: false,
  },
  pattern_preference_explicit: {
    description:
      "Content matches explicit preference pattern (prefers, likes to)",
    firesWhen: "Note extraction pattern match",
    canTriggerActing: false,
  },
  pattern_preference_negative: {
    description:
      "Content matches negative preference pattern (don't like, avoid)",
    firesWhen: "Note extraction pattern match",
    canTriggerActing: false,
  },
  pattern_preference_time: {
    description:
      "Content matches time preference pattern (morning person, night owl)",
    firesWhen: "Note extraction pattern match",
    canTriggerActing: false,
  },
  pattern_context_milestone: {
    description:
      "Content matches milestone pattern (first payment, first project)",
    firesWhen: "Note extraction pattern match",
    canTriggerActing: false,
  },
  pattern_context_history: {
    description:
      "Content matches history pattern (been working with, history with)",
    firesWhen: "Note extraction pattern match",
    canTriggerActing: false,
  },
  pattern_relationship_referral: {
    description: "Content matches referral pattern (referred by, introduced by)",
    firesWhen: "Note extraction pattern match",
    canTriggerActing: false,
  },
  pattern_relationship_connection: {
    description: "Content matches connection pattern (knows, connected to)",
    firesWhen: "Note extraction pattern match",
    canTriggerActing: false,
  },
  pattern_relationship_family: {
    description: "Content matches family pattern (spouse, partner, family)",
    firesWhen: "Note extraction pattern match",
    canTriggerActing: false,
  },
  pattern_flag_silence: {
    description: "Content matches silence pattern (no contact, ghosted)",
    firesWhen: "Note extraction pattern match",
    canTriggerActing: false,
  },
  pattern_flag_sentiment: {
    description:
      "Content matches sentiment pattern (frustrated, upset, concerned)",
    firesWhen: "Note extraction pattern match",
    canTriggerActing: false,
  },
  pattern_flag_risk: {
    description: "Content matches risk pattern (risk, warning, careful)",
    firesWhen: "Note extraction pattern match",
    canTriggerActing: false,
  },
  pattern_flag_overdue: {
    description:
      "Content matches overdue pattern (overdue, late, missed deadline)",
    firesWhen: "Note extraction pattern match",
    canTriggerActing: false,
  },
};

const OPERATOR_FACT_SIGNAL_DESCRIPTIONS: Record<
  string,
  { description: string; firesWhen: string; canTriggerActing: boolean }
> = {
  // Identity patterns
  pattern_signature_block: {
    description:
      "Content matches email signature pattern (name, title, contact info block)",
    firesWhen: "Operator fact extraction",
    canTriggerActing: false,
  },
  pattern_timezone_mention: {
    description: "Content mentions a timezone (CST, EST, Pacific, etc.)",
    firesWhen: "Operator fact extraction",
    canTriggerActing: false,
  },
  pattern_title_role: {
    description:
      "Content mentions operator's title or role (Founder, Designer, etc.)",
    firesWhen: "Operator fact extraction",
    canTriggerActing: false,
  },
  pattern_name_correction: {
    description:
      "Content shows name preference or correction (call me, prefer to be called)",
    firesWhen: "Operator fact extraction",
    canTriggerActing: false,
  },
  pattern_phone_number: {
    description: "Content contains a phone number in operator context",
    firesWhen: "Operator fact extraction",
    canTriggerActing: false,
  },
  pattern_address_mention: {
    description: "Content mentions an address in operator context",
    firesWhen: "Operator fact extraction",
    canTriggerActing: false,
  },
  pattern_credentials: {
    description:
      "Content mentions professional credentials (CPA, MBA, PMP, etc.)",
    firesWhen: "Operator fact extraction",
    canTriggerActing: false,
  },
  // Business patterns
  pattern_business_name: {
    description: "Content mentions the operator's business name",
    firesWhen: "Operator fact extraction",
    canTriggerActing: false,
  },
  pattern_legal_entity: {
    description: "Content mentions legal entity type (LLC, Inc, Corp)",
    firesWhen: "Operator fact extraction",
    canTriggerActing: false,
  },
  pattern_tax_context: {
    description: "Content mentions tax-related context (EIN, tax ID reference)",
    firesWhen: "Operator fact extraction",
    canTriggerActing: false,
  },
  pattern_rate_pricing: {
    description:
      "Content mentions operator's rate or pricing (hourly rate, project rate)",
    firesWhen: "Operator fact extraction",
    canTriggerActing: false,
  },
  pattern_payment_terms: {
    description: "Content mentions payment terms (net 30, due on receipt)",
    firesWhen: "Operator fact extraction",
    canTriggerActing: false,
  },
  pattern_currency_default: {
    description: "Content indicates default currency preference",
    firesWhen: "Operator fact extraction",
    canTriggerActing: false,
  },
  pattern_business_address: {
    description: "Content mentions business address distinct from personal",
    firesWhen: "Operator fact extraction",
    canTriggerActing: false,
  },
  // Preference patterns
  pattern_communication_pref: {
    description:
      "Content expresses communication preference (prefer email, prefer calls)",
    firesWhen: "Operator fact extraction",
    canTriggerActing: false,
  },
  pattern_scheduling_pref: {
    description:
      "Content expresses scheduling preference (morning meetings, no Fridays)",
    firesWhen: "Operator fact extraction",
    canTriggerActing: false,
  },
  pattern_workflow_pref: {
    description:
      "Content expresses workflow preference (async, checkins, reviews)",
    firesWhen: "Operator fact extraction",
    canTriggerActing: false,
  },
  pattern_tool_pref: {
    description: "Content expresses tool preference (use Figma, prefer Slack)",
    firesWhen: "Operator fact extraction",
    canTriggerActing: false,
  },
  // Voice patterns
  pattern_voice_correction: {
    description: "Operator corrected AI-drafted text (tone, wording, style)",
    firesWhen: "Draft edit captured",
    canTriggerActing: true,
  },
  pattern_terminology_pref: {
    description: "Content shows terminology preference (say X not Y)",
    firesWhen: "Operator fact extraction",
    canTriggerActing: false,
  },
  pattern_tone_indicator: {
    description: "Content indicates tone preference (formal, casual, direct)",
    firesWhen: "Operator fact extraction",
    canTriggerActing: false,
  },
  // Relationship patterns
  pattern_referral_source: {
    description:
      "Content mentions how operator got a client (referred by, found via)",
    firesWhen: "Operator fact extraction",
    canTriggerActing: false,
  },
  pattern_partnership_mention: {
    description:
      "Content mentions a partnership or collaboration arrangement",
    firesWhen: "Operator fact extraction",
    canTriggerActing: false,
  },
  pattern_team_context: {
    description: "Content mentions team members or collaborators",
    firesWhen: "Operator fact extraction",
    canTriggerActing: false,
  },
};

const CAPTURE_SIGNAL_DESCRIPTIONS: Record<
  string,
  { description: string; firesWhen: string; canTriggerActing: boolean }
> = {
  entity_learning_extracted: {
    description: "Note-worthy learning extracted about an entity",
    firesWhen:
      "Capture analyzes email/meeting/chat with durable fact/preference/context",
    canTriggerActing: true,
  },
  capture_email_received: {
    description: "Email received from a contact",
    firesWhen: "Inbound email captured from connected account",
    canTriggerActing: true,
  },
  capture_email_sent: {
    description: "Email sent to a contact",
    firesWhen: "Outbound email captured from connected account",
    canTriggerActing: true,
  },
  capture_meeting_completed: {
    description: "Meeting has ended",
    firesWhen: "Calendar event end time has passed with attendance evidence",
    canTriggerActing: true,
  },
  capture_processed: {
    description: "Capture event fully processed",
    firesWhen: "Email/meeting/document scan completed",
    canTriggerActing: true,
  },
  org_person_contacted: {
    description: "Contact made with person at organization",
    firesWhen: "Email or meeting with org-linked person",
    canTriggerActing: true,
  },
  note_created: {
    description: "Note created for an entity",
    firesWhen: "User or system creates a note",
    canTriggerActing: true,
  },
  note_flagged: {
    description: "Note flagged for attention",
    firesWhen: "Note marked as important or concerning",
    canTriggerActing: true,
  },
  preference_detected: {
    description: "Preference pattern detected in content",
    firesWhen: "Analysis finds preference language",
    canTriggerActing: true,
  },
  context_extracted: {
    description: "Contextual information extracted",
    firesWhen: "Background/history info found in content",
    canTriggerActing: true,
  },
  connection_inferred: {
    description: "Relationship inferred between entities",
    firesWhen: "Signal patterns suggest entity connection",
    canTriggerActing: true,
  },
  connection_strengthened: {
    description: "Existing connection confidence increased",
    firesWhen: "Additional evidence for existing connection",
    canTriggerActing: false,
  },
  relationship_at_risk: {
    description: "Relationship health declining",
    firesWhen: "No contact in 60+ days or engagement dropping",
    canTriggerActing: true,
  },
  billing_payment_matched: {
    description: "Payment matched to invoice or contact",
    firesWhen: "Stripe payment linked to billing record",
    canTriggerActing: true,
  },
  file_shared: {
    description: "File shared with or by the operator",
    firesWhen: "Storage capture detects a shared file",
    canTriggerActing: true,
  },
};

const EMAIL_INTELLIGENCE_SIGNAL_DESCRIPTIONS: Record<
  string,
  { description: string; firesWhen: string; canTriggerActing: boolean }
> = {
  // Content classification signals
  email_urgency_high: {
    description: "Email contains urgency markers (ASAP, urgent, deadline)",
    firesWhen: "Email classification detects urgency keywords",
    canTriggerActing: true,
  },
  email_deadline_mentioned: {
    description: "Email mentions a specific date or deadline",
    firesWhen: "Email classification detects date patterns",
    canTriggerActing: true,
  },
  email_money_amount_detected: {
    description: "Email contains dollar amounts or currency",
    firesWhen: "Email classification detects money patterns",
    canTriggerActing: true,
  },
  email_invoice_attached: {
    description: "Email has invoice or receipt attachment",
    firesWhen: "Email classification detects invoice attachment",
    canTriggerActing: true,
  },
  email_payment_link_detected: {
    description: "Email contains Stripe, PayPal, or payment URL",
    firesWhen: "Email classification detects payment links",
    canTriggerActing: true,
  },
  email_question_asked: {
    description: "Email contains direct questions requiring response",
    firesWhen: "Email classification detects question patterns",
    canTriggerActing: true,
  },
  email_action_requested: {
    description: "Email requests action (please review, sign, approve)",
    firesWhen: "Email classification detects action request",
    canTriggerActing: true,
  },
  // Sender relationship signals
  sender_first_contact: {
    description: "First email ever received from this sender",
    firesWhen: "Email from unknown sender",
    canTriggerActing: true,
  },
  sender_reply_expected: {
    description: "Part of thread where your reply is expected",
    firesWhen: "Thread analysis detects pending response",
    canTriggerActing: true,
  },
  sender_high_engagement: {
    description: "Sender has >70% response rate from you historically",
    firesWhen: "Sender reputation calculation",
    canTriggerActing: false,
  },
  sender_vip: {
    description: "Sender is marked as VIP contact",
    firesWhen: "Sender lookup matches VIP list",
    canTriggerActing: true,
  },
  // Thread signals
  thread_stale_48h: {
    description: "Thread has no response for 48+ hours",
    firesWhen: "Thread age check exceeds threshold",
    canTriggerActing: true,
  },
  thread_awaiting_reply: {
    description: "You sent the last message in this thread",
    firesWhen: "Thread direction analysis",
    canTriggerActing: false,
  },
  // Category classification signals
  email_classified_action_required: {
    description: "Email classified as requiring action",
    firesWhen: "Email classification complete",
    canTriggerActing: true,
  },
  email_classified_money_moves: {
    description: "Email classified as invoice, payment, or financial",
    firesWhen: "Email classification complete",
    canTriggerActing: true,
  },
  email_classified_opportunities: {
    description: "Email classified as new lead or opportunity",
    firesWhen: "Email classification complete",
    canTriggerActing: true,
  },
  email_classified_updates: {
    description: "Email classified as project update or status report",
    firesWhen: "Email classification complete",
    canTriggerActing: false,
  },
  email_classified_subscribed: {
    description: "Email classified as newsletter or SaaS notification",
    firesWhen: "Email classification complete",
    canTriggerActing: false,
  },
  email_classified_noise: {
    description: "Email classified as marketing or bulk mail",
    firesWhen: "Email classification complete",
    canTriggerActing: false,
  },
  // Behavioral feedback signals
  email_archived_fast: {
    description: "Email archived within 30 seconds of opening",
    firesWhen: "User archives email quickly",
    canTriggerActing: false,
  },
  email_archived_unread: {
    description: "Email archived without being read",
    firesWhen: "User archives unread email",
    canTriggerActing: false,
  },
  email_replied_fast: {
    description: "Reply sent within 5 minutes of receiving",
    firesWhen: "User sends quick reply",
    canTriggerActing: false,
  },
  email_snoozed: {
    description: "Email was snoozed for later",
    firesWhen: "User snoozes email",
    canTriggerActing: false,
  },
  email_marked_important: {
    description: "User explicitly marked email as important",
    firesWhen: "User marks email important",
    canTriggerActing: false,
  },
  email_training_more_like_this: {
    description: "User requested more emails like this surfaced",
    firesWhen: "User clicks 'more like this'",
    canTriggerActing: false,
  },
  email_training_less_like_this: {
    description: "User requested fewer emails like this surfaced",
    firesWhen: "User clicks 'less like this'",
    canTriggerActing: false,
  },
};

const WORKSPACE_SIGNAL_DESCRIPTIONS: Record<
  string,
  { description: string; firesWhen: string; canTriggerActing: boolean }
> = {
  connector_connected: {
    description: "A connector was connected to the workspace",
    firesWhen:
      "Composio OAuth callback or API-key connect persists composio_status 'connected'",
    canTriggerActing: true,
  },
};

function buildSignalDefinitions(
  keys: readonly string[],
  surface: SignalSurface,
  descriptions: Record<
    string,
    { description: string; firesWhen: string; canTriggerActing: boolean }
  >
): SignalDefinition[] {
  return keys.map((key) => ({
    key,
    surface,
    description: descriptions[key]?.description ?? key,
    firesWhen: descriptions[key]?.firesWhen ?? "Unknown",
    canTriggerActing: descriptions[key]?.canTriggerActing ?? false,
  }));
}

export const SIGNAL_REGISTRY: SignalDefinition[] = [
  ...buildSignalDefinitions(
    PERSON_PROFILE_SIGNAL_KEYS,
    "person",
    PERSON_SIGNAL_DESCRIPTIONS
  ),
  ...buildSignalDefinitions(
    ORG_PROFILE_SIGNAL_KEYS,
    "organization",
    ORG_SIGNAL_DESCRIPTIONS
  ),
  ...buildSignalDefinitions(
    WORK_PROFILE_SIGNAL_KEYS,
    "work",
    WORK_SIGNAL_DESCRIPTIONS
  ),
  ...buildSignalDefinitions(
    BILLING_PROFILE_SIGNAL_KEYS,
    "billing",
    BILLING_SIGNAL_DESCRIPTIONS
  ),
  ...buildSignalDefinitions(
    MEETING_PROFILE_SIGNAL_KEYS,
    "meeting",
    MEETING_SIGNAL_DESCRIPTIONS
  ),
  ...buildSignalDefinitions(
    FILE_PROFILE_SIGNAL_KEYS,
    "resource",
    FILE_SIGNAL_DESCRIPTIONS
  ),
  ...buildSignalDefinitions(
    NOTE_PROFILE_SIGNAL_KEYS,
    "note",
    NOTE_SIGNAL_DESCRIPTIONS
  ),
  ...buildSignalDefinitions(
    OPERATOR_FACT_SIGNAL_KEYS,
    "operator",
    OPERATOR_FACT_SIGNAL_DESCRIPTIONS
  ),
  ...buildSignalDefinitions(
    CAPTURE_SIGNAL_KEYS,
    "person",
    CAPTURE_SIGNAL_DESCRIPTIONS
  ),
  ...buildSignalDefinitions(
    EMAIL_INTELLIGENCE_SIGNAL_KEYS,
    "capture",
    EMAIL_INTELLIGENCE_SIGNAL_DESCRIPTIONS
  ),
  ...buildSignalDefinitions(
    WORKSPACE_SIGNAL_KEYS,
    "workspace",
    WORKSPACE_SIGNAL_DESCRIPTIONS
  ),
];

const SIGNAL_REGISTRY_MAP = new Map(
  SIGNAL_REGISTRY.map((s) => [s.key, s])
);

/**
 * Check if a signal key is valid (exists in the registry).
 */
export function isValidSignalKey(key: string): key is ProfileSignalKey {
  return SIGNAL_REGISTRY_MAP.has(key);
}

/**
 * Get the definition for a signal key.
 */
export function getSignalDefinition(key: string): SignalDefinition | null {
  return SIGNAL_REGISTRY_MAP.get(key) ?? null;
}

/**
 * Get all signals that can trigger acting playbooks.
 */
export function getActingTriggerSignals(): SignalDefinition[] {
  return SIGNAL_REGISTRY.filter((s) => s.canTriggerActing);
}

/**
 * Get signals for a specific surface.
 */
export function getSignalsForSurface(
  surface: SignalSurface
): SignalDefinition[] {
  return SIGNAL_REGISTRY.filter((s) => s.surface === surface);
}

/**
 * All valid signal keys (for validation).
 */
export const ALL_SIGNAL_KEYS = new Set(SIGNAL_REGISTRY.map((s) => s.key));
