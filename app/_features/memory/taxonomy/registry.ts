/**
 * Unified Vocabulary Registry
 *
 * Single source of truth for all controlled vocabularies in Salt.
 * Every vocabulary value shares a common shape with slug-stable IDs,
 * human labels, AI descriptions, and scope information.
 *
 * This registry powers:
 * - Dropdown/select UI components
 * - Keeper playbook inference rules
 * - Capability readiness validation
 * - AI context injection (record-summary, narrative)
 */

// ============================================================================
// CORE VOCABULARY SHAPE
// ============================================================================

export type VocabularyScope =
  | "person"
  | "org"
  | "work"
  | "billing"
  | "meeting"
  | "file"
  | "me"
  | "note"
  | "all";
export type VocabularyCategory =
  | "relationship"
  | "classification"
  | "status"
  | "financial"
  | "location"
  | "temporal";

export interface VocabularyValue {
  slug: string;
  label: string;
  aiDescription: string;
  scope: VocabularyScope;
  category: VocabularyCategory;
  isSystem: boolean;
  parent?: string;
  sortOrder?: number;
}

export interface VocabularyDefinition {
  name: string;
  description: string;
  scope: VocabularyScope;
  category: VocabularyCategory;
  values: VocabularyValue[];
}

// ============================================================================
// RELATIONSHIP TYPE (People + Orgs)
// ============================================================================

export const RELATIONSHIP_TYPES = [
  "client",
  "prospect",
  "lead",
  "past_client",
  "team",
  "partner",
  "vendor",
  "personal",
  "unknown",
] as const;

export type RelationshipType = (typeof RELATIONSHIP_TYPES)[number];

export const RELATIONSHIP_TYPE_VALUES: VocabularyValue[] = [
  {
    slug: "client",
    label: "Client",
    aiDescription: "Active paying customer with ongoing or completed work",
    scope: "all",
    category: "relationship",
    isSystem: true,
    sortOrder: 0,
  },
  {
    slug: "prospect",
    label: "Prospect",
    aiDescription: "In an active conversation about potential work (proposal, scoping, negotiation)",
    scope: "all",
    category: "relationship",
    isSystem: true,
    sortOrder: 1,
  },
  {
    slug: "lead",
    label: "Lead",
    aiDescription: "Identified contact with no two-way conversation about work yet",
    scope: "all",
    category: "relationship",
    isSystem: true,
    sortOrder: 2,
  },
  {
    slug: "past_client",
    label: "Past Client",
    aiDescription: "Former paying customer with no open work or active conversation",
    scope: "all",
    category: "relationship",
    isSystem: true,
    sortOrder: 3,
  },
  {
    slug: "team",
    label: "Team",
    aiDescription: "Internal team member or collaborator on the same side",
    scope: "person",
    category: "relationship",
    isSystem: true,
    sortOrder: 4,
  },
  {
    slug: "partner",
    label: "Partner",
    aiDescription: "Strategic partner for referrals, collaborations, or joint ventures",
    scope: "all",
    category: "relationship",
    isSystem: true,
    sortOrder: 5,
  },
  {
    slug: "vendor",
    label: "Vendor",
    aiDescription: "Service provider or supplier we pay for goods or services",
    scope: "all",
    category: "relationship",
    isSystem: true,
    sortOrder: 6,
  },
  {
    slug: "personal",
    label: "Personal",
    aiDescription: "Personal contact not related to business",
    scope: "person",
    category: "relationship",
    isSystem: true,
    sortOrder: 7,
  },
  {
    slug: "unknown",
    label: "Unknown",
    aiDescription: "Relationship type not yet determined",
    scope: "all",
    category: "relationship",
    isSystem: true,
    sortOrder: 8,
  },
];

export const RELATIONSHIP_TYPE_LABELS: Record<RelationshipType, string> = {
  client: "Client",
  prospect: "Prospect",
  lead: "Lead",
  past_client: "Past Client",
  team: "Team",
  partner: "Partner",
  vendor: "Vendor",
  personal: "Personal",
  unknown: "Unknown",
};

// ============================================================================
// WORK STATUS (Primary lifecycle state)
//
// Canon = the projects.status DB CHECK set (keeper-field-contracts decision
// table). "Renewing" / "Wrapping" / "Stalled" chips seen in list views are
// PRESENTATIONS derived from status + stage + dates in
// work/utils/progress.ts (deriveWorkStatusBadge) — they are not statuses.
// ============================================================================

export const WORK_STATUSES = [
  "draft",
  "signed",
  "active",
  "on_hold",
  "completed",
  "archived",
] as const;

export type WorkStatus = (typeof WORK_STATUSES)[number];

