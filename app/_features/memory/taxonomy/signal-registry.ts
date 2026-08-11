/**
 * Signal Registry
 *
 * Defines all signals that can trigger field updates in the Memory Records playbook.
 * Each signal represents evidence extracted from connected accounts.
 *
 * Signals are grouped by the entity type they provide evidence about.
 */

// ============================================================================
// SIGNAL TYPE (for type-safe references)
// ============================================================================

export type SignalId =
  // People signals
  | "has_payment_received"
  | "has_stripe_payment"
  | "has_invoice_sent"
  | "is_bidirectional_thread"
  | "you_initiated"
  | "has_calendar_meeting"
  | "has_signature"
  | "email_count"
  | "email_count_gte_5"
  | "email_count_gte_10"
  | "email_domain_is_personal"
  | "email_domain_matches_workspace"
  | "email_domain_in_partner_list"
  | "email_domain_in_vendor_list"
  | "person_name_extracted"
  | "person_email_extracted"
  | "person_billing_email_extracted"
  | "person_phone_extracted"
  | "person_title_extracted"
  | "person_timezone_detected"
  | "person_address_extracted"
  | "person_tag_fit_detected"
  | "person_observation_detected"
  | "capture_email_received"
  | "capture_email_sent"
  | "capture_meeting_completed"
  // Organization signals
  | "org_domain_known"
  | "org_created_from_domain"
  | "org_has_payment_received"
  | "org_has_invoice_sent"
  | "org_has_primary_contact"
  | "org_has_people"
  | "org_domain_in_partner_list"
  | "org_domain_in_vendor_list"
  | "org_industry_inferred"
  | "org_website_found"
  | "org_address_extracted"
  | "org_tax_id_extracted"
  | "org_person_contacted"
  // Work signals
  | "work_has_signed_contract"
  | "work_has_kickoff"
  | "work_is_blocked"
  | "work_has_completed_deliverable"
  | "work_has_due_date"
  | "work_proposal_sent"
  | "work_proposal_accepted"
  | "work_invoice_created"
  | "work_payment_received"
  | "work_scope_extracted"
  | "work_value_extracted"
  | "work_timeline_mentioned"
  | "work_type_inferred"
  | "work_stage_inferred"
  // Billing signals
  | "billing_payment_matched"
  | "billing_amount_paid_covers_total"
  | "billing_due_date_passed"
  | "billing_party_email_match"
  | "billing_invoice_parsed"
  | "billing_receipt_parsed"
  | "billing_stripe_synced"
  // Meeting signals
  | "meeting_synced_from_calendar"
  | "meeting_end_passed"
  | "meeting_has_attendance_evidence"
  | "meeting_cancelled_by_calendar"
  | "meeting_type_inferred"
  | "meeting_attendees_extracted"
  // File signals
  | "file_signature_event_sent"
  | "file_signature_event_viewed"
  | "file_signature_event_signed"
  | "file_signature_event_expired"
  | "file_category_inferred"
  | "file_document_type_inferred"
  | "file_amount_extracted"
  | "file_date_extracted"
  // Me signals (operator profile & workspace)
  | "calendar_timezone_detected"
  | "operator_signature_has_title"
  | "linkedin_profile_scanned"
  | "operator_bio_extracted"
  | "invoice_industry_pattern"
  | "linkedin_industry_detected"
  | "timezone_location_inferred"
  | "invoice_business_type_pattern"
  | "email_signoff_name_detected"
  | "operator_phone_extracted"
  | "operator_address_extracted"
  | "workspace_website_found"
  | "workspace_legal_name_extracted"
  // Note signals
  | "note_created"
  | "note_flagged"
  | "preference_detected"
  | "context_extracted"
  | "capture_processed"
  // Connection signals
  | "connection_inferred"
  | "connection_strengthened"
  | "relationship_at_risk"
  | "file_shared";

// ============================================================================
// SIGNAL DESCRIPTOR
// ============================================================================

