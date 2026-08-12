/**
 * Field Registry
 *
 * Maps every profile field (including post-taxonomy readiness fields) to:
 * - entityType: which entity this field applies to
 * - fieldType: the data type (text, email, select, money, date, etc.)
 * - vocabulary: if controlled, which vocabulary validates it
 * - careSignal: the signal key Memory Care uses to infer this field
 * - requiredForCapabilities: which capabilities need this field filled
 *
 * This registry is consumed by:
 * - Memory Care capabilities (to know which fields to fill for each capability)
 * - Capability readiness (to validate vocabulary values)
 * - Field editors (to render appropriate input controls)
 */

import type { CapabilityId, CapabilityEntityType } from "../capabilities/types";
import type { Database } from "@/app/_lib/supabase/database.types";
import type { SignalId } from "./signal-registry";

type TableName = keyof Database["public"]["Tables"];
type ColumnOf<T extends TableName> = T extends TableName
  ? Extract<keyof Database["public"]["Tables"][T]["Row"], string>
  : never;

// ============================================================================
// FIELD TYPES
// ============================================================================

export type FieldType =
  | "text"
  | "email"
  | "phone"
  | "url"
  | "select"
  | "multi_select"
  | "money"
  | "percent"
  | "number"
  | "date"
  | "datetime"
  | "timezone"
  | "country"
  | "address"
  | "boolean"
  | "json"
  | "reference";

// ============================================================================
// FIELD DESCRIPTOR
// ============================================================================

/**
 * Entity types that carry field contracts. Superset of CapabilityEntityType:
 * capabilities only reason about person/org/work/billing, but every memory
 * record type has a field contract.
 */
export type ContractEntityType = CapabilityEntityType | "resource" | "meeting" | "me";

/**
 * Who may write a field, per the field-contract canon
 * (brand-identity/product-internal/features/memory-care-field-contracts.md):
 * - care_auto:       Memory Care applies directly when a rule clears its
 *                    confidence bar; provenance recorded, undo available.
 * - care_ask:        Memory Care proposes; the change stays visible in
 *                    Watching until it clears the bar. Default for anything
 *                    not explicitly decided.
 * - user_only:       Salt never writes it, even with high confidence.
 * - system_derived:  Computed from inputs (health scores, readiness, badges).
 *                    Memory Care writes the inputs, never the value.
 */
export type WritePolicy =
  | "care_auto"
  | "care_ask"
  | "user_only"
  | "system_derived";

/**
 * A fill rule defines how to infer a field value from a signal.
 * This is the structured replacement for prose in aiDescription.
 */
export interface FillRule {
  /** Signal that triggers this rule */
  signal: SignalId;
  /** Condition operator (default: eq true; exists for {{extracted}} rules) */
  op?: "eq" | "gte" | "exists";
  /** Value to compare against (for eq/gte) */
  opValue?: boolean | number | string;
  /** Value to set (or "{{extracted}}" for dynamic values) */
  value: string | number | boolean | "{{extracted}}";
  /** Confidence score 0-100 */
  confidence: number;
  /** Human-readable explanation for provenance */
  because: string;
}

/**
 * `dbColumn` is typed against the generated Supabase Row for the entity's
 * backing table, so a renamed or deleted column fails `tsc` at the
 * declaration site — the registry cannot silently drift from schema.
 */
/**
 * Where a field's value should come from when several sources know it —
 * the per-field row of the field-sourcing canvases. `best` is the
 * authority, `today` is what actually fills it now, `gap` marks that the
 * authority isn't wired yet. Rendered on the Customize record card so the
 * sourcing strategy is visible where the logic lives.
 */
export interface FieldSourcing {
  best: string;
  today?: string;
  gap?: boolean;
}

export interface FieldDescriptor<TTable extends TableName = TableName> {
  key: string;
  label: string;
  entityType: ContractEntityType | "all";
  fieldType: FieldType;
  vocabulary?: string;
  careSignal?: string;
  requiredForCapabilities: CapabilityId[];
  aiDescription: string;
  dbColumn?: ColumnOf<TTable>;
  isReadonly?: boolean;
  /** Omitted = care_ask (conservative default); isReadonly implies system_derived. */
  writePolicy?: WritePolicy;
  /** Format constraint readable by humans and AI (e.g. "E.164", "lowercase", "ISO 4217 uppercase"). */
  formatRule?: string;
  /** What a blank value asserts (e.g. "unknown" vs "explicitly none"). */
  emptyMeaning?: string;
  /** Whether this field participates in duplicate/identity resolution. */
  dedupeRole?: "primary" | "supporting";
  /** Source authority for this field (see FieldSourcing). */
  sourcing?: FieldSourcing;
  /**
   * Fill rules define how to infer this field's value from signals.
   * This is the single source of truth for field inference logic.
   * Required for care_auto fields; recommended for care_ask fields.
   */
  fillRules?: FillRule[];
}

/** Resolve the effective write policy with the canon defaults. */
export function getWritePolicy(field: FieldDescriptor): WritePolicy {
  if (field.writePolicy) return field.writePolicy;
  return field.isReadonly ? "system_derived" : "care_ask";
}

// ============================================================================
// PERSON FIELDS
// ============================================================================

/**
 * People opts out of the conservative canon default (care_ask): with
 * provenance + undo and the workspace boldness setting as the safety net,
 * Salt fills person fields directly once a fill rule clears its bar.
 * Declared per field (not as a changed global default) so the choice stays
 * explicit at the declaration site.
 */
const PERSON_CARE_AUTO = { writePolicy: "care_auto" as const };

/**
 * The canvas treats address as one row ("street → country"); the registry
 * splits it across six fields. Billing is the authority for all of them —
 * customers keep billing addresses current because money depends on it.
 */
const PERSON_ADDRESS_SOURCING = {
  best: "Billing — customers keep billing addresses current because money depends on it",
  today: "Stripe / QuickBooks customer record",
  gap: false,
} as const;

