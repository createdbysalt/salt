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

export type VocabularyScope = "person" | "org" | "work" | "all";
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
    aiDescription: "Potential client in active discussions or proposal stage",
    scope: "all",
    category: "relationship",
    isSystem: true,
    sortOrder: 1,
  },
  {
    slug: "lead",
    label: "Lead",
    aiDescription: "Early-stage contact who has shown interest but no active discussion",
    scope: "all",
    category: "relationship",
    isSystem: true,
    sortOrder: 2,
  },
  {
    slug: "team",
    label: "Team",
    aiDescription: "Internal team member or collaborator on the same side",
    scope: "all",
    category: "relationship",
    isSystem: true,
    sortOrder: 3,
  },
  {
    slug: "partner",
    label: "Partner",
    aiDescription: "Strategic partner for referrals, collaborations, or joint ventures",
    scope: "all",
    category: "relationship",
    isSystem: true,
    sortOrder: 4,
  },
  {
    slug: "vendor",
    label: "Vendor",
    aiDescription: "Service provider or supplier we pay for goods or services",
    scope: "all",
    category: "relationship",
    isSystem: true,
    sortOrder: 5,
  },
  {
    slug: "personal",
    label: "Personal",
    aiDescription: "Personal contact not related to business",
    scope: "all",
    category: "relationship",
    isSystem: true,
    sortOrder: 6,
  },
  {
    slug: "unknown",
    label: "Unknown",
    aiDescription: "Relationship type not yet determined",
    scope: "all",
    category: "relationship",
    isSystem: true,
    sortOrder: 7,
  },
];

export const RELATIONSHIP_TYPE_LABELS: Record<RelationshipType, string> = {
  client: "Client",
  prospect: "Prospect",
  lead: "Lead",
  team: "Team",
  partner: "Partner",
  vendor: "Vendor",
  personal: "Personal",
  unknown: "Unknown",
};

// ============================================================================
// WORK STATUS (Primary lifecycle state)
// ============================================================================

export const WORK_STATUSES = [
  "draft",
  "proposed",
  "active",
  "stalled",
  "wrapping",
  "renewing",
  "completed",
  "cancelled",
  "archived",
] as const;

export type WorkStatus = (typeof WORK_STATUSES)[number];

export const WORK_STATUS_VALUES: VocabularyValue[] = [
  {
    slug: "draft",
    label: "Draft",
    aiDescription: "Work item being prepared, not yet shared with client",
    scope: "work",
    category: "status",
    isSystem: true,
    sortOrder: 0,
  },
  {
    slug: "proposed",
    label: "Proposed",
    aiDescription: "Proposal sent to client, awaiting decision",
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
    slug: "stalled",
    label: "Stalled",
    aiDescription: "Work paused or blocked, needs attention",
    scope: "work",
    category: "status",
    isSystem: true,
    sortOrder: 3,
  },
  {
    slug: "wrapping",
    label: "Wrapping",
    aiDescription: "Final deliverables being completed, nearing close",
    scope: "work",
    category: "status",
    isSystem: true,
    sortOrder: 4,
  },
  {
    slug: "renewing",
    label: "Renewing",
    aiDescription: "Retainer or subscription up for renewal discussion",
    scope: "work",
    category: "status",
    isSystem: true,
    sortOrder: 5,
  },
  {
    slug: "completed",
    label: "Completed",
    aiDescription: "All deliverables finished, work closed successfully",
    scope: "work",
    category: "status",
    isSystem: true,
    sortOrder: 6,
  },
  {
    slug: "cancelled",
    label: "Cancelled",
    aiDescription: "Work cancelled before completion",
    scope: "work",
    category: "status",
    isSystem: true,
    sortOrder: 7,
  },
  {
    slug: "archived",
    label: "Archived",
    aiDescription: "Historical record, no longer active or relevant",
    scope: "work",
    category: "status",
    isSystem: true,
    sortOrder: 8,
  },
];