export const WORK_STATUS_VALUES: VocabularyValue[] = [
  {
    slug: "draft",
    label: "Draft",
    aiDescription: "Work item being scoped or proposed, no signed agreement yet",
    scope: "work",
    category: "status",
    isSystem: true,
    sortOrder: 0,
  },
  {
    slug: "signed",
    label: "Signed",
    aiDescription: "Agreement signed but work has not started (or retainer up for renewal)",
    scope: "work",
    category: "status",
    isSystem: true,
    sortOrder: 1,
  },
  {
    slug: "active",
    label: "Active",
    aiDescription: "Work in progress with regular activity",
    scope: "work",
    category: "status",
    isSystem: true,
    sortOrder: 2,
  },
  {
    slug: "on_hold",
    label: "On Hold",
    aiDescription: "Work paused or blocked, needs attention before it can resume",
    scope: "work",
    category: "status",
    isSystem: true,
    sortOrder: 3,
  },
  {
    slug: "completed",
    label: "Completed",
    aiDescription: "All deliverables finished, work closed",
    scope: "work",
    category: "status",
    isSystem: true,
    sortOrder: 4,
  },
  {
    slug: "archived",
    label: "Archived",
    aiDescription: "Historical record, no longer active or relevant",
    scope: "work",
    category: "status",
    isSystem: true,
    sortOrder: 5,
  },
];

export const WORK_STATUS_LABELS: Record<WorkStatus, string> = {
  draft: "Draft",
  signed: "Signed",
  active: "Active",
  on_hold: "On Hold",
  completed: "Completed",
  archived: "Archived",
};

// ============================================================================
// WORK TYPE (Engagement model)
// ============================================================================

export const WORK_TYPES = [
  "project",
  "retainer",
  "hourly",
  "proposal",
  "quick",
  "event",
] as const;

export type WorkType = (typeof WORK_TYPES)[number];

export const WORK_TYPE_VALUES: VocabularyValue[] = [
  {
    slug: "project",
    label: "Project",
    aiDescription: "Fixed-scope deliverable with defined start and end",
    scope: "work",
    category: "classification",
    isSystem: true,
    sortOrder: 0,
  },
  {
    slug: "retainer",
    label: "Retainer",
    aiDescription: "Recurring engagement with monthly/quarterly billing",
    scope: "work",
    category: "classification",
    isSystem: true,
    sortOrder: 1,
  },
  {
    slug: "hourly",
    label: "Hourly",
    aiDescription: "Time-based billing without fixed scope",
    scope: "work",
    category: "classification",
    isSystem: true,
    sortOrder: 2,
  },
  {
    slug: "proposal",
    label: "Proposal",
    aiDescription: "Potential work being scoped and pitched",
    scope: "work",
    category: "classification",
    isSystem: true,
    sortOrder: 3,
  },
  {
    slug: "quick",
    label: "Quick Task",
    aiDescription: "Small ad-hoc task, often unbilled or flat-fee",
    scope: "work",
    category: "classification",
    isSystem: true,
    sortOrder: 4,
  },
  {
    slug: "event",
    label: "Event",
    aiDescription: "One-time event like workshop, speaking, or training",
    scope: "work",
    category: "classification",
    isSystem: true,
    sortOrder: 5,
  },
];

export const WORK_TYPE_LABELS: Record<WorkType, string> = {
  project: "Project",
  retainer: "Retainer",
  hourly: "Hourly",
  proposal: "Proposal",
  quick: "Quick Task",
  event: "Event",
};

// ============================================================================
// WORK STAGE (Pipeline progression per work type)
//
// Canon = the per-type stage sets that shipped in work/utils/stages.ts
// (keeper-field-contracts decision table). The data lives HERE; stages.ts
// re-exports it and keeps the progress/derivation logic. One vocabulary
// (`work_stage`) with parent = work type, mirroring industry_child.
// The aspirational project_stage / retainer_stage vocabularies are retired.
// ============================================================================

export const WORK_STAGE_SETS: Record<WorkType, readonly string[]> = {
  project: [
    "inquiry",
    "discovery",
    "proposal",
    "signed",
    "kickoff",
    "active",
    "review",
    "delivered",
    "closed",
  ],
  retainer: ["trial", "active", "renewal_due", "renewed", "churned"],
  hourly: ["active", "paused", "closed"],
  proposal: ["lead", "qualified", "pitched", "negotiating", "won", "lost"],
  quick: ["todo", "in_progress", "done"],
  event: [
    "inquiry",
    "booked",
    "planning",
    "pre_event",
    "event_day",
    "post_event",
    "closed",
  ],
};

export const WORK_STAGE_LABELS: Record<string, string> = {
  // Project
  inquiry: "Inquiry",
  discovery: "Discovery",
  proposal: "Proposal",
  signed: "Signed",
  kickoff: "Kickoff",
  active: "Active",
  review: "Review",
  delivered: "Delivered",
  closed: "Closed",
  // Retainer
  trial: "Trial",
  renewal_due: "Renewal Due",
  renewed: "Renewed",
  churned: "Churned",
  // Hourly
  paused: "Paused",
  // Proposal
  lead: "Lead",
  qualified: "Qualified",
  pitched: "Pitched",
  negotiating: "Negotiating",
  won: "Won",
  lost: "Lost",
  // Quick
  todo: "To Do",
  in_progress: "In Progress",
  done: "Done",
  // Event
  booked: "Booked",
  planning: "Planning",
  pre_event: "Pre-Event",
  event_day: "Event Day",
  post_event: "Post-Event",
};