export const PERSON_FIELDS: FieldDescriptor<"people">[] = [
  {
    key: "name",
    label: "Name",
    entityType: "person",
    fieldType: "text",
    ...PERSON_CARE_AUTO,
    careSignal: "person_name",
    requiredForCapabilities: ["invoicing"],
    aiDescription: "Full display name of the person",
    dbColumn: "name",
    sourcing: {
      best: "CRM contact record — human-curated, correctly formatted",
      today: "CRM contact record, Slack profile, or email signature",
    },
    fillRules: [
      { signal: "person_name_extracted", value: "{{extracted}}", confidence: 90, because: "From your CRM contact record, a Slack profile, a meeting attendee list, or an email signature" },
    ],
  },
  {
    key: "email",
    label: "Email",
    entityType: "person",
    fieldType: "email",
    ...PERSON_CARE_AUTO,
    careSignal: "person_email",
    requiredForCapabilities: ["email_follow_up", "scheduling"],
    aiDescription: "Primary email address for contact",
    dbColumn: "email",
    dedupeRole: "primary",
    sourcing: {
      best: "CRM contact email — canonical address on file",
      today: "Email thread envelope",
    },
    fillRules: [
      { signal: "person_email_extracted", value: "{{extracted}}", confidence: 95, because: "Email address extracted from thread" },
    ],
  },
  {
    key: "billingEmail",
    label: "Billing Email",
    entityType: "person",
    fieldType: "email",
    ...PERSON_CARE_AUTO,
    careSignal: "person_billing_email",
    requiredForCapabilities: ["invoicing"],
    aiDescription: "Email address for invoices and billing communications",
    dbColumn: "billing_email",
    sourcing: {
      best: "Billing — the address invoices actually go to (Stripe customer, QBO billing)",
      today: "Stripe / QuickBooks customer record",
    },
    fillRules: [
      { signal: "person_billing_email_extracted", value: "{{extracted}}", confidence: 85, because: "The address your billing app actually sends invoices to" },
    ],
  },
  {
    key: "phone",
    label: "Phone",
    entityType: "person",
    fieldType: "phone",
    ...PERSON_CARE_AUTO,
    careSignal: "person_phone",
    requiredForCapabilities: [],
    aiDescription: "Phone number for contact",
    dbColumn: "phone",
    sourcing: {
      best: "CRM phone / mobile fields",
      today: "CRM contact record, scheduling booking form, Slack profile, or email signature",
    },
    fillRules: [
      { signal: "person_phone_extracted", value: "{{extracted}}", confidence: 85, because: "From your CRM, a scheduling booking form, a Slack profile, or an email signature" },
    ],
  },
  {
    key: "timezone",
    label: "Timezone",
    entityType: "person",
    fieldType: "timezone",
    ...PERSON_CARE_AUTO,
    vocabulary: "timezone",
    careSignal: "person_timezone",
    requiredForCapabilities: ["scheduling"],
    aiDescription: "IANA timezone for scheduling meetings",
    dbColumn: "timezone",
    sourcing: {
      best: "Scheduling — booking confirmations carry the invitee's explicit timezone",
      today: "Scheduling booking confirmation or Slack profile",
    },
    fillRules: [
      { signal: "person_timezone_detected", value: "{{extracted}}", confidence: 88, because: "Confirmed by the invitee on a scheduling booking, or from their Slack profile" },
    ],
  },
  {
    key: "title",
    label: "Title",
    entityType: "person",
    fieldType: "text",
    ...PERSON_CARE_AUTO,
    careSignal: "person_title",
    requiredForCapabilities: [],
    aiDescription: "Job title or role at their organization",
    dbColumn: "title",
    sourcing: {
      best: "CRM job title field",
      today: "CRM contact record, Slack profile, or email signature",
    },
    fillRules: [
      { signal: "person_title_extracted", value: "{{extracted}}", confidence: 80, because: "From your CRM, a Slack profile, or an email signature" },
    ],
  },
  {
    key: "relationshipType",
    label: "Relationship",
    entityType: "person",
    fieldType: "select",
    ...PERSON_CARE_AUTO,
    vocabulary: "relationship_type",
    careSignal: "person_relationship_type",
    requiredForCapabilities: [],
    aiDescription: "How this person relates to your business",
    dbColumn: "relationship_type",
    sourcing: {
      best: "CRM stage — prospect to client is a lifecycle humans maintain",
      today: "Payments, invoices, domain lists",
    },
    fillRules: [
      { signal: "has_payment_received", value: "client", confidence: 95, because: "They paid you — strong client signal" },
      { signal: "has_invoice_sent", value: "client", confidence: 90, because: "You invoiced them — likely a client" },
      { signal: "email_domain_matches_workspace", value: "team", confidence: 92, because: "Same email domain as your workspace" },
      { signal: "email_domain_in_partner_list", value: "partner", confidence: 90, because: "Email domain is on your partner list" },
      { signal: "email_domain_in_vendor_list", value: "vendor", confidence: 88, because: "Email domain is on your vendor list" },
      { signal: "you_initiated", value: "prospect", confidence: 75, because: "You initiated contact, no stronger evidence" },
    ],
  },
  {
    key: "addressLine1",
    label: "Street Address",
    entityType: "person",
    fieldType: "text",
    ...PERSON_CARE_AUTO,
    careSignal: "person_address_line1",
    requiredForCapabilities: ["invoicing"],
    aiDescription: "Street address line 1",
    dbColumn: "address_line_1",
    sourcing: PERSON_ADDRESS_SOURCING,
    fillRules: [
      { signal: "person_address_extracted", value: "{{extracted}}", confidence: 82, because: "From the customer's billing address, or extracted from a signature or document" },
    ],
  },
  {
    key: "addressLine2",
    label: "Address Line 2",
    entityType: "person",
    fieldType: "text",
    ...PERSON_CARE_AUTO,
    careSignal: "person_address_line2",
    requiredForCapabilities: [],
    aiDescription: "Street address line 2 (apt, suite, etc.)",
    dbColumn: "address_line_2",
    sourcing: PERSON_ADDRESS_SOURCING,
    fillRules: [
      { signal: "person_address_extracted", value: "{{extracted}}", confidence: 82, because: "From the customer's billing address, or extracted from a signature" },
    ],
  },
  {
    key: "city",
    label: "City",
    entityType: "person",
    fieldType: "text",
    ...PERSON_CARE_AUTO,
    careSignal: "person_city",
    requiredForCapabilities: ["invoicing"],
    aiDescription: "City name",
    dbColumn: "city",
    sourcing: PERSON_ADDRESS_SOURCING,
    fillRules: [
      { signal: "person_address_extracted", value: "{{extracted}}", confidence: 82, because: "From the customer's billing address" },
    ],
  },
  {
    key: "state",
    label: "State/Province",
    entityType: "person",
    fieldType: "text",
    ...PERSON_CARE_AUTO,
    careSignal: "person_state",
    requiredForCapabilities: [],
    aiDescription: "State or province",
    dbColumn: "state",
    sourcing: PERSON_ADDRESS_SOURCING,
    fillRules: [
      { signal: "person_address_extracted", value: "{{extracted}}", confidence: 82, because: "From the customer's billing address" },
    ],
  },
  {
    key: "postalCode",
    label: "Postal Code",
    entityType: "person",
    fieldType: "text",
    ...PERSON_CARE_AUTO,
    careSignal: "person_postal_code",
    requiredForCapabilities: ["invoicing"],
    aiDescription: "ZIP or postal code",
    dbColumn: "postal_code",
    sourcing: PERSON_ADDRESS_SOURCING,
    fillRules: [
      { signal: "person_address_extracted", value: "{{extracted}}", confidence: 82, because: "From the customer's billing address" },
    ],
  },
  {
    key: "country",
    label: "Country",
    entityType: "person",
    fieldType: "country",
    ...PERSON_CARE_AUTO,
    vocabulary: "country",
    careSignal: "person_country",
    requiredForCapabilities: ["invoicing"],
    aiDescription: "Country (ISO 3166-1 alpha-2)",
    dbColumn: "country",
    sourcing: PERSON_ADDRESS_SOURCING,
    fillRules: [
      { signal: "person_address_extracted", value: "{{extracted}}", confidence: 82, because: "From the customer's billing address" },
      { signal: "person_timezone_detected", value: "{{extracted}}", confidence: 70, because: "Country inferred from timezone" },
    ],
  },
  {
    key: "tags",
    label: "Tags",
    entityType: "person",
    fieldType: "multi_select",
    ...PERSON_CARE_AUTO,
    careSignal: "person_tags",
    requiredForCapabilities: [],
    aiDescription:
      "Workspace tags for this person (via entity_tag_assignments, not a column). Salt assigns existing tags when a fit clears the bar; coining a new tag is still gated by tag_auto_create_threshold and tag_max_ai_created in profile_playbook_settings",
    sourcing: {
      best: "Salt's judgment across every connector — payments, activity, silence",
      today: "Tag-fit detection across payment and activity patterns",
      gap: false,
    },
    fillRules: [
      { signal: "person_tag_fit_detected", value: "{{extracted}}", confidence: 80, because: "An existing tag clearly fits — like VIP when payments stack up, or At Risk when a client goes quiet" },
      { signal: "person_tag_fit_detected", value: "{{extracted}}", confidence: 80, because: "A brand-new tag only gets coined when I'm at least 80% sure, and I cap how many I create so your list stays clean" },
      { signal: "person_tag_fit_detected", value: "{{extracted}}", confidence: 100, because: "Near-duplicates get merged instead of piling up, and tags you stop using archive themselves" },
    ],
  },
  {
    key: "recordStatus",
    label: "Record Status",
    entityType: "person",
    fieldType: "select",
    vocabulary: "record_status",
    careSignal: "person_record_status",
    requiredForCapabilities: [],
    aiDescription: "Whether the relationship is live. Memory Care derives it from 90-day activity signals but never overrides a manual choice",
    dbColumn: "record_status",
    writePolicy: "care_auto",
    emptyMeaning: "Defaults to active; a NULL source means no one has explicitly set it",
    sourcing: {
      best: "Activity across every source, not just email",
      today: "Meetings, payments, and thread activity (email-count signals aren't wired)",
      gap: true,
    },
    fillRules: [
      { signal: "email_count_gte_5", op: "eq", opValue: true, value: "active", confidence: 85, because: "Recent email activity indicates active relationship" },
      { signal: "has_calendar_meeting", value: "active", confidence: 88, because: "Recent meeting indicates active relationship" },
    ],
  },
  {
    key: "lastContactedAt",
    label: "Last Contacted",
    entityType: "person",
    fieldType: "datetime",
    careSignal: "person_last_contacted",
    requiredForCapabilities: [],
    aiDescription: "Most recent contact with this person (email sent/received, meeting attended, direct message)",
    dbColumn: "last_contact_at",
    writePolicy: "care_auto",
    sourcing: {
      best: "Any touchpoint, whichever is newest",
      today: "Email, calendar meetings, Slack DMs, or meeting recordings",
    },
    fillRules: [
      { signal: "capture_email_received", value: "{{extracted}}", confidence: 100, because: "Email received from this person" },
      { signal: "capture_email_sent", value: "{{extracted}}", confidence: 100, because: "Email sent to this person" },
      { signal: "capture_meeting_completed", value: "{{extracted}}", confidence: 100, because: "Meeting with this person completed" },
      { signal: "capture_message_received", value: "{{extracted}}", confidence: 100, because: "Direct message from this person" },
    ],
  },
  {
    key: "notes",
    label: "Notes",
    entityType: "person",
    fieldType: "text",
    careSignal: "person_notes",
    requiredForCapabilities: [],
    aiDescription:
      "Dated observations about this person (entity notes via the notes blueprint, not a column). Worth a note: decisions in their own words, commitments with dates, role or company changes, relationship milestones, life context they volunteered. Never worth a note: scheduling logistics, small talk, anything stale within a month. Salt appends its own notes with evidence links; notes the user writes are never edited or removed",
    ...PERSON_CARE_AUTO,
    sourcing: {
      best: "Salt's own judgment across every connector — dated observations with evidence links",
      today: "No producer yet — the notes machinery exists, observation detection doesn't",
      gap: true,
    },
    fillRules: [
      { signal: "person_observation_detected", value: "{{extracted}}", confidence: 90, because: "They said it themselves — a decision, a life update, a new role, in their own words" },
      { signal: "person_observation_detected", value: "{{extracted}}", confidence: 85, because: "A commitment with a date attached — 'I'll have the signed contract back Friday'" },
      { signal: "person_observation_detected", value: "{{extracted}}", confidence: 85, because: "A milestone the systems confirm — first payment, signed contract, a CRM stage move" },
      { signal: "person_observation_detected", value: "{{extracted}}", confidence: 100, because: "Notes you write yourself stay yours — I never edit or remove them" },
    ],
  },
];

// ============================================================================
// ORG FIELDS
// ============================================================================

/**
 * Same canvas treatment as person address: one row ("street → country"),
 * six registry fields. org_address_extracted is whitelisted in the parity
 * test — the rule exists but no producer emits it yet (Phase 5 scope).
 */
const ORG_ADDRESS_SOURCING = {
  best: "Billing — the org's billing address is current because money depends on it",
  today: "No producer yet — the rule exists, extraction doesn't",
  gap: true,
} as const;

