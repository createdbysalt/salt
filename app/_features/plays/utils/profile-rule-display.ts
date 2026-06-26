import type { ProfileFillRule, ProfileFieldKey } from "@/app/_features/plays/playbooks/profile/types";

const SIGNAL_LABELS: Record<string, string> = {
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
  org_domain_known: "the organization has a trusted domain",
  org_created_from_domain: "the organization was created from a company domain",
  org_has_payment_received: "payment evidence exists for the organization",
  org_has_invoice_sent: "invoice evidence exists for the organization",
  org_has_primary_contact: "the organization has a clear primary contact",
  org_has_people: "the organization has linked people",
  org_domain_in_partner_list: "the organization domain is on your partner list",
  org_domain_in_vendor_list: "the organization domain is on your vendor list",
  inferred_industry: "organization context includes an industry",
  work_created: "the work item was created from an explicit memory action",
  work_has_signed_contract: "the work has signed contract evidence",
  work_has_kickoff: "the work has kickoff evidence",
  work_is_blocked: "the work is blocked",
  work_has_completed_deliverable: "the work has completed deliverable evidence",
  work_has_due_date: "the work has a due date",
  inferred_project_type: "work context includes a project type",
  inferred_description: "work context includes a description",
  inferred_deadline: "work context includes a deadline",
  inferred_start_date: "work context includes a start date",
};

const FIELD_LABELS: Record<ProfileFieldKey, string> = {
  relationship_type: "Relationship",
  title: "Job title",
  org_link: "Organization link",
  website: "Website",
  industry: "Industry",
  relationship_status: "Relationship status",
  key_contact: "Key contact",
  status: "Status",
  project_type: "Project type",
  description: "Description",
  deadline: "Deadline",
  start_date: "Start date",
};

export function profileFieldLabel(field: ProfileFieldKey): string {
  return FIELD_LABELS[field];
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
  return `Set ${profileFieldLabel(rule.field)} to ${rule.set.value}`;
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