export const WORK_STAGE_VALUES: VocabularyValue[] = (
  Object.entries(WORK_STAGE_SETS) as Array<[WorkType, readonly string[]]>
).flatMap(([workType, stages], typeIndex) =>
  stages.map((slug, index) => ({
    slug,
    label: WORK_STAGE_LABELS[slug] ?? slug.replace(/_/g, " "),
    aiDescription: `${WORK_TYPE_LABELS[workType]} stage: ${WORK_STAGE_LABELS[slug] ?? slug}`,
    scope: "work" as const,
    category: "status" as const,
    isSystem: true,
    parent: workType,
    sortOrder: typeIndex * 100 + index,
  }))
);

// ============================================================================
// SERVICE CATEGORY
// ============================================================================

export const SERVICE_CATEGORIES = [
  "design",
  "development",
  "strategy",
  "consulting",
  "support",
  "marketing",
  "content",
  "operations",
] as const;

export type ServiceCategory = (typeof SERVICE_CATEGORIES)[number];

export const SERVICE_CATEGORY_VALUES: VocabularyValue[] = [
  {
    slug: "design",
    label: "Design",
    aiDescription: "Visual design, UX/UI, branding, and creative services",
    scope: "work",
    category: "classification",
    isSystem: true,
    sortOrder: 0,
  },
  {
    slug: "development",
    label: "Development",
    aiDescription: "Software development, engineering, and technical implementation",
    scope: "work",
    category: "classification",
    isSystem: true,
    sortOrder: 1,
  },
  {
    slug: "strategy",
    label: "Strategy",
    aiDescription: "Business strategy, planning, and advisory services",
    scope: "work",
    category: "classification",
    isSystem: true,
    sortOrder: 2,
  },
  {
    slug: "consulting",
    label: "Consulting",
    aiDescription: "Expert advice and problem-solving in a specific domain",
    scope: "work",
    category: "classification",
    isSystem: true,
    sortOrder: 3,
  },
  {
    slug: "support",
    label: "Support",
    aiDescription: "Ongoing maintenance, helpdesk, and technical support",
    scope: "work",
    category: "classification",
    isSystem: true,
    sortOrder: 4,
  },
  {
    slug: "marketing",
    label: "Marketing",
    aiDescription: "Marketing campaigns, advertising, and growth services",
    scope: "work",
    category: "classification",
    isSystem: true,
    sortOrder: 5,
  },
  {
    slug: "content",
    label: "Content",
    aiDescription: "Copywriting, content creation, and editorial services",
    scope: "work",
    category: "classification",
    isSystem: true,
    sortOrder: 6,
  },
  {
    slug: "operations",
    label: "Operations",
    aiDescription: "Process optimization, operations, and administrative services",
    scope: "work",
    category: "classification",
    isSystem: true,
    sortOrder: 7,
  },
];

// ============================================================================
// CURRENCY (Financial)
// ============================================================================

export const CURRENCIES = [
  "USD",
  "EUR",
  "GBP",
  "CAD",
  "AUD",
  "CHF",
  "JPY",
  "SGD",
  "NZD",
  "INR",
] as const;

export type Currency = (typeof CURRENCIES)[number];

export const CURRENCY_VALUES: VocabularyValue[] = [
  {
    slug: "USD",
    label: "US Dollar",
    aiDescription: "United States Dollar, primary currency for US clients",
    scope: "all",
    category: "financial",
    isSystem: true,
    sortOrder: 0,
  },
  {
    slug: "EUR",
    label: "Euro",
    aiDescription: "European Union Euro, used across EU member states",
    scope: "all",
    category: "financial",
    isSystem: true,
    sortOrder: 1,
  },
  {
    slug: "GBP",
    label: "British Pound",
    aiDescription: "British Pound Sterling, used in United Kingdom",
    scope: "all",
    category: "financial",
    isSystem: true,
    sortOrder: 2,
  },
  {
    slug: "CAD",
    label: "Canadian Dollar",
    aiDescription: "Canadian Dollar, used in Canada",
    scope: "all",
    category: "financial",
    isSystem: true,
    sortOrder: 3,
  },
  {
    slug: "AUD",
    label: "Australian Dollar",
    aiDescription: "Australian Dollar, used in Australia",
    scope: "all",
    category: "financial",
    isSystem: true,
    sortOrder: 4,
  },
  {
    slug: "CHF",
    label: "Swiss Franc",
    aiDescription: "Swiss Franc, used in Switzerland",
    scope: "all",
    category: "financial",
    isSystem: true,
    sortOrder: 5,
  },
  {
    slug: "JPY",
    label: "Japanese Yen",
    aiDescription: "Japanese Yen, used in Japan",
    scope: "all",
    category: "financial",
    isSystem: true,
    sortOrder: 6,
  },
  {
    slug: "SGD",
    label: "Singapore Dollar",
    aiDescription: "Singapore Dollar, used in Singapore",
    scope: "all",
    category: "financial",
    isSystem: true,
    sortOrder: 7,
  },
  {
    slug: "NZD",
    label: "New Zealand Dollar",
    aiDescription: "New Zealand Dollar, used in New Zealand",
    scope: "all",
    category: "financial",
    isSystem: true,
    sortOrder: 8,
  },
  {
    slug: "INR",
    label: "Indian Rupee",
    aiDescription: "Indian Rupee, used in India",
    scope: "all",
    category: "financial",
    isSystem: true,
    sortOrder: 9,
  },
];

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  CAD: "CA$",
  AUD: "A$",
  CHF: "CHF",
  JPY: "¥",
  SGD: "S$",
  NZD: "NZ$",
  INR: "₹",
};