export interface SignalDescriptor {
  id: SignalId;
  label: string;
  entityTypes: Array<"person" | "org" | "work" | "billing" | "file" | "meeting" | "me">;
  description: string;
  sources: Array<"email" | "calendar" | "billing" | "documents" | "crm" | "social">;
}

// ============================================================================
// SIGNAL DEFINITIONS
// ============================================================================

export const SIGNALS: SignalDescriptor[] = [
  // People signals
  {
    id: "has_payment_received",
    label: "Payment Received",
    entityTypes: ["person"],
    description: "This person has paid you at least once",
    sources: ["billing"],
  },
  {
    id: "has_stripe_payment",
    label: "Stripe Payment",
    entityTypes: ["person"],
    description: "Payment received via Stripe",
    sources: ["billing"],
  },
  {
    id: "has_invoice_sent",
    label: "Invoice Sent",
    entityTypes: ["person"],
    description: "You have sent an invoice to this person",
    sources: ["billing"],
  },
  {
    id: "is_bidirectional_thread",
    label: "Bidirectional Thread",
    entityTypes: ["person"],
    description: "Email thread with replies from both sides",
    sources: ["email"],
  },
  {
    id: "you_initiated",
    label: "You Initiated",
    entityTypes: ["person"],
    description: "You sent the first email in the thread",
    sources: ["email"],
  },
  {
    id: "has_calendar_meeting",
    label: "Calendar Meeting",
    entityTypes: ["person"],
    description: "You have had a calendar meeting with this person",
    sources: ["calendar"],
  },
  {
    id: "has_signature",
    label: "Has Signature",
    entityTypes: ["person"],
    description: "Email signature detected with extractable info",
    sources: ["email"],
  },
  {
    id: "email_count",
    label: "Email Count",
    entityTypes: ["person"],
    description: "Number of emails exchanged",
    sources: ["email"],
  },
  {
    id: "email_count_gte_5",
    label: "5+ Emails",
    entityTypes: ["person"],
    description: "At least 5 emails exchanged",
    sources: ["email"],
  },
  {
    id: "email_count_gte_10",
    label: "10+ Emails",
    entityTypes: ["person"],
    description: "At least 10 emails exchanged",
    sources: ["email"],
  },
  {
    id: "email_domain_is_personal",
    label: "Personal Email",
    entityTypes: ["person"],
    description: "Email is from a personal domain (gmail, yahoo, etc.)",
    sources: ["email"],
  },
  {
    id: "email_domain_matches_workspace",
    label: "Workspace Domain Match",
    entityTypes: ["person"],
    description: "Email domain matches your workspace domain",
    sources: ["email"],
  },
  {
    id: "email_domain_in_partner_list",
    label: "Partner Domain",
    entityTypes: ["person"],
    description: "Email domain is in your partner list",
    sources: ["email"],
  },
  {
    id: "email_domain_in_vendor_list",
    label: "Vendor Domain",
    entityTypes: ["person"],
    description: "Email domain is in your vendor list",
    sources: ["email"],
  },
  {
    id: "person_name_extracted",
    label: "Name Extracted",
    entityTypes: ["person"],
    description: "Name extracted from email or signature",
    sources: ["email"],
  },
  {
    id: "person_email_extracted",
    label: "Email Extracted",
    entityTypes: ["person"],
    description: "Email address extracted",
    sources: ["email"],
  },
  {
    id: "person_billing_email_extracted",
    label: "Billing Email Extracted",
    entityTypes: ["person"],
    description: "Email address invoices are sent to, from a billing payload",
    sources: ["billing"],
  },
  {
    id: "person_phone_extracted",
    label: "Phone Extracted",
    entityTypes: ["person"],
    description: "Phone number extracted from signature",
    sources: ["email"],
  },
  {
    id: "person_title_extracted",
    label: "Title Extracted",
    entityTypes: ["person"],
    description: "Job title extracted from signature",
    sources: ["email"],
  },
  {
    id: "person_timezone_detected",
    label: "Timezone Detected",
    entityTypes: ["person"],
    description: "Timezone inferred from email headers or calendar",
    sources: ["email", "calendar"],
  },
  {
    id: "person_address_extracted",
    label: "Address Extracted",
    entityTypes: ["person"],
    description: "Address extracted from signature or documents",
    sources: ["email", "documents"],
  },
  {
    id: "person_tag_fit_detected",
    label: "Tag Fit Detected",
    entityTypes: ["person"],
    description:
      "An existing workspace tag clearly fits this person, or the evidence supports coining a new one",
    sources: ["email", "calendar", "billing"],
  },
  {
    id: "person_observation_detected",
    label: "Observation Detected",
    entityTypes: ["person"],
    description:
      "Something note-worthy changed for this person — a new role, a decision, a promise — worth a dated entity note with its source",
    sources: ["email", "calendar", "documents"],
  },
  {
    id: "capture_email_received",
    label: "Email Received",
    entityTypes: ["person"],
    description: "Email received from this person",
    sources: ["email"],
  },
  {
    id: "capture_email_sent",
    label: "Email Sent",
    entityTypes: ["person"],
    description: "Email sent to this person",
    sources: ["email"],
  },
  {
    id: "capture_meeting_completed",
    label: "Meeting Completed",
    entityTypes: ["person"],
    description: "Meeting with this person completed",
    sources: ["calendar"],
  },

  // Organization signals
  {
    id: "org_domain_known",
    label: "Domain Known",
    entityTypes: ["org"],
    description: "Organization domain has been identified",
    sources: ["email"],
  },
  {
    id: "org_created_from_domain",
    label: "Created from Domain",
    entityTypes: ["org"],
    description: "Organization was auto-created from email domain",
    sources: ["email"],
  },
  {
    id: "org_has_payment_received",
    label: "Org Payment Received",
    entityTypes: ["org"],
    description: "Someone from this org has paid you",
    sources: ["billing"],
  },
  {
    id: "org_has_invoice_sent",
    label: "Org Invoice Sent",
    entityTypes: ["org"],
    description: "You have invoiced this organization",
    sources: ["billing"],
  },
  {
    id: "org_has_primary_contact",
    label: "Has Primary Contact",
    entityTypes: ["org"],
    description: "A primary contact has been designated",
    sources: ["email", "crm"],
  },
  {
    id: "org_has_people",
    label: "Has People",
    entityTypes: ["org"],
    description: "Organization has linked people",
    sources: ["email"],
  },
  {
    id: "org_domain_in_partner_list",
    label: "Partner Org",
    entityTypes: ["org"],
    description: "Domain is in your partner list",
    sources: ["email"],
  },
  {
    id: "org_domain_in_vendor_list",
    label: "Vendor Org",
    entityTypes: ["org"],
    description: "Domain is in your vendor list",
    sources: ["email"],
  },
  {
    id: "org_industry_inferred",
    label: "Industry Inferred",
    entityTypes: ["org"],
    description: "Industry inferred from domain or context",
    sources: ["email", "social"],
  },
  {
    id: "org_website_found",
    label: "Website Found",
    entityTypes: ["org"],
    description: "Website URL discovered",
    sources: ["email", "social"],
  },
  {
    id: "org_address_extracted",
    label: "Org Address Extracted",
    entityTypes: ["org"],
    description: "Address extracted from documents or invoices",
    sources: ["documents", "billing"],
  },
  {
    id: "org_tax_id_extracted",
    label: "Tax ID Extracted",
    entityTypes: ["org"],
    description: "Tax ID extracted from invoices",
    sources: ["billing", "documents"],
  },
  {
    id: "org_person_contacted",
    label: "Person Contacted",
    entityTypes: ["org"],
    description: "Someone at this organization was contacted",
    sources: ["email", "calendar"],
  },

  // Work signals
  {
    id: "work_has_signed_contract",
    label: "Contract Signed",
    entityTypes: ["work"],
    description: "A contract has been signed for this work",
    sources: ["documents"],
  },
  {
    id: "work_has_kickoff",
    label: "Kickoff Occurred",
    entityTypes: ["work"],
    description: "Kickoff meeting has happened",
    sources: ["calendar"],
  },
  {
    id: "work_is_blocked",
    label: "Work Blocked",
    entityTypes: ["work"],
    description: "Work is waiting on something",
    sources: ["email"],
  },
  {
    id: "work_has_completed_deliverable",
    label: "Deliverable Completed",
    entityTypes: ["work"],
    description: "Final deliverable has been sent",
    sources: ["email", "documents"],
  },
  {
    id: "work_has_due_date",
    label: "Due Date Set",
    entityTypes: ["work"],
    description: "Deadline has been mentioned or set",
    sources: ["email", "documents"],
  },
  {
    id: "work_proposal_sent",
    label: "Proposal Sent",
    entityTypes: ["work"],
    description: "A proposal has been sent",
    sources: ["email", "documents"],
  },
  {
    id: "work_proposal_accepted",
    label: "Proposal Accepted",
    entityTypes: ["work"],
    description: "Client accepted the proposal",
    sources: ["email"],
  },
  {
    id: "work_invoice_created",
    label: "Invoice Created",
    entityTypes: ["work"],
    description: "An invoice was created for this work",
    sources: ["billing"],
  },
  {
    id: "work_payment_received",
    label: "Work Payment Received",
    entityTypes: ["work"],
    description: "Payment received for this work",
    sources: ["billing"],
  },
  {
    id: "work_scope_extracted",
    label: "Scope Extracted",
    entityTypes: ["work"],
    description: "Scope items extracted from proposal/contract",
    sources: ["documents"],
  },
  {
    id: "work_value_extracted",
    label: "Value Extracted",
    entityTypes: ["work"],
    description: "Contract value extracted from documents",
    sources: ["documents", "billing"],
  },
  {
    id: "work_timeline_mentioned",
    label: "Timeline Mentioned",
    entityTypes: ["work"],
    description: "Timeline or duration mentioned in emails",
    sources: ["email"],
  },
  {
    id: "work_type_inferred",
    label: "Work Type Inferred",
    entityTypes: ["work"],
    description: "Work type inferred from context",
    sources: ["email", "documents"],
  },
  {
    id: "work_stage_inferred",
    label: "Stage Inferred",
    entityTypes: ["work"],
    description: "Work stage inferred from activity",
    sources: ["email", "calendar", "billing"],
  },

  // Billing signals
  {
    id: "billing_payment_matched",
    label: "Payment Matched",
    entityTypes: ["billing"],
    description: "A payment was matched to this invoice",
    sources: ["billing"],
  },
  {
    id: "billing_amount_paid_covers_total",
    label: "Fully Paid",
    entityTypes: ["billing"],
    description: "Amount paid covers the total amount",
    sources: ["billing"],
  },
  {
    id: "billing_due_date_passed",
    label: "Due Date Passed",
    entityTypes: ["billing"],
    description: "Due date has passed without full payment",
    sources: ["billing"],
  },
  {
    id: "billing_party_email_match",
    label: "Party Email Match",
    entityTypes: ["billing"],
    description: "Billing party matched by email",
    sources: ["billing", "email"],
  },
  {
    id: "billing_invoice_parsed",
    label: "Invoice Parsed",
    entityTypes: ["billing"],
    description: "Invoice document was parsed",
    sources: ["documents"],
  },
  {
    id: "billing_receipt_parsed",
    label: "Receipt Parsed",
    entityTypes: ["billing"],
    description: "Receipt or payment confirmation parsed",
    sources: ["email", "documents"],
  },
  {
    id: "billing_stripe_synced",
    label: "Stripe Synced",
    entityTypes: ["billing"],
    description: "Record synced from Stripe",
    sources: ["billing"],
  },

  // Meeting signals
  {
    id: "meeting_synced_from_calendar",
    label: "Calendar Synced",
    entityTypes: ["meeting"],
    description: "Meeting synced from connected calendar",
    sources: ["calendar"],
  },
  {
    id: "meeting_end_passed",
    label: "Meeting Ended",
    entityTypes: ["meeting"],
    description: "Meeting end time has passed",
    sources: ["calendar"],
  },
  {
    id: "meeting_has_attendance_evidence",
    label: "Attendance Evidence",
    entityTypes: ["meeting"],
    description: "Evidence the meeting actually happened",
    sources: ["calendar", "email"],
  },
  {
    id: "meeting_cancelled_by_calendar",
    label: "Meeting Cancelled",
    entityTypes: ["meeting"],
    description: "Meeting was cancelled in calendar",
    sources: ["calendar"],
  },
  {
    id: "meeting_type_inferred",
    label: "Meeting Type Inferred",
    entityTypes: ["meeting"],
    description: "Meeting type inferred from title/description",
    sources: ["calendar"],
  },
  {
    id: "meeting_attendees_extracted",
    label: "Attendees Extracted",
    entityTypes: ["meeting"],
    description: "Attendee list extracted from calendar",
    sources: ["calendar"],
  },

  // File signals
  {
    id: "file_signature_event_sent",
    label: "Signature Sent",
    entityTypes: ["file"],
    description: "Document sent for signature",
    sources: ["documents"],
  },
  {
    id: "file_signature_event_viewed",
    label: "Signature Viewed",
    entityTypes: ["file"],
    description: "Recipient viewed the signature request",
    sources: ["documents"],
  },
  {
    id: "file_signature_event_signed",
    label: "Document Signed",
    entityTypes: ["file"],
    description: "Document was signed",
    sources: ["documents"],
  },
  {
    id: "file_signature_event_expired",
    label: "Signature Expired",
    entityTypes: ["file"],
    description: "Signature request expired",
    sources: ["documents"],
  },
  {
    id: "file_category_inferred",
    label: "Category Inferred",
    entityTypes: ["file"],
    description: "File category inferred from content",
    sources: ["documents"],
  },
  {
    id: "file_document_type_inferred",
    label: "Document Type Inferred",
    entityTypes: ["file"],
    description: "Document type inferred from content",
    sources: ["documents"],
  },
  {
    id: "file_amount_extracted",
    label: "Amount Extracted",
    entityTypes: ["file"],
    description: "Monetary amount extracted from document",
    sources: ["documents"],
  },
  {
    id: "file_date_extracted",
    label: "Date Extracted",
    entityTypes: ["file"],
    description: "Important date extracted from document",
    sources: ["documents"],
  },

  // Me signals
  {
    id: "calendar_timezone_detected",
    label: "Timezone Detected",
    entityTypes: ["me"],
    description: "Your timezone detected from calendar",
    sources: ["calendar"],
  },
  {
    id: "operator_signature_has_title",
    label: "Signature Has Title",
    entityTypes: ["me"],
    description: "Your email signature includes a title",
    sources: ["email"],
  },
  {
    id: "linkedin_profile_scanned",
    label: "LinkedIn Scanned",
    entityTypes: ["me"],
    description: "Your LinkedIn profile was analyzed",
    sources: ["social"],
  },
  {
    id: "operator_bio_extracted",
    label: "Bio Extracted",
    entityTypes: ["me"],
    description: "Bio/tagline extracted from social profiles",
    sources: ["social"],
  },
  {
    id: "invoice_industry_pattern",
    label: "Industry from Invoices",
    entityTypes: ["me"],
    description: "Industry inferred from invoice patterns",
    sources: ["billing"],
  },
  {
    id: "linkedin_industry_detected",
    label: "LinkedIn Industry",
    entityTypes: ["me"],
    description: "Industry from LinkedIn profile",
    sources: ["social"],
  },
  {
    id: "timezone_location_inferred",
    label: "Location from Timezone",
    entityTypes: ["me"],
    description: "Location inferred from timezone",
    sources: ["calendar"],
  },
  {
    id: "invoice_business_type_pattern",
    label: "Business Type from Invoices",
    entityTypes: ["me"],
    description: "Business type inferred from invoice patterns",
    sources: ["billing"],
  },
  {
    id: "email_signoff_name_detected",
    label: "Sign-off Name",
    entityTypes: ["me"],
    description: "Preferred name from email sign-off",
    sources: ["email"],
  },
  {
    id: "operator_phone_extracted",
    label: "Your Phone Extracted",
    entityTypes: ["me"],
    description: "Your phone number from signature",
    sources: ["email"],
  },
  {
    id: "operator_address_extracted",
    label: "Your Address Extracted",
    entityTypes: ["me"],
    description: "Your address from documents",
    sources: ["documents"],
  },
  {
    id: "workspace_website_found",
    label: "Workspace Website",
    entityTypes: ["me"],
    description: "Business website discovered",
    sources: ["email", "social"],
  },
  {
    id: "workspace_legal_name_extracted",
    label: "Legal Name Extracted",
    entityTypes: ["me"],
    description: "Legal business name from documents",
    sources: ["documents", "billing"],
  },

  // Note signals
  {
    id: "note_created",
    label: "Note Created",
    entityTypes: ["person", "org", "work", "billing", "file", "meeting"],
    description: "A note was added to an entity",
    sources: ["crm"],
  },
  {
    id: "note_flagged",
    label: "Note Flagged",
    entityTypes: ["person", "org", "work", "billing", "file", "meeting"],
    description: "A note was flagged for attention",
    sources: ["crm"],
  },
  {
    id: "preference_detected",
    label: "Preference Detected",
    entityTypes: ["person", "org"],
    description: "A preference was detected from communication",
    sources: ["email", "calendar"],
  },
  {
    id: "context_extracted",
    label: "Context Extracted",
    entityTypes: ["person", "org", "work"],
    description: "Contextual information extracted from content",
    sources: ["email", "documents"],
  },
  {
    id: "capture_processed",
    label: "Capture Processed",
    entityTypes: ["person", "org", "work", "meeting"],
    description: "A capture event was processed by intelligence",
    sources: ["email", "calendar", "documents"],
  },

  // Connection signals
  {
    id: "connection_inferred",
    label: "Connection Inferred",
    entityTypes: ["person", "org", "work", "billing", "file", "meeting"],
    description: "A relationship was inferred from signals",
    sources: ["email", "calendar", "billing", "documents"],
  },
  {
    id: "connection_strengthened",
    label: "Connection Strengthened",
    entityTypes: ["person", "org", "work", "billing", "file", "meeting"],
    description: "An existing connection confidence was increased",
    sources: ["email", "calendar", "billing"],
  },
  {
    id: "relationship_at_risk",
    label: "Relationship At Risk",
    entityTypes: ["person", "org"],
    description: "A relationship shows signs of going stale",
    sources: ["crm"],
  },
  {
    id: "file_shared",
    label: "File Shared",
    entityTypes: ["file", "person", "org"],
    description: "A file was shared with someone",
    sources: ["documents"],
  },
];

// ============================================================================
// LOOKUP HELPERS
// ============================================================================

export const SIGNAL_REGISTRY: Record<SignalId, SignalDescriptor> = {} as Record<SignalId, SignalDescriptor>;
for (const signal of SIGNALS) {
  SIGNAL_REGISTRY[signal.id] = signal;
}

export function getSignal(id: SignalId): SignalDescriptor {
  return SIGNAL_REGISTRY[id];
}

export function getSignalsForEntity(entityType: SignalDescriptor["entityTypes"][number]): SignalDescriptor[] {
  return SIGNALS.filter((s) => s.entityTypes.includes(entityType));
}

export function getSignalsFromSource(source: SignalDescriptor["sources"][number]): SignalDescriptor[] {
  return SIGNALS.filter((s) => s.sources.includes(source));
}