export const ORG_FIELDS: FieldDescriptor<"organizations">[] = [
  {
    key: "name",
    label: "Name",
    entityType: "org",
    fieldType: "text",
    careSignal: "org_name",
    requiredForCapabilities: ["invoicing", "proposals_contracts"],
    aiDescription: "Organization display name",
    dbColumn: "name",
    sourcing: {
      best: "CRM account name — human-curated, correctly capitalized",
      today: "Derived from email domain",
      gap: true,
    },
    fillRules: [
      { signal: "org_created_from_domain", value: "{{extracted}}", confidence: 85, because: "Name derived from email domain" },
    ],
  },
  {
    key: "billingEmail",
    label: "Billing Email",
    entityType: "org",
    fieldType: "email",
    careSignal: "org_billing_email",
    requiredForCapabilities: ["invoicing"],
    aiDescription: "Email address for invoices and billing communications",
    dbColumn: "billing_email",
    sourcing: {
      best: "Billing — the address invoices to this org actually go to",
      today: "Extracted when an invoice is sent",
      gap: true,
    },
    fillRules: [
      { signal: "org_has_invoice_sent", value: "{{extracted}}", confidence: 85, because: "Email used for org invoice delivery" },
    ],
  },
  {
    key: "industryParent",
    label: "Industry",
    entityType: "org",
    fieldType: "select",
    vocabulary: "industry_parent",
    careSignal: "org_industry_parent",
    requiredForCapabilities: [],
    aiDescription: "Primary industry category",
    dbColumn: "industry_parent",
    sourcing: {
      best: "CRM industry field — someone picked it deliberately",
      today: "Inferred from domain or context",
      gap: true,
    },
    fillRules: [
      { signal: "org_industry_inferred", value: "{{extracted}}", confidence: 75, because: "Industry inferred from domain or context" },
    ],
  },
  {
    key: "industryChild",
    label: "Industry Sub-category",
    entityType: "org",
    fieldType: "select",
    vocabulary: "industry_child",
    careSignal: "org_industry_child",
    requiredForCapabilities: [],
    aiDescription: "Industry sub-category (depends on parent)",
    dbColumn: "industry_child",
    sourcing: {
      best: "CRM industry field — someone picked it deliberately",
      today: "Inferred from domain or context",
      gap: true,
    },
    fillRules: [
      { signal: "org_industry_inferred", value: "{{extracted}}", confidence: 70, because: "Sub-industry inferred from context" },
    ],
  },
  {
    key: "relationshipType",
    label: "Relationship",
    entityType: "org",
    fieldType: "select",
    vocabulary: "relationship_type",
    careSignal: "org_relationship_type",
    requiredForCapabilities: [],
    aiDescription: "How this organization relates to your business",
    dbColumn: "relationship_status",
    sourcing: {
      best: "Billing — money settles it: they pay you → client, you pay them → vendor",
      today: "Payments, invoices, domain lists",
      gap: false,
    },
    fillRules: [
      { signal: "org_has_payment_received", value: "client", confidence: 95, because: "This organization paid you" },
      { signal: "org_has_invoice_sent", value: "client", confidence: 90, because: "You invoiced this organization" },
      { signal: "org_domain_in_partner_list", value: "partner", confidence: 90, because: "Domain is on your partner list" },
      { signal: "org_domain_in_vendor_list", value: "vendor", confidence: 88, because: "Domain is on your vendor list" },
    ],
  },
  {
    key: "primaryContact",
    label: "Primary Contact",
    entityType: "org",
    fieldType: "reference",
    careSignal: "org_primary_contact",
    requiredForCapabilities: [],
    aiDescription: "Main person to contact at this organization",
    sourcing: {
      best: "CRM contact roles — account owner, decision maker, billing contact are explicit",
      today: "Identified from activity",
      gap: true,
    },
    fillRules: [
      { signal: "org_has_primary_contact", value: "{{extracted}}", confidence: 85, because: "Primary contact identified from activity" },
    ],
  },
  {
    key: "primaryContact.name",
    label: "Primary Contact Name",
    entityType: "org",
    fieldType: "text",
    requiredForCapabilities: ["email_follow_up", "scheduling"],
    aiDescription: "Name of the primary contact (derived)",
    isReadonly: true,
  },
  {
    key: "addressLine1",
    label: "Street Address",
    entityType: "org",
    fieldType: "text",
    careSignal: "org_address_line1",
    requiredForCapabilities: ["invoicing", "proposals_contracts"],
    aiDescription: "Street address line 1",
    dbColumn: "address_line_1",
   sourcing: ORG_ADDRESS_SOURCING,
    fillRules: [
      { signal: "org_address_extracted", value: "{{extracted}}", confidence: 82, because: "Address extracted from documents or invoices" },
    ],
  },
  {
    key: "addressLine2",
    label: "Address Line 2",
    entityType: "org",
    fieldType: "text",
    careSignal: "org_address_line2",
    requiredForCapabilities: [],
    aiDescription: "Street address line 2 (apt, suite, etc.)",
    dbColumn: "address_line_2",
   sourcing: ORG_ADDRESS_SOURCING,
    fillRules: [
      { signal: "org_address_extracted", value: "{{extracted}}", confidence: 82, because: "Address line 2 extracted from documents" },
    ],
  },
  {
    key: "city",
    label: "City",
    entityType: "org",
    fieldType: "text",
    careSignal: "org_city",
    requiredForCapabilities: ["invoicing", "proposals_contracts"],
    aiDescription: "City name",
    dbColumn: "city",
   sourcing: ORG_ADDRESS_SOURCING,
    fillRules: [
      { signal: "org_address_extracted", value: "{{extracted}}", confidence: 82, because: "City extracted from org address" },
    ],
  },
  {
    key: "state",
    label: "State/Province",
    entityType: "org",
    fieldType: "text",
    careSignal: "org_state",
    requiredForCapabilities: [],
    aiDescription: "State or province",
    dbColumn: "state",
   sourcing: ORG_ADDRESS_SOURCING,
    fillRules: [
      { signal: "org_address_extracted", value: "{{extracted}}", confidence: 82, because: "State extracted from org address" },
    ],
  },
  {
    key: "postalCode",
    label: "Postal Code",
    entityType: "org",
    fieldType: "text",
    careSignal: "org_postal_code",
    requiredForCapabilities: ["invoicing", "proposals_contracts"],
    aiDescription: "ZIP or postal code",
    dbColumn: "postal_code",
   sourcing: ORG_ADDRESS_SOURCING,
    fillRules: [
      { signal: "org_address_extracted", value: "{{extracted}}", confidence: 82, because: "Postal code extracted from org address" },
    ],
  },
  {
    key: "country",
    label: "Country",
    entityType: "org",
    fieldType: "country",
    vocabulary: "country",
    careSignal: "org_country",
    requiredForCapabilities: ["invoicing", "proposals_contracts"],
    aiDescription: "Country (ISO 3166-1 alpha-2)",
    dbColumn: "country",
   sourcing: ORG_ADDRESS_SOURCING,
    fillRules: [
      { signal: "org_address_extracted", value: "{{extracted}}", confidence: 82, because: "Country extracted from org address" },
    ],
  },
  {
    key: "taxId",
    label: "Tax ID",
    entityType: "org",
    fieldType: "text",
    careSignal: "org_tax_id",
    requiredForCapabilities: ["invoicing"],
    aiDescription: "Tax identification number (VAT, EIN, etc.)",
    dbColumn: "tax_id",
    fillRules: [
      { signal: "org_tax_id_extracted", value: "{{extracted}}", confidence: 90, because: "Tax ID extracted from invoice or documents" },
    ],
  },
  {
    key: "website",
    label: "Website",
    entityType: "org",
    fieldType: "url",
    careSignal: "org_website",
    requiredForCapabilities: [],
    aiDescription: "Company website URL",
    dbColumn: "website",
    sourcing: {
      best: "CRM website field",
      today: "Discovered from email domain",
      gap: false,
    },
    fillRules: [
      { signal: "org_website_found", value: "{{extracted}}", confidence: 85, because: "Website discovered from domain or email" },
    ],
  },
  {
    key: "tags",
    label: "Tags",
    entityType: "org",
    fieldType: "multi_select",
    writePolicy: "care_auto",
    careSignal: "org_tags",
    requiredForCapabilities: [],
    aiDescription:
      "Workspace tags for this organization (via entity_tag_assignments, not a column). Salt assigns existing tags when a fit clears the bar; coining a new tag is still gated by tag_auto_create_threshold and tag_max_ai_created in profile_playbook_settings",
    fillRules: [
      { signal: "org_tag_fit_detected", value: "{{extracted}}", confidence: 80, because: "An existing tag clearly fits this organization" },
    ],
    sourcing: {
      best: "Salt's judgment across this org's activity — same tag-fit bar as people",
      today: "No org tag-fit producer yet — the rule exists, detection doesn't",
      gap: true,
    },
  },
  {
    key: "recordStatus",
    label: "Record Status",
    entityType: "org",
    fieldType: "select",
    vocabulary: "record_status",
    careSignal: "org_record_status",
    requiredForCapabilities: [],
    aiDescription: "Whether the relationship is live, aggregated across the org's linked people, work, and billing. Memory Care never overrides a manual choice",
    dbColumn: "record_status",
    writePolicy: "care_auto",
    emptyMeaning: "Defaults to active; a NULL source means no one has explicitly set it",
   sourcing: {
      best: "Money + lifecycle: active subscription or open deal = alive; cancelled plan or churned stage = fading",
      today: "Aggregated from linked people + payments",
      gap: true,
    },
    fillRules: [
      { signal: "org_has_people", value: "active", confidence: 80, because: "Org has active linked people" },
      { signal: "org_has_payment_received", value: "active", confidence: 90, because: "Recent payment indicates active relationship" },
    ],
  },
  {
    key: "lastContactedAt",
    label: "Last Contacted",
    entityType: "org",
    fieldType: "datetime",
    careSignal: "org_last_contacted",
    requiredForCapabilities: [],
    aiDescription: "Most recent contact with anyone at this org. Aggregated from linked people.",
    dbColumn: "last_contact_at",
    writePolicy: "care_auto",
   sourcing: {
      best: "Any touchpoint with anyone at the domain, newest wins",
      today: "Aggregated from linked people's email, meetings, and DMs",
      gap: true,
    },
    fillRules: [
      { signal: "org_person_contacted", value: "{{extracted}}", confidence: 100, because: "Someone at this org was contacted" },
    ],
  },
];

// ============================================================================
// WORK FIELDS
// ============================================================================

