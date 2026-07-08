import type { ProfileFillRule, ProfileFieldKey } from "@/app/_features/plays/playbooks/records-engine/types";

const SIGNAL_LABELS: Record<string, string> = {
  // People signals
  has_payment_received: "payment evidence exists in a finance source",
  has_stripe_payment: "payment evidence exists in a finance source",
  has_invoice_sent: "invoice evidence exists in a billing source",
  is_bidirectional_thread: "you have a two-way communication thread",
  you_initiated: "you initiated contact",
  has_calendar_meeting: "you have a meeting record",
  has_signature: "their message has a signature",
  email_count: "communication count",
  email_domain_is_personal: "they use a personal email domain",
  email_domain_matches_workspace: "their email uses your company domain",
  email_domain_in_partner_list: "their domain is on your partner list",
  email_domain_in_vendor_list: "their domain is on your vendor list",
  // Organization signals
  org_domain_known: "the organization has a trusted domain",
  org_created_from_domain: "the organization was created from a company domain",
  org_has_payment_received: "payment evidence exists for the organization",
  org_has_invoice_sent: "invoice evidence exists for the organization",
  org_has_primary_contact: "the organization has a clear primary contact",
  org_has_people: "the organization has linked people",
  org_domain_in_partner_list: "the organization domain is on your partner list",
  org_domain_in_vendor_list: "the organization domain is on your vendor list",
  inferred_industry: "organization context includes an industry",
  // Work signals
  work_created: "the work item was created from an explicit memory action",
  work_has_signed_contract: "the work has signed contract evidence",
  work_has_kickoff: "the work has kickoff evidence",
  work_is_blocked: "the work is blocked",
  work_has_completed_deliverable: "the work has completed deliverable evidence",
  work_has_due_date: "the work has a due date",
  inferred_description: "work context includes a description",
  inferred_deadline: "work context includes a deadline",
  inferred_start_date: "work context includes a start date",
  inferred_work_id: "work item can be identified from context",
  // Billing signals
  billing_amount_paid_covers_total: "full payment has been received",
  billing_payment_matched: "a partial payment has been received",
  billing_due_date_passed: "the due date has passed without full payment",
  billing_party_email_match: "the billing email matches a known contact",
  billing_party_customer_id_match: "the customer ID matches a known organization",
  // Meeting signals
  meeting_cancelled_by_calendar: "the calendar shows the meeting was cancelled",
  meeting_has_attendance_evidence: "attendance evidence exists (transcript, recording, or join)",
  inferred_meeting_type: "the meeting type can be identified from title or agenda",
  meeting_attendee_email_match: "an attendee email matches a known contact",
  // File signals
  file_signature_event_sent: "the document was sent for signature",
  file_signature_event_viewed: "the document was viewed by the signer",
  file_signature_event_signed: "the document was signed",
  file_signature_event_expired: "the signature request expired",
  inferred_category: "the file category can be identified from content",
  file_source_context_match: "the file's source context links to a known contact",
  inferred_organization_id: "an organization can be identified from context",
  inferred_person_id: "a person can be identified from context",
};

const FIELD_LABELS: Partial<Record<ProfileFieldKey, string>> = {
  // People fields
  relationship_type: "Relationship",
  title: "Job title",
  org_link: "Organization link",
  website: "Website",
  // Organization fields
  industry: "Industry",
  relationship_status: "Relationship status",
  key_contact: "Key contact",
  // Work fields
  status: "Status",
  description: "Description",
  deadline: "Deadline",
  start_date: "Start date",
  // Link fields (shared across record types)
  organizationId: "Organization",
  personId: "Person",
  workId: "Work item",
  // Billing fields
  // (status already covered above)
  // Meeting fields
  meeting_type: "Meeting type",
  // File fields
  category: "Category",
  lifecycle_status: "Lifecycle",
};

const VALUE_LABELS: Record<string, string> = {
  "{{inferred_organization_id}}": "the matched organization",
  "{{inferred_person_id}}": "the matched person",
  "{{inferred_work_id}}": "the matched work item",
  "{{inferred_meeting_type}}": "the inferred type",
  "{{inferred_category}}": "the inferred category",
};

export function profileFieldLabel(field: ProfileFieldKey): string {
  return FIELD_LABELS[field] ?? field.replace(/_/g, " ");
}

export function formatProfileRulePlainLanguage(rule: ProfileFillRule): string {
  const when = formatProfileRuleCondition(rule);
  if (rule.field === "relationship_type") {
    return `If ${when} → mark as ${capitalize(rule.set.value)} (${rule.because})`;
  }
  if (rule.field === "title") {
    return `If ${when} → use extracted job title (${rule.because})`;
  }
  return `If ${when} → set ${profileFieldLabel(rule.field)} to ${rule.set.value} (${rule.because})`;
}

export function formatProfileRuleCondition(rule: ProfileFillRule): string {
  return formatCondition(rule);
}

export function formatProfileRuleOutcome(rule: ProfileFillRule): string {
  if (rule.field === "relationship_type") {
    return `Mark as ${capitalize(rule.set.value)}`;
  }
  if (rule.field === "title") {
    return "Use extracted job title";
  }
  const fieldLabel = profileFieldLabel(rule.field);
  const valueLabel = VALUE_LABELS[rule.set.value] ?? rule.set.value;
  return `Set ${fieldLabel} to ${valueLabel}`;
}

function formatCondition(rule: ProfileFillRule): string {
  const signal = SIGNAL_LABELS[rule.when.signal] ?? rule.when.signal;
  if (rule.when.op === "exists") return signal;
  if (rule.when.op === "not_exists") return `${signal} is not true`;
  if (rule.when.op === "gte" && rule.when.value != null) {
    return `${signal} is at least ${rule.when.value}`;
  }
  if (rule.when.op === "eq" && typeof rule.when.value === "boolean") {
    return rule.when.value ? signal : `not: ${signal}`;
  }
  if (rule.when.value != null) {
    return `${signal} equals ${rule.when.value}`;
  }
  return signal;
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