// ============================================================================
// PAYMENT TERMS
// ============================================================================

export const PAYMENT_TERMS = [
  "due_on_receipt",
  "net_15",
  "net_30",
  "net_45",
  "net_60",
  "custom",
] as const;

export type PaymentTerms = (typeof PAYMENT_TERMS)[number];

export const PAYMENT_TERMS_VALUES: VocabularyValue[] = [
  {
    slug: "due_on_receipt",
    label: "Due on Receipt",
    aiDescription: "Payment due immediately upon invoice receipt",
    scope: "work",
    category: "financial",
    isSystem: true,
    sortOrder: 0,
  },
  {
    slug: "net_15",
    label: "Net 15",
    aiDescription: "Payment due within 15 days of invoice date",
    scope: "work",
    category: "financial",
    isSystem: true,
    sortOrder: 1,
  },
  {
    slug: "net_30",
    label: "Net 30",
    aiDescription: "Payment due within 30 days of invoice date",
    scope: "work",
    category: "financial",
    isSystem: true,
    sortOrder: 2,
  },
  {
    slug: "net_45",
    label: "Net 45",
    aiDescription: "Payment due within 45 days of invoice date",
    scope: "work",
    category: "financial",
    isSystem: true,
    sortOrder: 3,
  },
  {
    slug: "net_60",
    label: "Net 60",
    aiDescription: "Payment due within 60 days of invoice date",
    scope: "work",
    category: "financial",
    isSystem: true,
    sortOrder: 4,
  },
  {
    slug: "custom",
    label: "Custom",
    aiDescription: "Custom payment terms specified separately",
    scope: "work",
    category: "financial",
    isSystem: true,
    sortOrder: 5,
  },
];

export const PAYMENT_TERMS_LABELS: Record<PaymentTerms, string> = {
  due_on_receipt: "Due on Receipt",
  net_15: "Net 15",
  net_30: "Net 30",
  net_45: "Net 45",
  net_60: "Net 60",
  custom: "Custom",
};

// ============================================================================
// BILLING CYCLE
// ============================================================================

export const BILLING_CYCLES = [
  "monthly",
  "quarterly",
  "annually",
  "one_time",
] as const;

export type BillingCycle = (typeof BILLING_CYCLES)[number];

export const BILLING_CYCLE_VALUES: VocabularyValue[] = [
  {
    slug: "monthly",
    label: "Monthly",
    aiDescription: "Billed every month on recurring basis",
    scope: "work",
    category: "temporal",
    isSystem: true,
    sortOrder: 0,
  },
  {
    slug: "quarterly",
    label: "Quarterly",
    aiDescription: "Billed every three months",
    scope: "work",
    category: "temporal",
    isSystem: true,
    sortOrder: 1,
  },
  {
    slug: "annually",
    label: "Annually",
    aiDescription: "Billed once per year",
    scope: "work",
    category: "temporal",
    isSystem: true,
    sortOrder: 2,
  },
  {
    slug: "one_time",
    label: "One-time",
    aiDescription: "Single payment, no recurring billing",
    scope: "work",
    category: "temporal",
    isSystem: true,
    sortOrder: 3,
  },
];

export const BILLING_CYCLE_LABELS: Record<BillingCycle, string> = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  annually: "Annually",
  one_time: "One-time",
};

// ============================================================================
// COUNTRY (ISO 3166-1 alpha-2, common subset)
// ============================================================================

export const COUNTRIES = [
  "US",
  "CA",
  "GB",
  "AU",
  "DE",
  "FR",
  "NL",
  "BE",
  "CH",
  "AT",
  "IE",
  "NZ",
  "SG",
  "JP",
  "IN",
  "BR",
  "MX",
  "ES",
  "IT",
  "SE",
  "NO",
  "DK",
  "FI",
  "PT",
  "PL",
] as const;