export const WORK_FIELDS: FieldDescriptor<"work">[] = [
  {
    key: "name",
    label: "Name",
    entityType: "work",
    fieldType: "text",
    careSignal: "work_name",
    requiredForCapabilities: [],
    aiDescription: "Display name for this work item",
    dbColumn: "name",
    fillRules: [
      { signal: "work_scope_extracted", value: "{{extracted}}", confidence: 80, because: "Name derived from proposal/contract title" },
    ],
  },
  {
    key: "status",
    label: "Status",
    entityType: "work",
    fieldType: "select",
    vocabulary: "work_status",
    careSignal: "work_status",
    requiredForCapabilities: [],
    aiDescription: "Current lifecycle state (active, stalled, completed, etc.)",
    dbColumn: "status",
    fillRules: [
      { signal: "work_proposal_sent", value: "draft", confidence: 90, because: "Proposal sent — awaiting decision" },
      { signal: "work_proposal_accepted", value: "signed", confidence: 95, because: "Client accepted the proposal" },
      { signal: "work_has_signed_contract", value: "signed", confidence: 95, because: "Contract was signed" },
      { signal: "work_has_kickoff", value: "active", confidence: 90, because: "Kickoff meeting occurred — work is active" },
      { signal: "work_has_completed_deliverable", value: "completed", confidence: 85, because: "Final deliverable was completed" },
      { signal: "work_is_blocked", value: "on_hold", confidence: 80, because: "Work appears blocked or waiting" },
    ],
  },
  {
    key: "workType",
    label: "Type",
    entityType: "work",
    fieldType: "select",
    vocabulary: "work_type",
    careSignal: "work_type",
    requiredForCapabilities: [],
    aiDescription: "Engagement model (project, retainer, hourly, etc.)",
    dbColumn: "work_type",
    fillRules: [
      { signal: "work_type_inferred", value: "{{extracted}}", confidence: 75, because: "Work type inferred from proposal or context" },
    ],
  },
  {
    key: "workTypeRetainer",
    label: "Is Retainer",
    entityType: "work",
    fieldType: "boolean",
    requiredForCapabilities: ["retainer_renewals"],
    aiDescription: "True if work_type is retainer (derived)",
    isReadonly: true,
  },
  {
    key: "stage",
    label: "Stage",
    entityType: "work",
    fieldType: "select",
    vocabulary: "work_stage",
    careSignal: "work_stage",
    requiredForCapabilities: [],
    aiDescription: "Pipeline stage within the work type",
    dbColumn: "stage",
    fillRules: [
      { signal: "work_stage_inferred", value: "{{extracted}}", confidence: 75, because: "Stage inferred from activity pattern" },
    ],
  },
  {
    key: "serviceId",
    label: "Service",
    entityType: "work",
    fieldType: "reference",
    careSignal: "work_service_id",
    requiredForCapabilities: ["proposals_contracts"],
    aiDescription: "Linked service from the service catalog",
    dbColumn: "service_id",
    fillRules: [
      { signal: "work_scope_extracted", value: "{{extracted}}", confidence: 70, because: "Service matched from scope description" },
    ],
  },
  {
    key: "billingContactId",
    label: "Billing Contact",
    entityType: "work",
    fieldType: "reference",
    careSignal: "work_billing_contact_id",
    requiredForCapabilities: ["invoicing", "retainer_renewals"],
    aiDescription: "Person responsible for receiving invoices",
    dbColumn: "billing_contact_id",
    fillRules: [
      { signal: "work_invoice_created", value: "{{extracted}}", confidence: 85, because: "Invoice recipient identified as billing contact" },
    ],
  },
  {
    key: "primaryContactName",
    label: "Primary Contact Name",
    entityType: "work",
    fieldType: "text",
    requiredForCapabilities: ["email_follow_up", "scheduling"],
    aiDescription: "Name of primary contact on this work (derived)",
    isReadonly: true,
  },
  {
    key: "contractValueCents",
    label: "Contract Value",
    entityType: "work",
    fieldType: "money",
    careSignal: "work_contract_value",
    requiredForCapabilities: [],
    aiDescription: "Total contract value in cents",
    dbColumn: "contract_value_cents",
    fillRules: [
      { signal: "work_value_extracted", value: "{{extracted}}", confidence: 88, because: "Value extracted from proposal or contract" },
    ],
  },
  {
    key: "finalPriceCents",
    label: "Final Price",
    entityType: "work",
    fieldType: "money",
    careSignal: "work_final_price",
    requiredForCapabilities: [],
    aiDescription: "Final price after discounts in cents",
    dbColumn: "final_price_cents",
    fillRules: [
      { signal: "work_value_extracted", value: "{{extracted}}", confidence: 88, because: "Final price extracted from contract" },
    ],
  },
  {
    key: "contractValueOrScope",
    label: "Contract Value or Scope",
    entityType: "work",
    fieldType: "json",
    requiredForCapabilities: ["invoicing", "proposals_contracts"],
    aiDescription: "Either contractValueCents, finalPriceCents, or scopeItems (derived)",
    isReadonly: true,
  },
  {
    key: "scopeItems",
    label: "Scope Items",
    entityType: "work",
    fieldType: "json",
    careSignal: "work_scope_items",
    requiredForCapabilities: [],
    aiDescription: "Array of scope line items with descriptions and amounts",
    dbColumn: "scope_items",
    fillRules: [
      { signal: "work_scope_extracted", value: "{{extracted}}", confidence: 85, because: "Scope items extracted from proposal" },
    ],
  },
  {
    key: "currency",
    label: "Currency",
    entityType: "work",
    fieldType: "select",
    vocabulary: "currency",
    careSignal: "work_currency",
    requiredForCapabilities: ["invoicing"],
    aiDescription: "Currency for all monetary values (ISO 4217)",
    dbColumn: "currency",
    fillRules: [
      { signal: "work_value_extracted", value: "{{extracted}}", confidence: 90, because: "Currency detected from monetary values" },
    ],
  },
  {
    key: "paymentTerms",
    label: "Payment Terms",
    entityType: "work",
    fieldType: "select",
    vocabulary: "payment_terms",
    careSignal: "work_payment_terms",
    requiredForCapabilities: ["invoicing"],
    aiDescription: "When payment is due after invoicing",
    dbColumn: "payment_terms",
    fillRules: [
      { signal: "work_scope_extracted", value: "{{extracted}}", confidence: 80, because: "Payment terms extracted from contract" },
    ],
  },
  {
    key: "paymentType",
    label: "Payment Type",
    entityType: "work",
    fieldType: "select",
    careSignal: "work_payment_type",
    requiredForCapabilities: [],
    aiDescription: "How payment is structured (fixed, hourly, milestone, retainer)",
    dbColumn: "payment_type",
    fillRules: [
      { signal: "work_type_inferred", value: "{{extracted}}", confidence: 75, because: "Payment type inferred from work type" },
    ],
  },
  {
    key: "hourlyRateCents",
    label: "Hourly Rate",
    entityType: "work",
    fieldType: "money",
    careSignal: "work_hourly_rate",
    requiredForCapabilities: [],
    aiDescription: "Hourly rate in cents (for hourly work)",
    dbColumn: "hourly_rate_cents",
    fillRules: [
      { signal: "work_value_extracted", value: "{{extracted}}", confidence: 85, because: "Hourly rate extracted from proposal" },
    ],
  },
  {
    key: "hoursEstimate",
    label: "Hours Estimate",
    entityType: "work",
    fieldType: "number",
    careSignal: "work_hours_estimate",
    requiredForCapabilities: [],
    aiDescription: "Estimated hours for the work",
    dbColumn: "hours_estimate",
    fillRules: [
      { signal: "work_scope_extracted", value: "{{extracted}}", confidence: 80, because: "Hours estimate extracted from proposal" },
    ],
  },
  {
    key: "retainerMrrCents",
    label: "Retainer MRR",
    entityType: "work",
    fieldType: "money",
    careSignal: "work_retainer_mrr",
    requiredForCapabilities: ["retainer_renewals"],
    aiDescription: "Monthly recurring revenue for retainer in cents",
    dbColumn: "retainer_mrr_cents",
    fillRules: [
      { signal: "work_value_extracted", value: "{{extracted}}", confidence: 88, because: "MRR extracted from retainer contract" },
    ],
  },
  {
    key: "renewalDate",
    label: "Renewal Date",
    entityType: "work",
    fieldType: "date",
    careSignal: "work_renewal_date",
    requiredForCapabilities: ["retainer_renewals"],
    aiDescription: "Date when retainer comes up for renewal",
    dbColumn: "renewal_date",
    fillRules: [
      { signal: "work_scope_extracted", value: "{{extracted}}", confidence: 85, because: "Renewal date extracted from retainer terms" },
    ],
  },
  {
    key: "billingCycle",
    label: "Billing Cycle",
    entityType: "work",
    fieldType: "select",
    vocabulary: "billing_cycle",
    careSignal: "work_billing_cycle",
    requiredForCapabilities: ["retainer_renewals"],
    aiDescription: "How often billing occurs",
    dbColumn: "billing_cycle",
    fillRules: [
      { signal: "work_scope_extracted", value: "{{extracted}}", confidence: 82, because: "Billing cycle extracted from contract" },
    ],
  },
  {
    key: "decisionDate",
    label: "Decision Date",
    entityType: "work",
    fieldType: "date",
    careSignal: "work_decision_date",
    requiredForCapabilities: ["proposals_contracts"],
    aiDescription: "Expected date for client decision on proposal",
    dbColumn: "decision_date",
    fillRules: [
      { signal: "work_timeline_mentioned", value: "{{extracted}}", confidence: 75, because: "Decision deadline mentioned in email" },
    ],
  },
  {
    key: "startDate",
    label: "Start Date",
    entityType: "work",
    fieldType: "date",
    careSignal: "work_start_date",
    requiredForCapabilities: [],
    aiDescription: "When work begins",
    dbColumn: "start_date",
    fillRules: [
      { signal: "work_has_kickoff", value: "{{extracted}}", confidence: 90, because: "Start date from kickoff meeting" },
      { signal: "work_scope_extracted", value: "{{extracted}}", confidence: 80, because: "Start date extracted from contract" },
    ],
  },
  {
    key: "deadline",
    label: "Deadline",
    entityType: "work",
    fieldType: "date",
    careSignal: "work_deadline",
    requiredForCapabilities: [],
    aiDescription: "Target completion date",
    dbColumn: "deadline",
    fillRules: [
      { signal: "work_has_due_date", value: "{{extracted}}", confidence: 88, because: "Deadline mentioned or set" },
      { signal: "work_scope_extracted", value: "{{extracted}}", confidence: 82, because: "Deadline extracted from contract" },
    ],
  },
  {
    key: "poNumber",
    label: "PO Number",
    entityType: "work",
    fieldType: "text",
    careSignal: "work_po_number",
    requiredForCapabilities: [],
    aiDescription: "Client purchase order number for invoicing",
    dbColumn: "po_number",
    fillRules: [
      { signal: "work_scope_extracted", value: "{{extracted}}", confidence: 90, because: "PO number extracted from documents" },
    ],
  },
  {
    key: "estimatedTimeline",
    label: "Estimated Timeline",
    entityType: "work",
    fieldType: "text",
    careSignal: "work_estimated_timeline",
    requiredForCapabilities: [],
    aiDescription: "Human-readable timeline estimate",
    dbColumn: "estimated_timeline",
    fillRules: [
      { signal: "work_timeline_mentioned", value: "{{extracted}}", confidence: 78, because: "Timeline mentioned in email or proposal" },
    ],
  },
  {
    key: "discountPercent",
    label: "Discount %",
    entityType: "work",
    fieldType: "percent",
    careSignal: "work_discount_percent",
    requiredForCapabilities: [],
    aiDescription: "Percentage discount applied",
    dbColumn: "discount_percent",
    fillRules: [
      { signal: "work_value_extracted", value: "{{extracted}}", confidence: 85, because: "Discount percentage extracted from proposal" },
    ],
  },
  {
    key: "discountAmountCents",
    label: "Discount Amount",
    entityType: "work",
    fieldType: "money",
    careSignal: "work_discount_amount",
    requiredForCapabilities: [],
    aiDescription: "Fixed discount amount in cents",
    dbColumn: "discount_amount_cents",
    fillRules: [
      { signal: "work_value_extracted", value: "{{extracted}}", confidence: 85, because: "Discount amount extracted from proposal" },
    ],
  },
  {
    key: "discountReason",
    label: "Discount Reason",
    entityType: "work",
    fieldType: "text",
    careSignal: "work_discount_reason",
    requiredForCapabilities: [],
    aiDescription: "Reason for applying discount",
    dbColumn: "discount_reason",
    fillRules: [
      { signal: "work_value_extracted", value: "{{extracted}}", confidence: 75, because: "Discount reason mentioned in proposal" },
    ],
  },
  {
    key: "tags",
    label: "Tags",
    entityType: "work",
    fieldType: "multi_select",
    writePolicy: "care_auto",
    careSignal: "work_tags",
    requiredForCapabilities: [],
    aiDescription:
      "Workspace tags for this work item (via entity_tag_assignments, not a column). Salt assigns existing tags when a fit clears the bar; coining a new tag is still gated by tag_auto_create_threshold and tag_max_ai_created in profile_playbook_settings",
    fillRules: [
      { signal: "work_tag_fit_detected", value: "{{extracted}}", confidence: 80, because: "An existing tag clearly fits this work" },
    ],
  },
];