export const WORK_STATUS_LABELS: Record<WorkStatus, string> = {
  draft: "Draft",
  proposed: "Proposed",
  active: "Active",
  stalled: "Stalled",
  wrapping: "Wrapping",
  renewing: "Renewing",
  completed: "Completed",
  cancelled: "Cancelled",
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
// ============================================================================

export const PROJECT_STAGES = [
  "scoping",
  "proposal_sent",
  "negotiating",
  "signed",
  "kickoff",
  "in_progress",
  "review",
  "final_delivery",
  "closed",
] as const;

export const RETAINER_STAGES = [
  "prospecting",
  "proposal_sent",
  "negotiating",
  "onboarding",
  "active",
  "renewal_discussion",
  "churned",
] as const;

export type ProjectStage = (typeof PROJECT_STAGES)[number];
export type RetainerStage = (typeof RETAINER_STAGES)[number];
export type WorkStage = ProjectStage | RetainerStage;

export const PROJECT_STAGE_VALUES: VocabularyValue[] = [
  {
    slug: "scoping",
    label: "Scoping",
    aiDescription: "Discovery and requirements gathering phase",
    scope: "work",
    category: "status",
    isSystem: true,
    parent: "project",
    sortOrder: 0,
  },
  {
    slug: "proposal_sent",
    label: "Proposal Sent",
    aiDescription: "Formal proposal delivered, awaiting client response",
    scope: "work",
    category: "status",
    isSystem: true,
    parent: "project",
    sortOrder: 1,
  },
  {
    slug: "negotiating",
    label: "Negotiating",
    aiDescription: "Active discussion on terms, scope, or pricing",
    scope: "work",
    category: "status",
    isSystem: true,
    parent: "project",
    sortOrder: 2,
  },
  {
    slug: "signed",
    label: "Signed",
    aiDescription: "Contract signed, ready to begin work",
    scope: "work",
    category: "status",
    isSystem: true,
    parent: "project",
    sortOrder: 3,
  },
  {
    slug: "kickoff",
    label: "Kickoff",
    aiDescription: "Project starting, initial setup and alignment",
    scope: "work",
    category: "status",
    isSystem: true,
    parent: "project",
    sortOrder: 4,
  },
  {
    slug: "in_progress",
    label: "In Progress",
    aiDescription: "Active work being done on deliverables",
    scope: "work",
    category: "status",
    isSystem: true,
    parent: "project",
    sortOrder: 5,
  },
  {
    slug: "review",
    label: "Review",
    aiDescription: "Deliverables under client review or feedback",
    scope: "work",
    category: "status",
    isSystem: true,
    parent: "project",
    sortOrder: 6,
  },
  {
    slug: "final_delivery",
    label: "Final Delivery",
    aiDescription: "Final handoff and wrap-up activities",
    scope: "work",
    category: "status",
    isSystem: true,
    parent: "project",
    sortOrder: 7,
  },
  {
    slug: "closed",
    label: "Closed",
    aiDescription: "Project complete, all deliverables accepted",
    scope: "work",
    category: "status",
    isSystem: true,
    parent: "project",
    sortOrder: 8,
  },
];

export const RETAINER_STAGE_VALUES: VocabularyValue[] = [
  {
    slug: "prospecting",
    label: "Prospecting",
    aiDescription: "Exploring retainer opportunity with potential client",
    scope: "work",
    category: "status",
    isSystem: true,
    parent: "retainer",
    sortOrder: 0,
  },
  {
    slug: "proposal_sent",
    label: "Proposal Sent",
    aiDescription: "Retainer proposal delivered, awaiting decision",
    scope: "work",
    category: "status",
    isSystem: true,
    parent: "retainer",
    sortOrder: 1,
  },
  {
    slug: "negotiating",
    label: "Negotiating",
    aiDescription: "Discussing terms, scope, or pricing for retainer",
    scope: "work",
    category: "status",
    isSystem: true,
    parent: "retainer",
    sortOrder: 2,
  },
  {
    slug: "onboarding",
    label: "Onboarding",
    aiDescription: "Setting up retainer, initial processes and access",
    scope: "work",
    category: "status",
    isSystem: true,
    parent: "retainer",
    sortOrder: 3,
  },
  {
    slug: "active",
    label: "Active",
    aiDescription: "Retainer running with regular engagement",
    scope: "work",
    category: "status",
    isSystem: true,
    parent: "retainer",
    sortOrder: 4,
  },
  {
    slug: "renewal_discussion",
    label: "Renewal Discussion",
    aiDescription: "Approaching renewal, discussing continuation or changes",
    scope: "work",
    category: "status",
    isSystem: true,
    parent: "retainer",
    sortOrder: 5,
  },
  {
    slug: "churned",
    label: "Churned",
    aiDescription: "Retainer ended, client did not renew",
    scope: "work",
    category: "status",
    isSystem: true,
    parent: "retainer",
    sortOrder: 6,
  },
];

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
  project_stage: {
    name: "Project Stage",
    description: "Pipeline stage for project-type work",
    scope: "work",
    category: "status",
    values: PROJECT_STAGE_VALUES,
  },
  retainer_stage: {
    name: "Retainer Stage",
    description: "Pipeline stage for retainer-type work",
    scope: "work",
    category: "status",
    values: RETAINER_STAGE_VALUES,
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

export function getVocabularyOptions(
  vocabularyKey: string
): Array<{ value: string; label: string }> {
  const vocabulary = VOCABULARY_REGISTRY[vocabularyKey];
  if (!vocabulary) return [];
  return vocabulary.values
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map((v) => ({ value: v.slug, label: v.label }));
}