export type Country = (typeof COUNTRIES)[number];

export const COUNTRY_LABELS: Record<Country, string> = {
  US: "United States",
  CA: "Canada",
  GB: "United Kingdom",
  AU: "Australia",
  DE: "Germany",
  FR: "France",
  NL: "Netherlands",
  BE: "Belgium",
  CH: "Switzerland",
  AT: "Austria",
  IE: "Ireland",
  NZ: "New Zealand",
  SG: "Singapore",
  JP: "Japan",
  IN: "India",
  BR: "Brazil",
  MX: "Mexico",
  ES: "Spain",
  IT: "Italy",
  SE: "Sweden",
  NO: "Norway",
  DK: "Denmark",
  FI: "Finland",
  PT: "Portugal",
  PL: "Poland",
};

export const COUNTRY_VALUES: VocabularyValue[] = COUNTRIES.map((code, i) => ({
  slug: code,
  label: COUNTRY_LABELS[code],
  aiDescription: `${COUNTRY_LABELS[code]} (${code})`,
  scope: "all" as const,
  category: "location" as const,
  isSystem: true,
  sortOrder: i,
}));

// ============================================================================
// TIMEZONE (IANA, common subset)
// ============================================================================

export const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Toronto",
  "America/Vancouver",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Amsterdam",
  "Europe/Zurich",
  "Australia/Sydney",
  "Australia/Melbourne",
  "Asia/Tokyo",
  "Asia/Singapore",
  "Asia/Kolkata",
  "Pacific/Auckland",
  "UTC",
] as const;

export type Timezone = (typeof TIMEZONES)[number];

export const TIMEZONE_LABELS: Record<Timezone, string> = {
  "America/New_York": "Eastern Time (US)",
  "America/Chicago": "Central Time (US)",
  "America/Denver": "Mountain Time (US)",
  "America/Los_Angeles": "Pacific Time (US)",
  "America/Toronto": "Eastern Time (Canada)",
  "America/Vancouver": "Pacific Time (Canada)",
  "Europe/London": "London (UK)",
  "Europe/Paris": "Paris (France)",
  "Europe/Berlin": "Berlin (Germany)",
  "Europe/Amsterdam": "Amsterdam (Netherlands)",
  "Europe/Zurich": "Zurich (Switzerland)",
  "Australia/Sydney": "Sydney (Australia)",
  "Australia/Melbourne": "Melbourne (Australia)",
  "Asia/Tokyo": "Tokyo (Japan)",
  "Asia/Singapore": "Singapore",
  "Asia/Kolkata": "India Standard Time",
  "Pacific/Auckland": "Auckland (New Zealand)",
  UTC: "UTC",
};

export const TIMEZONE_VALUES: VocabularyValue[] = TIMEZONES.map((tz, i) => ({
  slug: tz,
  label: TIMEZONE_LABELS[tz],
  aiDescription: `IANA timezone ${tz}`,
  scope: "all" as const,
  category: "temporal" as const,
  isSystem: true,
  sortOrder: i,
}));

// ============================================================================
// RE-EXPORT INDUSTRY TAXONOMY (from types/taxonomies.ts)
// ============================================================================

export {
  INDUSTRY_PARENTS,
  INDUSTRY_CHILDREN,
  INDUSTRY_PARENT_LABELS,
  INDUSTRY_CHILD_LABELS,
  formatIndustry,
  isValidIndustryParent,
  isValidIndustryChild,
  type IndustryParent,
  type IndustryChild,
} from "../types/taxonomies";

// ============================================================================
// MEMORY-RECORD VOCABULARIES (billing, meetings, files, notes, record status)
// Canonical sets per the keeper-field-contracts decision table.
// ============================================================================

function defineValues(
  scope: VocabularyScope,
  category: VocabularyCategory,
  entries: Array<[slug: string, label: string, aiDescription: string]>
): VocabularyValue[] {
  return entries.map(([slug, label, aiDescription], index) => ({
    slug,
    label,
    aiDescription,
    scope,
    category,
    isSystem: true,
    sortOrder: index,
  }));
}

export const BILLING_STATUS_VALUES = defineValues("billing", "status", [
  ["draft", "Draft", "Not yet issued; amounts and parties may still change"],
  ["due", "Due", "Issued and awaiting payment within terms"],
  ["overdue", "Overdue", "Past its due date without full payment"],
  ["paid", "Paid", "Fully paid"],
  ["partial", "Partial", "Partially paid; a balance remains outstanding"],
  ["refunded", "Refunded", "Payment returned to the payer"],
  ["disputed", "Disputed", "Payment contested by either party"],
]);

export const BILLING_DIRECTION_VALUES = defineValues("billing", "classification", [
  ["receivable", "Receivable", "Money owed to you (you invoiced someone)"],
  ["payable", "Payable", "Money you owe (a bill or vendor invoice)"],
]);