// ============================================================================
// BILLING FIELDS (billing_records)
// ============================================================================

export const BILLING_FIELDS: FieldDescriptor<"billing_records">[] = [
  {
    key: "number",
    label: "Number",
    entityType: "billing",
    fieldType: "text",
    careSignal: "billing_number",
    requiredForCapabilities: [],
    aiDescription: "Invoice or bill number as issued",
    dbColumn: "number",
    dedupeRole: "primary",
    formatRule: "Exactly as printed on the document; no normalization",
    fillRules: [
      { signal: "billing_invoice_parsed", value: "{{extracted}}", confidence: 95, because: "Invoice number extracted from document" },
      { signal: "billing_stripe_synced", value: "{{extracted}}", confidence: 98, because: "Invoice number from Stripe" },
    ],
  },
  {
    key: "status",
    label: "Status",
    entityType: "billing",
    fieldType: "select",
    vocabulary: "billing_status",
    careSignal: "billing_status",
    requiredForCapabilities: [],
    aiDescription: "Payment state; paid/partial transitions come from payment matching",
    dbColumn: "status",
    writePolicy: "care_auto",
    fillRules: [
      { signal: "billing_amount_paid_covers_total", value: "paid", confidence: 98, because: "Payment received covers the invoice amount" },
      { signal: "billing_payment_matched", value: "partial", confidence: 90, because: "Partial payment received" },
      { signal: "billing_due_date_passed", value: "overdue", confidence: 95, because: "Due date has passed without full payment" },
    ],
  },
  {
    key: "direction",
    label: "Direction",
    entityType: "billing",
    fieldType: "select",
    vocabulary: "billing_direction",
    requiredForCapabilities: [],
    aiDescription: "Receivable (owed to you) or payable (you owe); fixed at creation",
    dbColumn: "direction",
    writePolicy: "user_only",
  },
  {
    key: "category",
    label: "Category",
    entityType: "billing",
    fieldType: "select",
    vocabulary: "billing_category",
    careSignal: "billing_category",
    requiredForCapabilities: [],
    aiDescription: "Spend category for payables",
    dbColumn: "category",
    fillRules: [
      { signal: "billing_invoice_parsed", value: "{{extracted}}", confidence: 75, because: "Category inferred from invoice content" },
    ],
  },
  {
    key: "organization",
    label: "Organization",
    entityType: "billing",
    fieldType: "reference",
    careSignal: "billing_organization",
    requiredForCapabilities: [],
    aiDescription: "Counterparty organization for this record",
    dbColumn: "organization_id",
    fillRules: [
      { signal: "billing_party_email_match", value: "{{extracted}}", confidence: 88, because: "Organization matched from billing email domain" },
    ],
  },
  {
    key: "billingContact",
    label: "Billing Contact",
    entityType: "billing",
    fieldType: "reference",
    careSignal: "billing_person",
    requiredForCapabilities: [],
    aiDescription: "Counterparty person for this record",
    dbColumn: "person_id",
    fillRules: [
      { signal: "billing_party_email_match", value: "{{extracted}}", confidence: 88, because: "Person matched from billing email" },
    ],
  },
  {
    key: "linkedWork",
    label: "Linked Work",
    entityType: "billing",
    fieldType: "reference",
    careSignal: "billing_project",
    requiredForCapabilities: [],
    aiDescription: "Work item this billing record belongs to",
    dbColumn: "work_id",
    fillRules: [
      { signal: "billing_invoice_parsed", value: "{{extracted}}", confidence: 80, because: "Work linked from invoice description or PO" },
    ],
  },
  {
    key: "vendorLabel",
    label: "Vendor",
    entityType: "billing",
    fieldType: "text",
    careSignal: "billing_vendor_label",
    requiredForCapabilities: [],
    aiDescription: "Free-text counterparty label when no org/person record is linked",
    dbColumn: "vendor_label",
    fillRules: [
      { signal: "billing_invoice_parsed", value: "{{extracted}}", confidence: 85, because: "Vendor name extracted from bill" },
    ],
  },
  {
    key: "amountCents",
    label: "Amount",
    entityType: "billing",
    fieldType: "money",
    careSignal: "billing_amount",
    requiredForCapabilities: [],
    aiDescription: "Total amount in cents",
    dbColumn: "amount_cents",
    formatRule: "Integer cents in the record's currency",
    fillRules: [
      { signal: "billing_invoice_parsed", value: "{{extracted}}", confidence: 95, because: "Amount extracted from invoice" },
      { signal: "billing_stripe_synced", value: "{{extracted}}", confidence: 98, because: "Amount from Stripe" },
    ],
  },
  {
    key: "amountPaidCents",
    label: "Amount Paid",
    entityType: "billing",
    fieldType: "money",
    careSignal: "billing_amount_paid",
    requiredForCapabilities: [],
    aiDescription: "Amount received so far in cents; maintained by payment matching",
    dbColumn: "amount_paid_cents",
    writePolicy: "system_derived",
    fillRules: [
      { signal: "billing_payment_matched", value: "{{extracted}}", confidence: 98, because: "Payment amount matched to invoice" },
      { signal: "billing_stripe_synced", value: "{{extracted}}", confidence: 98, because: "Payment amount from Stripe" },
    ],
  },
  {
    key: "currency",
    label: "Currency",
    entityType: "billing",
    fieldType: "select",
    vocabulary: "currency",
    requiredForCapabilities: [],
    aiDescription: "Currency of all amounts on this record (ISO 4217)",
    dbColumn: "currency",
    formatRule: "Uppercase ISO 4217 (DB currently stores lowercase until Phase 3.3 lands)",
    fillRules: [
      { signal: "billing_invoice_parsed", value: "{{extracted}}", confidence: 95, because: "Currency detected from invoice" },
      { signal: "billing_stripe_synced", value: "{{extracted}}", confidence: 98, because: "Currency from Stripe" },
    ],
  },
  {
    key: "issuedAt",
    label: "Issued",
    entityType: "billing",
    fieldType: "date",
    careSignal: "billing_issued_at",
    requiredForCapabilities: [],
    aiDescription: "Date the invoice/bill was issued",
    dbColumn: "issued_at",
    fillRules: [
      { signal: "billing_invoice_parsed", value: "{{extracted}}", confidence: 92, because: "Issue date extracted from invoice" },
      { signal: "billing_stripe_synced", value: "{{extracted}}", confidence: 98, because: "Issue date from Stripe" },
    ],
  },
  {
    key: "dueAt",
    label: "Due",
    entityType: "billing",
    fieldType: "date",
    careSignal: "billing_due_at",
    requiredForCapabilities: [],
    aiDescription: "Date payment is due",
    dbColumn: "due_at",
    fillRules: [
      { signal: "billing_invoice_parsed", value: "{{extracted}}", confidence: 92, because: "Due date extracted from invoice" },
      { signal: "billing_stripe_synced", value: "{{extracted}}", confidence: 98, because: "Due date from Stripe" },
    ],
  },
  {
    key: "paidAt",
    label: "Paid",
    entityType: "billing",
    fieldType: "date",
    careSignal: "billing_paid_at",
    requiredForCapabilities: [],
    aiDescription: "Date the record was fully paid; set by payment matching",
    dbColumn: "paid_at",
    writePolicy: "system_derived",
    fillRules: [
      { signal: "billing_amount_paid_covers_total", value: "{{extracted}}", confidence: 98, because: "Paid date from payment matching" },
      { signal: "billing_stripe_synced", value: "{{extracted}}", confidence: 98, because: "Paid date from Stripe" },
    ],
  },
  {
    key: "appUrl",
    label: "External Link",
    entityType: "billing",
    fieldType: "url",
    careSignal: "billing_app_url",
    requiredForCapabilities: [],
    aiDescription: "Link to view this invoice/bill in the external platform (Stripe, QuickBooks, etc.)",
    dbColumn: "app_url",
    writePolicy: "care_auto",
    // Artifact-first (Phase 7): the hosted invoice URL is sourced from the
    // attached link Resource (entity_links relation_type='attachment');
    // app_url is a projection of that artifact, not the source of truth.
    fillRules: [
      { signal: "billing_stripe_synced", value: "{{extracted}}", confidence: 100, because: "Stripe hosted invoice URL (attached as a Resource)" },
    ],
  },
  {
    key: "tags",
    label: "Tags",
    entityType: "billing",
    fieldType: "multi_select",
    writePolicy: "care_auto",
    careSignal: "billing_tags",
    requiredForCapabilities: [],
    aiDescription:
      "Workspace tags for this billing record (via entity_tag_assignments, not a column). Salt assigns existing tags when a fit clears the bar; coining a new tag is still gated by tag_auto_create_threshold and tag_max_ai_created in profile_playbook_settings",
    fillRules: [
      { signal: "billing_tag_fit_detected", value: "{{extracted}}", confidence: 80, because: "An existing tag clearly fits this billing record" },
    ],
  },
];

// ============================================================================
// FILE FIELDS (files)
// ============================================================================

export const FILE_FIELDS: FieldDescriptor<"resources">[] = [
  {
    key: "title",
    label: "Title",
    entityType: "resource",
    fieldType: "text",
    requiredForCapabilities: [],
    aiDescription: "Display name of the file",
    dbColumn: "file_name",
    writePolicy: "user_only",
  },
  {
    key: "kind",
    label: "Kind",
    entityType: "resource",
    fieldType: "select",
    vocabulary: "asset_kind",
    requiredForCapabilities: [],
    aiDescription: "Storage/media kind (document, link, photo, ...) — derived from the file's mime type; file_type only stores file-vs-link",
    isReadonly: true,
  },
  {
    key: "url",
    label: "URL",
    entityType: "resource",
    fieldType: "url",
    requiredForCapabilities: [],
    aiDescription: "External URL for link-kind files",
    dbColumn: "external_url",
    writePolicy: "user_only",
  },
  {
    key: "category",
    label: "Category",
    entityType: "resource",
    fieldType: "select",
    vocabulary: "file_category",
    careSignal: "file_category",
    requiredForCapabilities: [],
    aiDescription: "Business artifact category; AI extraction proposes it on ingest",
    dbColumn: "category",
    writePolicy: "care_auto",
    fillRules: [
      { signal: "file_category_inferred", value: "{{extracted}}", confidence: 85, because: "Category inferred from file content" },
    ],
  },
  {
    key: "documentType",
    label: "Document Type",
    entityType: "resource",
    fieldType: "select",
    vocabulary: "file_document_type",
    careSignal: "file_document_type",
    requiredForCapabilities: [],
    aiDescription: "Specific document type for document-kind files; AI extraction proposes it",
    dbColumn: "document_type",
    writePolicy: "care_auto",
    fillRules: [
      { signal: "file_document_type_inferred", value: "{{extracted}}", confidence: 85, because: "Document type inferred from content" },
    ],
  },
  {
    key: "description",
    label: "Description",
    entityType: "resource",
    fieldType: "text",
    careSignal: "file_description",
    requiredForCapabilities: [],
    aiDescription: "Short human description of what the file is",
    dbColumn: "description",
    fillRules: [
      { signal: "file_document_type_inferred", value: "{{extracted}}", confidence: 75, because: "Description generated from document analysis" },
    ],
  },
  {
    key: "lifecycleStatus",
    label: "Lifecycle",
    entityType: "resource",
    fieldType: "select",
    vocabulary: "file_lifecycle_status",
    careSignal: "file_lifecycle_status",
    requiredForCapabilities: [],
    aiDescription: "Signature/delivery lifecycle for signable documents",
    dbColumn: "lifecycle_status",
    writePolicy: "care_auto",
    fillRules: [
      { signal: "file_signature_event_sent", value: "sent", confidence: 95, because: "Document was sent for signature" },
      { signal: "file_signature_event_viewed", value: "viewed", confidence: 92, because: "Recipient viewed the document" },
      { signal: "file_signature_event_signed", value: "signed", confidence: 98, because: "Document was signed" },
      { signal: "file_signature_event_expired", value: "expired", confidence: 95, because: "Signature request expired" },
    ],
  },
  {
    key: "totalAmountCents",
    label: "Amount",
    entityType: "resource",
    fieldType: "money",
    careSignal: "file_total_amount",
    requiredForCapabilities: [],
    aiDescription: "Total amount extracted from financial documents, in cents",
    dbColumn: "total_amount_cents",
    writePolicy: "care_auto",
    fillRules: [
      { signal: "file_amount_extracted", value: "{{extracted}}", confidence: 90, because: "Amount extracted from financial document" },
    ],
  },
  {
    key: "currency",
    label: "Currency",
    entityType: "resource",
    fieldType: "select",
    vocabulary: "currency",
    requiredForCapabilities: [],
    aiDescription: "Currency for the extracted amount (ISO 4217)",
    dbColumn: "currency",
    formatRule: "Uppercase ISO 4217",
    fillRules: [
      { signal: "file_amount_extracted", value: "{{extracted}}", confidence: 90, because: "Currency detected from document amounts" },
    ],
  },
  {
    key: "dueDate",
    label: "Due Date",
    entityType: "resource",
    fieldType: "date",
    careSignal: "file_due_date",
    requiredForCapabilities: [],
    aiDescription: "Due date extracted from the document",
    dbColumn: "due_date",
    writePolicy: "care_auto",
    fillRules: [
      { signal: "file_date_extracted", value: "{{extracted}}", confidence: 88, because: "Due date extracted from document" },
    ],
  },
  {
    key: "expiryDate",
    label: "Expiry Date",
    entityType: "resource",
    fieldType: "date",
    careSignal: "file_expiry_date",
    requiredForCapabilities: [],
    aiDescription: "Expiration date extracted from the document",
    dbColumn: "expiry_date",
    writePolicy: "care_auto",
    fillRules: [
      { signal: "file_date_extracted", value: "{{extracted}}", confidence: 88, because: "Expiry date extracted from document" },
      { signal: "file_signature_event_expired", value: "{{extracted}}", confidence: 95, because: "Expiry from signature event" },
    ],
  },
  {
    key: "signedDate",
    label: "Signed Date",
    entityType: "resource",
    fieldType: "date",
    careSignal: "file_signed_date",
    requiredForCapabilities: [],
    aiDescription: "Date the document was signed",
    dbColumn: "signed_date",
    writePolicy: "care_auto",
    fillRules: [
      { signal: "file_signature_event_signed", value: "{{extracted}}", confidence: 98, because: "Signed date from signature event" },
    ],
  },
  {
    key: "followUpDate",
    label: "Follow-up Date",
    entityType: "resource",
    fieldType: "date",
    careSignal: "file_follow_up_date",
    requiredForCapabilities: [],
    aiDescription: "When to follow up about this document; Salt suggests, you decide",
    dbColumn: "follow_up_date",
    fillRules: [
      { signal: "file_date_extracted", value: "{{extracted}}", confidence: 75, because: "Follow-up date suggested based on document context" },
    ],
  },
  {
    key: "tags",
    label: "Tags",
    entityType: "resource",
    fieldType: "multi_select",
    writePolicy: "care_auto",
    careSignal: "resource_tags",
    requiredForCapabilities: [],
    aiDescription:
      "Workspace tags for this resource (via entity_tag_assignments, not a column). Salt assigns existing tags when a fit clears the bar; coining a new tag is still gated by tag_auto_create_threshold and tag_max_ai_created in profile_playbook_settings",
    fillRules: [
      { signal: "resource_tag_fit_detected", value: "{{extracted}}", confidence: 80, because: "An existing tag clearly fits this resource" },
    ],
  },
  {
    key: "sharedWithClient",
    label: "Shared with Client",
    entityType: "resource",
    fieldType: "boolean",
    requiredForCapabilities: [],
    aiDescription: "Whether the client can see this file",
    dbColumn: "shared_with_client",
    writePolicy: "user_only",
  },
  {
    key: "isOperatorAsset",
    label: "My Business Asset",
    entityType: "resource",
    fieldType: "boolean",
    requiredForCapabilities: [],
    aiDescription: "TRUE when the file belongs to the operator's own business (brand kit, templates — shown on the Me Files tab) rather than to a person/org/work record",
    dbColumn: "is_operator_asset",
    writePolicy: "user_only",
    emptyMeaning: "FALSE — a record's file, not the operator's own asset",
  },
];

// ============================================================================
// MEETING FIELDS (meetings)
// ============================================================================
//
// Artifact-first (Phase 7): recordings, transcripts, and linked notes are
// attached Resources (entity_links relation_type='attachment'), not fields.
// meeting_transcripts.recording_url is a read-compat projection of the
// attached recording Resource (see meetings/utils/recording-projection.ts).