export const BILLING_CATEGORY_VALUES = defineValues("billing", "classification", [
  ["contractor", "Contractor", "Payments to subcontractors or freelancers"],
  ["software", "Software", "Software subscriptions and tools"],
  ["other", "Other", "Any other payable category"],
]);

export const MEETING_TYPES_VALUES = defineValues("meeting", "classification", [
  ["discovery", "Discovery", "First substantive conversation to qualify fit and scope"],
  ["kickoff", "Kickoff", "Start-of-engagement alignment on scope, timeline, and roles"],
  ["check-in", "Check-in", "Recurring status sync during active work"],
  ["review", "Review", "Walkthrough of delivered or in-progress work for feedback"],
  ["presentation", "Presentation", "Formal presentation of work or proposal"],
  ["workshop", "Workshop", "Collaborative working session"],
  ["interview", "Interview", "Research or hiring interview"],
  ["other", "Other", "Meeting that fits no other type"],
]);

export const MEETING_STATUS_VALUES = defineValues("meeting", "status", [
  ["scheduled", "Scheduled", "On the calendar, not yet held"],
  ["completed", "Completed", "Held as planned"],
  ["cancelled", "Cancelled", "Called off before it happened"],
  ["no-show", "No-show", "Scheduled but a participant did not attend"],
]);

export const MEETING_LOCATION_TYPE_VALUES = defineValues("meeting", "classification", [
  ["google-meet", "Google Meet", "Video call on Google Meet"],
  ["zoom", "Zoom", "Video call on Zoom"],
  ["phone", "Phone call", "Voice call by phone"],
  ["in-person", "In person", "Physical meeting at an address"],
  ["custom", "Custom", "Any other meeting medium or link"],
]);

export const FILE_CATEGORY_VALUES = defineValues("file", "classification", [
  ["brand_asset", "Brand Asset", "Logos, fonts, brand guidelines, and identity files"],
  ["deliverable", "Deliverable", "Work product delivered to a client"],
  ["contract", "Contract", "Signed or signable agreement"],
  ["invoice", "Invoice", "Invoice or billing document"],
  ["proposal", "Proposal", "Proposal or pitch document"],
  ["reference", "Reference", "Reference material or inspiration"],
  ["media", "Media", "Photos, video, or audio assets"],
  ["notes", "Notes", "Meeting notes or written records"],
  ["process", "Process", "Internal process docs, templates, SOPs"],
  ["screenshot", "Screenshot", "Screen captures"],
  ["other", "Other", "Anything that fits no other category"],
]);

export const FILE_DOCUMENT_TYPE_VALUES = defineValues("file", "classification", [
  ["proposal", "Proposal", "Proposal or pitch"],
  ["contract", "Contract", "Agreement requiring signatures"],
  ["invoice", "Invoice", "Billing document"],
  ["sow", "SOW", "Statement of work"],
  ["nda", "NDA", "Non-disclosure agreement"],
  ["deliverable", "Deliverable", "Delivered work product"],
  ["brief", "Brief", "Creative or project brief"],
  ["receipt", "Receipt", "Proof of payment"],
  ["estimate", "Estimate", "Cost estimate or quote"],
  ["other", "Other", "Any other document type"],
]);

export const FILE_LIFECYCLE_STATUS_VALUES = defineValues("file", "status", [
  ["draft", "Draft", "Being prepared, not yet sent"],
  ["sent", "Sent", "Delivered to the counterparty"],
  ["viewed", "Viewed", "Opened by the counterparty"],
  ["awaiting_signature", "Awaiting Signature", "Sent for signature, not yet signed"],
  ["signed", "Signed", "Fully executed"],
  ["expired", "Expired", "Validity window has passed"],
  ["archived", "Archived", "No longer active; kept for records"],
]);

export const ASSET_KIND_VALUES = defineValues("file", "classification", [
  ["document", "Document", "Text or office document"],
  ["link", "Link", "External URL rather than a stored file"],
  ["photo", "Photo", "Image file"],
  ["video", "Video", "Video file"],
  ["audio", "Audio", "Audio file"],
  ["transcript", "Transcript", "Meeting or call transcript"],
  ["other", "Other", "Any other asset kind"],
]);

/**
 * Note tags: what a note is ABOUT, not who a record IS (decision #3 in the
 * plan). Deliberately lightweight; source of truth for the tag pickers in
 * EntityNotesTab and MeNotesTab.
 */
export const NOTE_TAG_VALUES = defineValues("note", "classification", [
  ["meeting", "Meeting", "Captured during or about a meeting"],
  ["call", "Call", "Captured during or about a call"],
  ["email", "Email", "Captured from or about an email"],
  ["intro", "Intro", "How you met or were introduced"],
  ["follow-up", "Follow-up", "Something to follow up on"],
  ["waiting", "Waiting", "Waiting on the other party"],
  ["blocked", "Blocked", "Progress blocked by something"],
  ["budget", "Budget", "Budget or pricing context"],
  ["timeline", "Timeline", "Schedule or deadline context"],
  ["scope", "Scope", "Scope definition or change"],
  ["preference", "Preference", "A personal preference worth remembering"],
  ["birthday", "Birthday", "Birthday or anniversary"],
  ["family", "Family", "Family or personal-life context"],
]);