export const MEETING_FIELDS: FieldDescriptor<"meetings">[] = [
  {
    key: "title",
    label: "Title",
    entityType: "meeting",
    fieldType: "text",
    requiredForCapabilities: [],
    aiDescription: "Meeting title as shown on the calendar",
    dbColumn: "title",
    writePolicy: "user_only",
  },
  {
    key: "meetingType",
    label: "Type",
    entityType: "meeting",
    fieldType: "select",
    vocabulary: "meeting_type",
    careSignal: "meeting_type",
    requiredForCapabilities: [],
    aiDescription: "Purpose of the meeting; inferable from title/agenda",
    dbColumn: "meeting_type",
    fillRules: [
      { signal: "meeting_type_inferred", value: "{{extracted}}", confidence: 80, because: "Meeting type inferred from title or description" },
    ],
  },
  {
    key: "status",
    label: "Status",
    entityType: "meeting",
    fieldType: "select",
    vocabulary: "meeting_status",
    careSignal: "meeting_status",
    requiredForCapabilities: [],
    aiDescription: "Scheduled/completed/cancelled/no-show; time passing implies completed",
    dbColumn: "status",
    writePolicy: "care_auto",
    fillRules: [
      { signal: "meeting_synced_from_calendar", value: "scheduled", confidence: 95, because: "Meeting synced from calendar" },
      { signal: "meeting_has_attendance_evidence", value: "completed", confidence: 90, because: "Evidence shows the meeting happened" },
      { signal: "meeting_end_passed", value: "completed", confidence: 85, because: "Meeting end time has passed" },
      { signal: "meeting_cancelled_by_calendar", value: "cancelled", confidence: 95, because: "Calendar event was cancelled" },
    ],
  },
  {
    key: "startTime",
    label: "Start",
    entityType: "meeting",
    fieldType: "datetime",
    requiredForCapabilities: [],
    aiDescription: "Start time; calendar sync owns it for external meetings",
    dbColumn: "start_time",
    writePolicy: "care_auto",
    fillRules: [
      { signal: "meeting_synced_from_calendar", value: "{{extracted}}", confidence: 98, because: "Start time from calendar sync" },
    ],
  },
  {
    key: "endTime",
    label: "End",
    entityType: "meeting",
    fieldType: "datetime",
    requiredForCapabilities: [],
    aiDescription: "End time; calendar sync owns it for external meetings",
    dbColumn: "end_time",
    writePolicy: "care_auto",
    fillRules: [
      { signal: "meeting_synced_from_calendar", value: "{{extracted}}", confidence: 98, because: "End time from calendar sync" },
    ],
  },
  {
    key: "locationType",
    label: "Location Type",
    entityType: "meeting",
    fieldType: "select",
    vocabulary: "meeting_location_type",
    requiredForCapabilities: [],
    aiDescription: "Medium the meeting happens over; calendar sync can set it",
    dbColumn: "location_type",
    writePolicy: "care_auto",
    fillRules: [
      { signal: "meeting_synced_from_calendar", value: "{{extracted}}", confidence: 90, because: "Location type inferred from calendar event" },
    ],
  },
  {
    key: "meetingUrl",
    label: "Meeting URL",
    entityType: "meeting",
    fieldType: "url",
    requiredForCapabilities: [],
    aiDescription: "Join link for video meetings; calendar sync can set it",
    dbColumn: "meeting_url",
    writePolicy: "care_auto",
    fillRules: [
      { signal: "meeting_synced_from_calendar", value: "{{extracted}}", confidence: 95, because: "Meeting URL from calendar event" },
    ],
  },
  {
    key: "address",
    label: "Address",
    entityType: "meeting",
    fieldType: "text",
    requiredForCapabilities: [],
    aiDescription: "Physical address for in-person meetings",
    dbColumn: "address",
    fillRules: [
      { signal: "meeting_synced_from_calendar", value: "{{extracted}}", confidence: 88, because: "Address from calendar event location" },
    ],
  },
  {
    key: "phoneNumber",
    label: "Phone Number",
    entityType: "meeting",
    fieldType: "phone",
    requiredForCapabilities: [],
    aiDescription: "Dial-in number for phone meetings",
    dbColumn: "phone_number",
    formatRule: "E.164 preferred; stored as entered",
    fillRules: [
      { signal: "meeting_synced_from_calendar", value: "{{extracted}}", confidence: 85, because: "Dial-in number from calendar event" },
    ],
  },
  {
    key: "description",
    label: "Description",
    entityType: "meeting",
    fieldType: "text",
    requiredForCapabilities: [],
    aiDescription: "Agenda or context for the meeting",
    dbColumn: "description",
    fillRules: [
      { signal: "meeting_synced_from_calendar", value: "{{extracted}}", confidence: 92, because: "Description from calendar event" },
    ],
  },
  {
    key: "notes",
    label: "Notes",
    entityType: "meeting",
    fieldType: "text",
    requiredForCapabilities: [],
    aiDescription: "Your private notes about the meeting",
    dbColumn: "notes",
    writePolicy: "user_only",
  },
  {
    key: "visibility",
    label: "Visibility",
    entityType: "meeting",
    fieldType: "select",
    requiredForCapabilities: [],
    aiDescription: "Who can see the meeting record",
    dbColumn: "visibility",
    writePolicy: "user_only",
  },
  {
    key: "attendees",
    label: "Attendees",
    entityType: "meeting",
    fieldType: "json",
    careSignal: "meeting_attendees",
    requiredForCapabilities: [],
    aiDescription: "Attendee list; calendar sync maintains it for external meetings",
    dbColumn: "attendees",
    writePolicy: "care_auto",
    fillRules: [
      { signal: "meeting_attendees_extracted", value: "{{extracted}}", confidence: 95, because: "Attendees from calendar event" },
    ],
  },
];

// ============================================================================
// ME FIELDS (profiles = operator identity, workspaces = business)
// The Me record is the operator's own profile: Salt never writes these
// directly — what Salt learns about the operator flows through
// operator_memory_facts and its confirm loop instead.
// ============================================================================

const ME_USER_ONLY = { writePolicy: "user_only" as const, requiredForCapabilities: [] };

export const ME_IDENTITY_FIELDS: FieldDescriptor<"profiles">[] = [
  { key: "preferredName", label: "Preferred Name", entityType: "me", fieldType: "text", aiDescription: "Name the operator goes by", dbColumn: "preferred_name", ...ME_USER_ONLY, fillRules: [
    { signal: "email_signoff_name_detected", value: "{{extracted}}", confidence: 90, because: "You consistently sign emails with this name" },
  ] },
  { key: "fullName", label: "Full Name", entityType: "me", fieldType: "text", aiDescription: "Operator's full legal/display name", dbColumn: "display_name", formatRule: "Also split into first_name/last_name; full_name is a generated column", ...ME_USER_ONLY, fillRules: [
    { signal: "linkedin_profile_scanned", value: "{{extracted}}", confidence: 88, because: "Full name from your LinkedIn profile" },
  ] },
  { key: "gender", label: "Gender", entityType: "me", fieldType: "select", aiDescription: "Optional gender", dbColumn: "gender", ...ME_USER_ONLY },
  { key: "roleTitle", label: "Role", entityType: "me", fieldType: "text", aiDescription: "What the operator calls their role", dbColumn: "role_title", ...ME_USER_ONLY, fillRules: [
    { signal: "operator_signature_has_title", value: "{{extracted}}", confidence: 88, because: "Title extracted from your outgoing email signature" },
    { signal: "linkedin_profile_scanned", value: "{{extracted}}", confidence: 85, because: "Title from your LinkedIn profile" },
  ] },
  { key: "phone", label: "Phone", entityType: "me", fieldType: "phone", aiDescription: "Operator's phone number", dbColumn: "phone", ...ME_USER_ONLY, fillRules: [
    { signal: "operator_phone_extracted", value: "{{extracted}}", confidence: 85, because: "Phone number from your email signature" },
  ] },
  { key: "timezone", label: "Timezone", entityType: "me", fieldType: "timezone", vocabulary: "timezone", aiDescription: "Operator's IANA timezone", dbColumn: "timezone", ...ME_USER_ONLY, fillRules: [
    { signal: "calendar_timezone_detected", value: "{{extracted}}", confidence: 95, because: "Calendar consistently shows this timezone" },
  ] },
  { key: "workingHours", label: "Working Hours", entityType: "me", fieldType: "text", aiDescription: "Typical working hours", dbColumn: "working_hours", ...ME_USER_ONLY },
  { key: "location", label: "Location", entityType: "me", fieldType: "text", aiDescription: "Where the operator is based", dbColumn: "location", ...ME_USER_ONLY, fillRules: [
    { signal: "timezone_location_inferred", value: "{{extracted}}", confidence: 75, because: "Location inferred from your timezone" },
    { signal: "linkedin_profile_scanned", value: "{{extracted}}", confidence: 82, because: "Location from your LinkedIn profile" },
  ] },
  { key: "addressLine1", label: "Street Address", entityType: "me", fieldType: "text", aiDescription: "Operator address line 1", dbColumn: "address_line_1", ...ME_USER_ONLY, fillRules: [
    { signal: "operator_address_extracted", value: "{{extracted}}", confidence: 80, because: "Address extracted from your documents" },
  ] },
  { key: "addressLine2", label: "Address Line 2", entityType: "me", fieldType: "text", aiDescription: "Operator address line 2", dbColumn: "address_line_2", ...ME_USER_ONLY, fillRules: [
    { signal: "operator_address_extracted", value: "{{extracted}}", confidence: 80, because: "Address line 2 from documents" },
  ] },
  { key: "city", label: "City", entityType: "me", fieldType: "text", aiDescription: "Operator city", dbColumn: "city", ...ME_USER_ONLY, fillRules: [
    { signal: "operator_address_extracted", value: "{{extracted}}", confidence: 80, because: "City extracted from documents" },
  ] },
  { key: "state", label: "State/Province", entityType: "me", fieldType: "text", aiDescription: "Operator state or province", dbColumn: "state", ...ME_USER_ONLY, fillRules: [
    { signal: "operator_address_extracted", value: "{{extracted}}", confidence: 80, because: "State extracted from documents" },
  ] },
  { key: "postalCode", label: "Postal Code", entityType: "me", fieldType: "text", aiDescription: "Operator postal code", dbColumn: "postal_code", ...ME_USER_ONLY, fillRules: [
    { signal: "operator_address_extracted", value: "{{extracted}}", confidence: 80, because: "Postal code extracted from documents" },
  ] },
  { key: "country", label: "Country", entityType: "me", fieldType: "country", vocabulary: "country", aiDescription: "Operator country", dbColumn: "country", ...ME_USER_ONLY, fillRules: [
    { signal: "operator_address_extracted", value: "{{extracted}}", confidence: 80, because: "Country extracted from documents" },
    { signal: "timezone_location_inferred", value: "{{extracted}}", confidence: 70, because: "Country inferred from timezone" },
  ] },
  { key: "professionalCredentials", label: "Credentials", entityType: "me", fieldType: "text", aiDescription: "Professional credentials or certifications", dbColumn: "professional_credentials", ...ME_USER_ONLY, fillRules: [
    { signal: "linkedin_profile_scanned", value: "{{extracted}}", confidence: 78, because: "Credentials from your LinkedIn profile" },
  ] },
  { key: "email", label: "Email", entityType: "me", fieldType: "email", aiDescription: "Auth email (read-only)", dbColumn: "email", isReadonly: true, requiredForCapabilities: [] },
];

export const ME_BUSINESS_FIELDS: FieldDescriptor<"workspaces">[] = [
  { key: "name", label: "Business Name", entityType: "me", fieldType: "text", aiDescription: "Workspace/business display name", dbColumn: "name", ...ME_USER_ONLY },
  { key: "tagline", label: "Tagline", entityType: "me", fieldType: "text", aiDescription: "One-line business description", dbColumn: "tagline", ...ME_USER_ONLY, fillRules: [
    { signal: "operator_bio_extracted", value: "{{extracted}}", confidence: 80, because: "Tagline extracted from your social or website bio" },
  ] },
  { key: "websiteUrl", label: "Website", entityType: "me", fieldType: "url", aiDescription: "Business website", dbColumn: "website_url", ...ME_USER_ONLY, fillRules: [
    { signal: "workspace_website_found", value: "{{extracted}}", confidence: 88, because: "Business website discovered from email or social" },
  ] },
  { key: "industry", label: "Industry", entityType: "me", fieldType: "text", aiDescription: "Industry the business operates in", dbColumn: "industry", ...ME_USER_ONLY, fillRules: [
    { signal: "invoice_industry_pattern", value: "{{extracted}}", confidence: 82, because: "Industry inferred from invoice descriptions and client types" },
    { signal: "linkedin_industry_detected", value: "{{extracted}}", confidence: 85, because: "Industry from your LinkedIn profile" },
  ] },
  { key: "legalBusinessName", label: "Legal Business Name", entityType: "me", fieldType: "text", aiDescription: "Registered legal name for contracts and invoices", dbColumn: "legal_business_name", formatRule: "Exact registered name", ...ME_USER_ONLY, fillRules: [
    { signal: "workspace_legal_name_extracted", value: "{{extracted}}", confidence: 88, because: "Legal business name from your documents" },
  ] },
  { key: "businessType", label: "Business Type", entityType: "me", fieldType: "select", vocabulary: "business_type", aiDescription: "Legal structure", dbColumn: "business_type", ...ME_USER_ONLY, fillRules: [
    { signal: "invoice_business_type_pattern", value: "{{extracted}}", confidence: 80, because: "Business type inferred from invoice patterns (freelancer vs agency)" },
  ] },
  { key: "businessPhone", label: "Business Phone", entityType: "me", fieldType: "phone", aiDescription: "Business phone number", dbColumn: "business_phone", ...ME_USER_ONLY, fillRules: [
    { signal: "operator_phone_extracted", value: "{{extracted}}", confidence: 82, because: "Business phone from your email signature" },
  ] },
  { key: "businessEmail", label: "Business Email", entityType: "me", fieldType: "email", aiDescription: "Business contact email", dbColumn: "business_email", ...ME_USER_ONLY },
  { key: "location", label: "Business Location", entityType: "me", fieldType: "text", aiDescription: "Where the business operates from", dbColumn: "location", ...ME_USER_ONLY, fillRules: [
    { signal: "timezone_location_inferred", value: "{{extracted}}", confidence: 72, because: "Location inferred from your timezone" },
  ] },
  { key: "taxIdType", label: "Tax ID Type", entityType: "me", fieldType: "text", aiDescription: "Type of tax identifier (EIN, VAT, ...)", dbColumn: "tax_id_type", ...ME_USER_ONLY },
  { key: "taxIdLast4", label: "Tax ID (last 4)", entityType: "me", fieldType: "text", aiDescription: "Last four characters of the tax ID", dbColumn: "tax_id_last4", formatRule: "Max 4 characters; never store the full ID", ...ME_USER_ONLY },
  { key: "defaultCurrency", label: "Default Currency", entityType: "me", fieldType: "select", vocabulary: "currency", aiDescription: "Default currency for new work and billing", dbColumn: "default_currency", formatRule: "Uppercase ISO 4217", ...ME_USER_ONLY },
  { key: "paymentTerms", label: "Default Payment Terms", entityType: "me", fieldType: "select", vocabulary: "payment_terms", aiDescription: "Default payment terms for new invoices", dbColumn: "payment_terms", ...ME_USER_ONLY },
  { key: "legalAddressLine1", label: "Legal Address", entityType: "me", fieldType: "text", aiDescription: "Legal address line 1", dbColumn: "legal_address_line_1", ...ME_USER_ONLY, fillRules: [
    { signal: "operator_address_extracted", value: "{{extracted}}", confidence: 78, because: "Legal address from your business documents" },
  ] },
  { key: "legalAddressLine2", label: "Legal Address Line 2", entityType: "me", fieldType: "text", aiDescription: "Legal address line 2", dbColumn: "legal_address_line_2", ...ME_USER_ONLY, fillRules: [
    { signal: "operator_address_extracted", value: "{{extracted}}", confidence: 78, because: "Legal address line 2 from documents" },
  ] },
  { key: "legalCity", label: "Legal City", entityType: "me", fieldType: "text", aiDescription: "Legal address city", dbColumn: "legal_city", ...ME_USER_ONLY, fillRules: [
    { signal: "operator_address_extracted", value: "{{extracted}}", confidence: 78, because: "Legal city from documents" },
  ] },
  { key: "legalState", label: "Legal State", entityType: "me", fieldType: "text", aiDescription: "Legal address state/province", dbColumn: "legal_state", ...ME_USER_ONLY, fillRules: [
    { signal: "operator_address_extracted", value: "{{extracted}}", confidence: 78, because: "Legal state from documents" },
  ] },
  { key: "legalPostalCode", label: "Legal Postal Code", entityType: "me", fieldType: "text", aiDescription: "Legal address postal code", dbColumn: "legal_postal_code", ...ME_USER_ONLY, fillRules: [
    { signal: "operator_address_extracted", value: "{{extracted}}", confidence: 78, because: "Legal postal code from documents" },
  ] },
  { key: "legalCountry", label: "Legal Country", entityType: "me", fieldType: "country", vocabulary: "country", aiDescription: "Legal address country", dbColumn: "legal_country", ...ME_USER_ONLY, fillRules: [
    { signal: "operator_address_extracted", value: "{{extracted}}", confidence: 78, because: "Legal country from documents" },
  ] },
];

// ============================================================================
// FIELD REGISTRY (All fields in one lookup)
// ============================================================================

/**
 * Every contract field across all seven memory types. Me spans two tables
 * (profiles + workspaces); its keys are disambiguated in the lookup with a
 * `business.` prefix for workspace fields (the two sets share keys like
 * `location`).
 */
export const ALL_CONTRACT_FIELDS: FieldDescriptor[] = [
  ...PERSON_FIELDS,
  ...ORG_FIELDS,
  ...WORK_FIELDS,
  ...BILLING_FIELDS,
  ...FILE_FIELDS,
  ...MEETING_FIELDS,
  ...ME_IDENTITY_FIELDS,
  ...ME_BUSINESS_FIELDS,
];

export const FIELD_REGISTRY: Record<string, FieldDescriptor> = {};

for (const field of [
  ...PERSON_FIELDS,
  ...ORG_FIELDS,
  ...WORK_FIELDS,
  ...BILLING_FIELDS,
  ...FILE_FIELDS,
  ...MEETING_FIELDS,
  ...ME_IDENTITY_FIELDS,
]) {
  FIELD_REGISTRY[`${field.entityType}:${field.key}`] = field;
}
for (const field of ME_BUSINESS_FIELDS) {
  FIELD_REGISTRY[`${field.entityType}:business.${field.key}`] = field;
}

// ============================================================================
// LOOKUP HELPERS
// ============================================================================

export function getFieldDescriptor(
  entityType: ContractEntityType,
  fieldKey: string
): FieldDescriptor | undefined {
  return FIELD_REGISTRY[`${entityType}:${fieldKey}`];
}

export function getFieldsForEntity(
  entityType: ContractEntityType
): FieldDescriptor[] {
  return ALL_CONTRACT_FIELDS.filter(
    (f) => f.entityType === entityType || f.entityType === "all"
  );
}

export function getFieldsForCapability(
  capabilityId: CapabilityId
): FieldDescriptor[] {
  return ALL_CONTRACT_FIELDS.filter((f) =>
    f.requiredForCapabilities.includes(capabilityId)
  );
}

export function getVocabularyControlledFields(): FieldDescriptor[] {
  return ALL_CONTRACT_FIELDS.filter((f) => f.vocabulary);
}

export function isVocabularyField(
  entityType: ContractEntityType,
  fieldKey: string
): boolean {
  const field = getFieldDescriptor(entityType, fieldKey);
  return !!field?.vocabulary;
}

export function getCareSignals(): Array<{ signal: string; field: FieldDescriptor }> {
  return ALL_CONTRACT_FIELDS.filter((f) => f.careSignal).map((f) => ({
    signal: f.careSignal!,
    field: f,
  }));
}