export const RECORD_STATUS_VALUES = defineValues("all", "status", [
  [
    "active",
    "Active",
    "Live relationship: communication in the last 90 days, open work, recent billing activity, or something scheduled ahead",
  ],
  [
    "inactive",
    "Inactive",
    "Dormant: none of the activity signals in the last 90 days and nothing scheduled",
  ],
]);

export const BUSINESS_TYPE_VALUES = defineValues("me", "classification", [
  ["sole_proprietor", "Sole Proprietor", "Unincorporated single-owner business"],
  ["llc", "LLC", "Limited liability company"],
  ["corporation", "Corporation", "Incorporated entity (C-corp or S-corp)"],
  ["partnership", "Partnership", "Multi-owner partnership"],
  ["nonprofit", "Nonprofit", "Nonprofit organization"],
]);

// ============================================================================
// INDUSTRY TAXONOMY AS VOCABULARY VALUES
// ============================================================================

import {
  INDUSTRY_PARENTS as INDUSTRY_PARENTS_SOURCE,
  INDUSTRY_CHILDREN as INDUSTRY_CHILDREN_SOURCE,
  INDUSTRY_PARENT_LABELS as INDUSTRY_PARENT_LABELS_SOURCE,
  INDUSTRY_CHILD_LABELS as INDUSTRY_CHILD_LABELS_SOURCE,
} from "../types/taxonomies";

export const INDUSTRY_PARENT_VOCAB_VALUES: VocabularyValue[] =
  INDUSTRY_PARENTS_SOURCE.map((slug, index) => ({
    slug,
    label: INDUSTRY_PARENT_LABELS_SOURCE[slug] ?? slug,
    aiDescription: `Top-level industry: ${INDUSTRY_PARENT_LABELS_SOURCE[slug] ?? slug}`,
    scope: "org" as const,
    category: "classification" as const,
    isSystem: true,
    sortOrder: index,
  }));

export const INDUSTRY_CHILD_VOCAB_VALUES: VocabularyValue[] = Object.entries(
  INDUSTRY_CHILDREN_SOURCE
).flatMap(([parent, children], parentIndex) =>
  children.map((slug, index) => ({
    slug,
    label: INDUSTRY_CHILD_LABELS_SOURCE[slug] ?? slug,
    aiDescription: `Industry sub-category of ${parent}: ${INDUSTRY_CHILD_LABELS_SOURCE[slug] ?? slug}`,
    scope: "org" as const,
    category: "classification" as const,
    isSystem: true,
    parent,
    sortOrder: parentIndex * 100 + index,
  }))
);

// ============================================================================
// VOCABULARY REGISTRY (All vocabularies in one place)
// ============================================================================

export const VOCABULARY_REGISTRY: Record<string, VocabularyDefinition> = {
  relationship_type: {
    name: "Relationship Type",
    description: "How this person or org relates to your business",
    scope: "all",
    category: "relationship",
    values: RELATIONSHIP_TYPE_VALUES,
  },
  work_status: {
    name: "Work Status",
    description: "Current lifecycle state of the work item",
    scope: "work",
    category: "status",
    values: WORK_STATUS_VALUES,
  },
  work_type: {
    name: "Work Type",
    description: "The engagement model for this work",
    scope: "work",
    category: "classification",
    values: WORK_TYPE_VALUES,
  },
  work_stage: {
    name: "Work Stage",
    description: "Pipeline stage within the work type (parent = work type)",
    scope: "work",
    category: "status",
    values: WORK_STAGE_VALUES,
  },
  service_category: {
    name: "Service Category",
    description: "Category of service offered",
    scope: "work",
    category: "classification",
    values: SERVICE_CATEGORY_VALUES,
  },
  currency: {
    name: "Currency",
    description: "Currency for financial values",
    scope: "all",
    category: "financial",
    values: CURRENCY_VALUES,
  },
  payment_terms: {
    name: "Payment Terms",
    description: "When payment is expected after invoicing",
    scope: "work",
    category: "financial",
    values: PAYMENT_TERMS_VALUES,
  },
  billing_cycle: {
    name: "Billing Cycle",
    description: "How often billing occurs",
    scope: "work",
    category: "temporal",
    values: BILLING_CYCLE_VALUES,
  },
  country: {
    name: "Country",
    description: "Country for addresses and localization",
    scope: "all",
    category: "location",
    values: COUNTRY_VALUES,
  },
  timezone: {
    name: "Timezone",
    description: "IANA timezone for scheduling",
    scope: "all",
    category: "temporal",
    values: TIMEZONE_VALUES,
  },
  billing_status: {
    name: "Billing Status",
    description: "Payment state of a billing record",
    scope: "billing",
    category: "status",
    values: BILLING_STATUS_VALUES,
  },
  billing_direction: {
    name: "Billing Direction",
    description: "Whether money flows to you (receivable) or from you (payable)",
    scope: "billing",
    category: "classification",
    values: BILLING_DIRECTION_VALUES,
  },
  billing_category: {
    name: "Billing Category",
    description: "Spend category for payables",
    scope: "billing",
    category: "classification",
    values: BILLING_CATEGORY_VALUES,
  },
  meeting_type: {
    name: "Meeting Type",
    description: "Purpose of the meeting",
    scope: "meeting",
    category: "classification",
    values: MEETING_TYPES_VALUES,
  },
  meeting_status: {
    name: "Meeting Status",
    description: "Whether the meeting is upcoming, held, or cancelled",
    scope: "meeting",
    category: "status",
    values: MEETING_STATUS_VALUES,
  },
  meeting_location_type: {
    name: "Meeting Location Type",
    description: "Medium the meeting happens over",
    scope: "meeting",
    category: "classification",
    values: MEETING_LOCATION_TYPE_VALUES,
  },
  file_category: {
    name: "File Category",
    description: "What kind of business artifact a file is",
    scope: "file",
    category: "classification",
    values: FILE_CATEGORY_VALUES,
  },
  file_document_type: {
    name: "Document Type",
    description: "Specific document type for document-kind files",
    scope: "file",
    category: "classification",
    values: FILE_DOCUMENT_TYPE_VALUES,
  },
  file_lifecycle_status: {
    name: "File Lifecycle Status",
    description: "Signature/delivery lifecycle for signable documents",
    scope: "file",
    category: "status",
    values: FILE_LIFECYCLE_STATUS_VALUES,
  },
  asset_kind: {
    name: "Asset Kind",
    description: "Storage/media kind of a file",
    scope: "file",
    category: "classification",
    values: ASSET_KIND_VALUES,
  },
  note_tags: {
    name: "Note Tags",
    description: "What a note is about (not who a record is)",
    scope: "note",
    category: "classification",
    values: NOTE_TAG_VALUES,
  },
  record_status: {
    name: "Record Status",
    description: "Whether a relationship is currently live (see canon for the 90-day signal definition)",
    scope: "all",
    category: "status",
    values: RECORD_STATUS_VALUES,
  },
  business_type: {
    name: "Business Type",
    description: "Legal structure of the operator's business",
    scope: "me",
    category: "classification",
    values: BUSINESS_TYPE_VALUES,
  },
  industry_parent: {
    name: "Industry",
    description: "Top-level industry category (see memory/types/taxonomies.ts)",
    scope: "org",
    category: "classification",
    values: INDUSTRY_PARENT_VOCAB_VALUES,
  },
  industry_child: {
    name: "Industry Sub-category",
    description: "Industry subcategory; must be a valid child of industry_parent",
    scope: "org",
    category: "classification",
    values: INDUSTRY_CHILD_VOCAB_VALUES,
  },
};

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

export function isValidVocabularyValue(
  vocabularyKey: string,
  slug: string
): boolean {
  const vocabulary = VOCABULARY_REGISTRY[vocabularyKey];
  if (!vocabulary) return false;
  return vocabulary.values.some((v) => v.slug === slug);
}

export function getVocabularyValue(
  vocabularyKey: string,
  slug: string
): VocabularyValue | undefined {
  const vocabulary = VOCABULARY_REGISTRY[vocabularyKey];
  if (!vocabulary) return undefined;
  return vocabulary.values.find((v) => v.slug === slug);
}

export function getVocabularyLabel(
  vocabularyKey: string,
  slug: string
): string {
  const value = getVocabularyValue(vocabularyKey, slug);
  return value?.label ?? slug;
}

/**
 * Options for a select, optionally filtered to an entity scope.
 * A value is visible in a scope when its own scope is "all" or matches —
 * e.g. relationship_type in "org" scope hides team/personal (person-scoped).
 */
export function getVocabularyOptions(
  vocabularyKey: string,
  scope?: VocabularyScope
): Array<{ value: string; label: string }> {
  const vocabulary = VOCABULARY_REGISTRY[vocabularyKey];
  if (!vocabulary) return [];
  return vocabulary.values
    .filter((v) => !scope || v.scope === "all" || v.scope === scope)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map((v) => ({ value: v.slug, label: v.label }));
}

/**
 * Human label for a relationship slug; title-cases unknown values instead of
 * failing. Replaces the per-feature relationship-display mapping files.
 */
export function getRelationshipLabel(slug: string | null | undefined): string {
  if (!slug) return "Unknown";
  const value = getVocabularyValue("relationship_type", slug);
  if (value) return value.label;
  return slug
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
