/**
 * Field Registry
 *
 * Maps every profile field (including post-taxonomy readiness fields) to:
 * - entityType: which entity this field applies to
 * - fieldType: the data type (text, email, select, money, date, etc.)
 * - vocabulary: if controlled, which vocabulary validates it
 * - keeperSignal: the signal key the keeper uses to infer this field
 * - requiredForCapabilities: which capabilities need this field filled
 *
 * This registry is consumed by:
 * - Keeper playbooks (to know which fields to fill for each capability)
 * - Capability readiness (to validate vocabulary values)
 * - Field editors (to render appropriate input controls)
 */

import type { CapabilityId, CapabilityEntityType } from "../capabilities/types";
import type { Database } from "@/app/_lib/supabase/database.types";

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
export type ContractEntityType = CapabilityEntityType | "file" | "meeting" | "me";

/**
 * Who may write a field, per the field-contract canon
 * (brand-identity/product-internal/features/keeper-field-contracts.md):
 * - keeper_auto:     Keeper applies directly when a rule clears its confidence
 *                    threshold; provenance recorded, undo available.
 * - keeper_ask:      Keeper proposes; the change waits for approval as a play
 *                    card. Default for anything not explicitly decided.
 * - user_only:       Salt never writes it, even with high confidence.
 * - system_derived:  Computed from inputs (health scores, readiness, badges).
 *                    Keeper writes the inputs, never the value.
 */
export type WritePolicy =
  | "keeper_auto"
  | "keeper_ask"
  | "user_only"
  | "system_derived";

/**
 * `dbColumn` is typed against the generated Supabase Row for the entity's
 * backing table, so a renamed or deleted column fails `tsc` at the
 * declaration site — the registry cannot silently drift from schema.
 */
export interface FieldDescriptor<TTable extends TableName = TableName> {
  key: string;
  label: string;
  entityType: ContractEntityType | "all";
  fieldType: FieldType;
  vocabulary?: string;
  keeperSignal?: string;
  requiredForCapabilities: CapabilityId[];
  aiDescription: string;
  dbColumn?: ColumnOf<TTable>;
  isReadonly?: boolean;
  /** Omitted = keeper_ask (conservative default); isReadonly implies system_derived. */
  writePolicy?: WritePolicy;
  /** Format constraint readable by humans and AI (e.g. "E.164", "lowercase", "ISO 4217 uppercase"). */
  formatRule?: string;
  /** What a blank value asserts (e.g. "unknown" vs "explicitly none"). */
  emptyMeaning?: string;
  /** Whether this field participates in duplicate/identity resolution. */
  dedupeRole?: "primary" | "supporting";
}

/** Resolve the effective write policy with the canon defaults. */
export function getWritePolicy(field: FieldDescriptor): WritePolicy {
  if (field.writePolicy) return field.writePolicy;
  return field.isReadonly ? "system_derived" : "keeper_ask";
}

// ============================================================================
// PERSON FIELDS
// ============================================================================

export const PERSON_FIELDS: FieldDescriptor<"people">[] = [
  {
    key: "name",
    label: "Name",
    entityType: "person",
    fieldType: "text",
    keeperSignal: "person_name",
    requiredForCapabilities: ["invoicing"],
    aiDescription: "Full display name of the person",
    dbColumn: "name",
  },
  {
    key: "email",
    label: "Email",
    entityType: "person",
    fieldType: "email",
    keeperSignal: "person_email",
    requiredForCapabilities: ["email_follow_up", "scheduling"],
    aiDescription: "Primary email address for contact",
    dbColumn: "email",
    // Email participates in identity resolution: an exact match means the
    // same person (Keeper proposes a merge — never auto-merges).
    dedupeRole: "primary",
  },
  {
    key: "billingEmail",
    label: "Billing Email",
    entityType: "person",
    fieldType: "email",
    keeperSignal: "person_billing_email",
    requiredForCapabilities: ["invoicing"],
    aiDescription: "Email address for invoices and billing communications",
    dbColumn: "billing_email",
  },
  {
    key: "phone",
    label: "Phone",
    entityType: "person",
    fieldType: "phone",
    keeperSignal: "person_phone",
    requiredForCapabilities: [],
    aiDescription: "Phone number for contact",
    dbColumn: "phone",
  },
  {
    key: "timezone",
    label: "Timezone",
    entityType: "person",
    fieldType: "timezone",
    vocabulary: "timezone",
    keeperSignal: "person_timezone",
    requiredForCapabilities: ["scheduling"],
    aiDescription: "IANA timezone for scheduling meetings",
    dbColumn: "timezone",
  },
  {
    key: "title",
    label: "Title",
    entityType: "person",
    fieldType: "text",
    keeperSignal: "person_title",
    requiredForCapabilities: [],
    aiDescription: "Job title or role at their organization",
    dbColumn: "title",
  },
  {
    key: "relationshipType",
    label: "Relationship",
    entityType: "person",
    fieldType: "select",
    vocabulary: "relationship_type",
    keeperSignal: "person_relationship_type",
    requiredForCapabilities: [],
    aiDescription: "How this person relates to your business",
    dbColumn: "relationship_type",
  },
  {
    key: "addressLine1",
    label: "Street Address",
    entityType: "person",
    fieldType: "text",
    keeperSignal: "person_address_line1",
    requiredForCapabilities: ["invoicing"],
    aiDescription: "Street address line 1",
    dbColumn: "address_line_1",
  },
  {
    key: "addressLine2",
    label: "Address Line 2",
    entityType: "person",
    fieldType: "text",
    keeperSignal: "person_address_line2",
    requiredForCapabilities: [],
    aiDescription: "Street address line 2 (apt, suite, etc.)",
    dbColumn: "address_line_2",
  },
  {
    key: "city",
    label: "City",
    entityType: "person",
    fieldType: "text",
    keeperSignal: "person_city",
    requiredForCapabilities: ["invoicing"],
    aiDescription: "City name",
    dbColumn: "city",
  },
  {
    key: "state",
    label: "State/Province",
    entityType: "person",
    fieldType: "text",
    keeperSignal: "person_state",
    requiredForCapabilities: [],
    aiDescription: "State or province",
    dbColumn: "state",
  },
  {
    key: "postalCode",
    label: "Postal Code",
    entityType: "person",
    fieldType: "text",
    keeperSignal: "person_postal_code",
    requiredForCapabilities: ["invoicing"],
    aiDescription: "ZIP or postal code",
    dbColumn: "postal_code",
  },
  {
    key: "country",
    label: "Country",
    entityType: "person",
    fieldType: "country",
    vocabulary: "country",
    keeperSignal: "person_country",
    requiredForCapabilities: ["invoicing"],
    aiDescription: "Country (ISO 3166-1 alpha-2)",
    dbColumn: "country",
  },
  {
    key: "recordStatus",
    label: "Record Status",
    entityType: "person",
    fieldType: "select",
    vocabulary: "record_status",
    keeperSignal: "person_record_status",
    requiredForCapabilities: [],
    aiDescription:
      "Whether the relationship is live. Keeper derives it from 90-day activity signals but never overrides a manual choice",
    dbColumn: "record_status",
    writePolicy: "keeper_auto",
    emptyMeaning: "Defaults to active; a NULL source means no one has explicitly set it",
  },
];

// ============================================================================
// ORG FIELDS
// ============================================================================

export const ORG_FIELDS: FieldDescriptor<"organizations">[] = [
  {
    key: "name",
    label: "Name",
    entityType: "org",
    fieldType: "text",
    keeperSignal: "org_name",
    requiredForCapabilities: ["invoicing", "proposals_contracts"],
    aiDescription: "Organization display name",
    dbColumn: "name",
  },
  {
    key: "billingEmail",
    label: "Billing Email",
    entityType: "org",
    fieldType: "email",
    keeperSignal: "org_billing_email",
    requiredForCapabilities: ["invoicing"],
    aiDescription: "Email address for invoices and billing communications",
    dbColumn: "billing_email",
  },
  {
    key: "industryParent",
    label: "Industry",
    entityType: "org",
    fieldType: "select",
    vocabulary: "industry_parent",
    keeperSignal: "org_industry_parent",
    requiredForCapabilities: [],
    aiDescription: "Primary industry category",
    dbColumn: "industry_parent",
  },
  {
    key: "industryChild",
    label: "Industry Sub-category",
    entityType: "org",
    fieldType: "select",
    vocabulary: "industry_child",
    keeperSignal: "org_industry_child",
    requiredForCapabilities: [],
    aiDescription: "Industry sub-category (depends on parent)",
    dbColumn: "industry_child",
  },
  {
    key: "relationshipType",
    label: "Relationship",
    entityType: "org",
    fieldType: "select",
    vocabulary: "relationship_type",
    keeperSignal: "org_relationship_type",
    requiredForCapabilities: [],
    aiDescription: "How this organization relates to your business",
    dbColumn: "relationship_status",
  },
  {
    key: "primaryContact",
    label: "Primary Contact",
    entityType: "org",
    fieldType: "reference",
    keeperSignal: "org_primary_contact",
    requiredForCapabilities: [],
    aiDescription: "Main person to contact at this organization",
    // No column on organizations — the key contact is the organization_people
    // row flagged is_primary; writes go through that join table.
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
    keeperSignal: "org_address_line1",
    requiredForCapabilities: ["invoicing", "proposals_contracts"],
    aiDescription: "Street address line 1",
    dbColumn: "address_line_1",
  },
  {
    key: "addressLine2",
    label: "Address Line 2",
    entityType: "org",
    fieldType: "text",
    keeperSignal: "org_address_line2",
    requiredForCapabilities: [],
    aiDescription: "Street address line 2 (apt, suite, etc.)",
    dbColumn: "address_line_2",
  },
  {
    key: "city",
    label: "City",
    entityType: "org",
    fieldType: "text",
    keeperSignal: "org_city",
    requiredForCapabilities: ["invoicing", "proposals_contracts"],
    aiDescription: "City name",
    dbColumn: "city",
  },
  {
    key: "state",
    label: "State/Province",
    entityType: "org",
    fieldType: "text",
    keeperSignal: "org_state",
    requiredForCapabilities: [],
    aiDescription: "State or province",
    dbColumn: "state",
  },
  {
    key: "postalCode",
    label: "Postal Code",
    entityType: "org",
    fieldType: "text",
    keeperSignal: "org_postal_code",
    requiredForCapabilities: ["invoicing", "proposals_contracts"],
    aiDescription: "ZIP or postal code",
    dbColumn: "postal_code",
  },
  {
    key: "country",
    label: "Country",
    entityType: "org",
    fieldType: "country",
    vocabulary: "country",
    keeperSignal: "org_country",
    requiredForCapabilities: ["invoicing", "proposals_contracts"],
    aiDescription: "Country (ISO 3166-1 alpha-2)",
    dbColumn: "country",
  },
  {
    key: "taxId",
    label: "Tax ID",
    entityType: "org",
    fieldType: "text",
    keeperSignal: "org_tax_id",
    requiredForCapabilities: ["invoicing"],
    aiDescription: "Tax identification number (VAT, EIN, etc.)",
    dbColumn: "tax_id",
  },
  {
    key: "website",
    label: "Website",
    entityType: "org",
    fieldType: "url",
    keeperSignal: "org_website",
    requiredForCapabilities: [],
    aiDescription: "Company website URL",
    dbColumn: "website",
  },
  {
    key: "recordStatus",
    label: "Record Status",
    entityType: "org",
    fieldType: "select",
    vocabulary: "record_status",
    keeperSignal: "org_record_status",
    requiredForCapabilities: [],
    aiDescription:
      "Whether the relationship is live, aggregated across the org's linked people, work, and billing. Keeper never overrides a manual choice",
    dbColumn: "record_status",
    writePolicy: "keeper_auto",
    emptyMeaning: "Defaults to active; a NULL source means no one has explicitly set it",
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
    keeperSignal: "work_name",
    requiredForCapabilities: [],
    aiDescription: "Display name for this work item",
    dbColumn: "name",
  },
  {
    key: "status",
    label: "Status",
    entityType: "work",
    fieldType: "select",
    vocabulary: "work_status",
    keeperSignal: "work_status",
    requiredForCapabilities: [],
    aiDescription: "Current lifecycle state (active, stalled, completed, etc.)",
    dbColumn: "status",
  },
  {
    key: "workType",
    label: "Type",
    entityType: "work",
    fieldType: "select",
    vocabulary: "work_type",
    keeperSignal: "work_type",
    requiredForCapabilities: [],
    aiDescription: "Engagement model (project, retainer, hourly, etc.)",
    dbColumn: "work_type",
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
    keeperSignal: "work_stage",
    requiredForCapabilities: [],
    aiDescription: "Pipeline stage within the work type",
    dbColumn: "stage",
  },
  {
    key: "serviceId",
    label: "Service",
    entityType: "work",
    fieldType: "reference",
    keeperSignal: "work_service_id",
    requiredForCapabilities: ["proposals_contracts"],
    aiDescription: "Linked service from the service catalog",
    dbColumn: "service_id",
  },
  {
    key: "billingContactId",
    label: "Billing Contact",
    entityType: "work",
    fieldType: "reference",
    keeperSignal: "work_billing_contact_id",
    requiredForCapabilities: ["invoicing", "retainer_renewals"],
    aiDescription: "Person responsible for receiving invoices",
    dbColumn: "billing_contact_id",
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
    keeperSignal: "work_contract_value",
    requiredForCapabilities: [],
    aiDescription: "Total contract value in cents",
    dbColumn: "contract_value_cents",
  },
  {
    key: "finalPriceCents",
    label: "Final Price",
    entityType: "work",
    fieldType: "money",
    keeperSignal: "work_final_price",
    requiredForCapabilities: [],
    aiDescription: "Final price after discounts in cents",
    dbColumn: "final_price_cents",
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
    keeperSignal: "work_scope_items",
    requiredForCapabilities: [],
    aiDescription: "Array of scope line items with descriptions and amounts",
    dbColumn: "scope_items",
  },
  {
    key: "currency",
    label: "Currency",
    entityType: "work",
    fieldType: "select",
    vocabulary: "currency",
    keeperSignal: "work_currency",
    requiredForCapabilities: ["invoicing"],
    aiDescription: "Currency for all monetary values (ISO 4217)",
    dbColumn: "currency",
  },
  {
    key: "paymentTerms",
    label: "Payment Terms",
    entityType: "work",
    fieldType: "select",
    vocabulary: "payment_terms",
    keeperSignal: "work_payment_terms",
    requiredForCapabilities: ["invoicing"],
    aiDescription: "When payment is due after invoicing",
    dbColumn: "payment_terms",
  },
  {
    key: "paymentType",
    label: "Payment Type",
    entityType: "work",
    fieldType: "select",
    keeperSignal: "work_payment_type",
    requiredForCapabilities: [],
    aiDescription: "How payment is structured (fixed, hourly, milestone, retainer)",
    dbColumn: "payment_type",
  },
  {
    key: "hourlyRateCents",
    label: "Hourly Rate",
    entityType: "work",
    fieldType: "money",
    keeperSignal: "work_hourly_rate",
    requiredForCapabilities: [],
    aiDescription: "Hourly rate in cents (for hourly work)",
    dbColumn: "hourly_rate_cents",
  },
  {
    key: "hoursEstimate",
    label: "Hours Estimate",
    entityType: "work",
    fieldType: "number",
    keeperSignal: "work_hours_estimate",
    requiredForCapabilities: [],
    aiDescription: "Estimated hours for the work",
    dbColumn: "hours_estimate",
  },
  {
    key: "retainerMrrCents",
    label: "Retainer MRR",
    entityType: "work",
    fieldType: "money",
    keeperSignal: "work_retainer_mrr",
    requiredForCapabilities: ["retainer_renewals"],
    aiDescription: "Monthly recurring revenue for retainer in cents",
    dbColumn: "retainer_mrr_cents",
  },
  {
    key: "renewalDate",
    label: "Renewal Date",
    entityType: "work",
    fieldType: "date",
    keeperSignal: "work_renewal_date",
    requiredForCapabilities: ["retainer_renewals"],
    aiDescription: "Date when retainer comes up for renewal",
    dbColumn: "renewal_date",
  },
  {
    key: "billingCycle",
    label: "Billing Cycle",
    entityType: "work",
    fieldType: "select",
    vocabulary: "billing_cycle",
    keeperSignal: "work_billing_cycle",
    requiredForCapabilities: ["retainer_renewals"],
    aiDescription: "How often billing occurs",
    dbColumn: "billing_cycle",
  },
  {
    key: "decisionDate",
    label: "Decision Date",
    entityType: "work",
    fieldType: "date",
    keeperSignal: "work_decision_date",
    requiredForCapabilities: ["proposals_contracts"],
    aiDescription: "Expected date for client decision on proposal",
    dbColumn: "decision_date",
  },
  {
    key: "startDate",
    label: "Start Date",
    entityType: "work",
    fieldType: "date",
    keeperSignal: "work_start_date",
    requiredForCapabilities: [],
    aiDescription: "When work begins",
    dbColumn: "start_date",
  },
  {
    key: "deadline",
    label: "Deadline",
    entityType: "work",
    fieldType: "date",
    keeperSignal: "work_deadline",
    requiredForCapabilities: [],
    aiDescription: "Target completion date",
    dbColumn: "deadline",
  },
  {
    key: "poNumber",
    label: "PO Number",
    entityType: "work",
    fieldType: "text",
    keeperSignal: "work_po_number",
    requiredForCapabilities: [],
    aiDescription: "Client purchase order number for invoicing",
    dbColumn: "po_number",
  },
  {
    key: "estimatedTimeline",
    label: "Estimated Timeline",
    entityType: "work",
    fieldType: "text",
    keeperSignal: "work_estimated_timeline",
    requiredForCapabilities: [],
    aiDescription: "Human-readable timeline estimate",
    dbColumn: "estimated_timeline",
  },
  {
    key: "discountPercent",
    label: "Discount %",
    entityType: "work",
    fieldType: "percent",
    keeperSignal: "work_discount_percent",
    requiredForCapabilities: [],
    aiDescription: "Percentage discount applied",
    dbColumn: "discount_percent",
  },
  {
    key: "discountAmountCents",
    label: "Discount Amount",
    entityType: "work",
    fieldType: "money",
    keeperSignal: "work_discount_amount",
    requiredForCapabilities: [],
    aiDescription: "Fixed discount amount in cents",
    dbColumn: "discount_amount_cents",
  },
  {
    key: "discountReason",
    label: "Discount Reason",
    entityType: "work",
    fieldType: "text",
    keeperSignal: "work_discount_reason",
    requiredForCapabilities: [],
    aiDescription: "Reason for applying discount",
    dbColumn: "discount_reason",
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
    keeperSignal: "billing_number",
    requiredForCapabilities: [],
    aiDescription: "Invoice or bill number as issued",
    dbColumn: "number",
    dedupeRole: "primary",
    formatRule: "Exactly as printed on the document; no normalization",
  },
  {
    key: "status",
    label: "Status",
    entityType: "billing",
    fieldType: "select",
    vocabulary: "billing_status",
    keeperSignal: "billing_status",
    requiredForCapabilities: [],
    aiDescription: "Payment state; paid/partial transitions come from payment matching",
    dbColumn: "status",
    writePolicy: "keeper_auto",
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
    keeperSignal: "billing_category",
    requiredForCapabilities: [],
    aiDescription: "Spend category for payables",
    dbColumn: "category",
  },
  {
    key: "organization",
    label: "Organization",
    entityType: "billing",
    fieldType: "reference",
    keeperSignal: "billing_organization",
    requiredForCapabilities: [],
    aiDescription: "Counterparty organization for this record",
    dbColumn: "organization_id",
  },
  {
    key: "billingContact",
    label: "Billing Contact",
    entityType: "billing",
    fieldType: "reference",
    keeperSignal: "billing_person",
    requiredForCapabilities: [],
    aiDescription: "Counterparty person for this record",
    dbColumn: "person_id",
  },
  {
    key: "linkedWork",
    label: "Linked Work",
    entityType: "billing",
    fieldType: "reference",
    keeperSignal: "billing_project",
    requiredForCapabilities: [],
    aiDescription: "Work item this billing record belongs to",
    dbColumn: "work_id",
  },
  {
    key: "vendorLabel",
    label: "Vendor",
    entityType: "billing",
    fieldType: "text",
    keeperSignal: "billing_vendor_label",
    requiredForCapabilities: [],
    aiDescription: "Free-text counterparty label when no org/person record is linked",
    dbColumn: "vendor_label",
  },
  {
    key: "amountCents",
    label: "Amount",
    entityType: "billing",
    fieldType: "money",
    keeperSignal: "billing_amount",
    requiredForCapabilities: [],
    aiDescription: "Total amount in cents",
    dbColumn: "amount_cents",
    formatRule: "Integer cents in the record's currency",
  },
  {
    key: "amountPaidCents",
    label: "Amount Paid",
    entityType: "billing",
    fieldType: "money",
    keeperSignal: "billing_amount_paid",
    requiredForCapabilities: [],
    aiDescription: "Amount received so far in cents; maintained by payment matching",
    dbColumn: "amount_paid_cents",
    writePolicy: "keeper_auto",
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
  },
  {
    key: "issuedAt",
    label: "Issued",
    entityType: "billing",
    fieldType: "date",
    keeperSignal: "billing_issued_at",
    requiredForCapabilities: [],
    aiDescription: "Date the invoice/bill was issued",
    dbColumn: "issued_at",
  },
  {
    key: "dueAt",
    label: "Due",
    entityType: "billing",
    fieldType: "date",
    keeperSignal: "billing_due_at",
    requiredForCapabilities: [],
    aiDescription: "Date payment is due",
    dbColumn: "due_at",
  },
  {
    key: "paidAt",
    label: "Paid",
    entityType: "billing",
    fieldType: "date",
    keeperSignal: "billing_paid_at",
    requiredForCapabilities: [],
    aiDescription: "Date the record was fully paid; set by payment matching",
    dbColumn: "paid_at",
    writePolicy: "keeper_auto",
  },
];

// ============================================================================
// FILE FIELDS (files)
// ============================================================================

export const FILE_FIELDS: FieldDescriptor<"files">[] = [
  {
    key: "title",
    label: "Title",
    entityType: "file",
    fieldType: "text",
    requiredForCapabilities: [],
    aiDescription: "Display name of the file",
    dbColumn: "file_name",
    writePolicy: "user_only",
  },
  {
    key: "kind",
    label: "Kind",
    entityType: "file",
    fieldType: "select",
    vocabulary: "asset_kind",
    requiredForCapabilities: [],
    aiDescription:
      "Storage/media kind (document, link, photo, ...) — derived from the file's mime type; file_type only stores file-vs-link",
    isReadonly: true,
  },
  {
    key: "url",
    label: "URL",
    entityType: "file",
    fieldType: "url",
    requiredForCapabilities: [],
    aiDescription: "External URL for link-kind files",
    dbColumn: "external_url",
    writePolicy: "user_only",
  },
  {
    key: "category",
    label: "Category",
    entityType: "file",
    fieldType: "select",
    vocabulary: "file_category",
    keeperSignal: "file_category",
    requiredForCapabilities: [],
    aiDescription: "Business artifact category; AI extraction proposes it on ingest",
    dbColumn: "category",
    writePolicy: "keeper_auto",
  },
  {
    key: "documentType",
    label: "Document Type",
    entityType: "file",
    fieldType: "select",
    vocabulary: "file_document_type",
    keeperSignal: "file_document_type",
    requiredForCapabilities: [],
    aiDescription: "Specific document type for document-kind files; AI extraction proposes it",
    dbColumn: "document_type",
    writePolicy: "keeper_auto",
  },
  {
    key: "description",
    label: "Description",
    entityType: "file",
    fieldType: "text",
    keeperSignal: "file_description",
    requiredForCapabilities: [],
    aiDescription: "Short human description of what the file is",
    dbColumn: "description",
  },
  {
    key: "lifecycleStatus",
    label: "Lifecycle",
    entityType: "file",
    fieldType: "select",
    vocabulary: "file_lifecycle_status",
    keeperSignal: "file_lifecycle_status",
    requiredForCapabilities: [],
    aiDescription: "Signature/delivery lifecycle for signable documents",
    dbColumn: "lifecycle_status",
    writePolicy: "keeper_auto",
  },
  {
    key: "totalAmountCents",
    label: "Amount",
    entityType: "file",
    fieldType: "money",
    keeperSignal: "file_total_amount",
    requiredForCapabilities: [],
    aiDescription: "Total amount extracted from financial documents, in cents",
    dbColumn: "total_amount_cents",
    writePolicy: "keeper_auto",
  },
  {
    key: "currency",
    label: "Currency",
    entityType: "file",
    fieldType: "select",
    vocabulary: "currency",
    requiredForCapabilities: [],
    aiDescription: "Currency for the extracted amount (ISO 4217)",
    dbColumn: "currency",
    formatRule: "Uppercase ISO 4217",
  },
  {
    key: "dueDate",
    label: "Due Date",
    entityType: "file",
    fieldType: "date",
    keeperSignal: "file_due_date",
    requiredForCapabilities: [],
    aiDescription: "Due date extracted from the document",
    dbColumn: "due_date",
    writePolicy: "keeper_auto",
  },
  {
    key: "expiryDate",
    label: "Expiry Date",
    entityType: "file",
    fieldType: "date",
    keeperSignal: "file_expiry_date",
    requiredForCapabilities: [],
    aiDescription: "Expiration date extracted from the document",
    dbColumn: "expiry_date",
    writePolicy: "keeper_auto",
  },
  {
    key: "signedDate",
    label: "Signed Date",
    entityType: "file",
    fieldType: "date",
    keeperSignal: "file_signed_date",
    requiredForCapabilities: [],
    aiDescription: "Date the document was signed",
    dbColumn: "signed_date",
    writePolicy: "keeper_auto",
  },
  {
    key: "followUpDate",
    label: "Follow-up Date",
    entityType: "file",
    fieldType: "date",
    keeperSignal: "file_follow_up_date",
    requiredForCapabilities: [],
    aiDescription: "When to follow up about this document; Salt suggests, you decide",
    dbColumn: "follow_up_date",
  },
  {
    key: "sharedWithClient",
    label: "Shared with Client",
    entityType: "file",
    fieldType: "boolean",
    requiredForCapabilities: [],
    aiDescription: "Whether the client can see this file",
    dbColumn: "shared_with_client",
    writePolicy: "user_only",
  },
  {
    key: "isOperatorAsset",
    label: "My Business Asset",
    entityType: "file",
    fieldType: "boolean",
    requiredForCapabilities: [],
    aiDescription:
      "TRUE when the file belongs to the operator's own business (brand kit, templates — shown on the Me Files tab) rather than to a person/org/work record",
    dbColumn: "is_operator_asset",
    writePolicy: "user_only",
    emptyMeaning: "FALSE — a record's file, not the operator's own asset",
  },
];

// ============================================================================
// MEETING FIELDS (meetings)
// ============================================================================

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
    keeperSignal: "meeting_type",
    requiredForCapabilities: [],
    aiDescription: "Purpose of the meeting; inferable from title/agenda",
    dbColumn: "meeting_type",
  },
  {
    key: "status",
    label: "Status",
    entityType: "meeting",
    fieldType: "select",
    vocabulary: "meeting_status",
    keeperSignal: "meeting_status",
    requiredForCapabilities: [],
    aiDescription: "Scheduled/completed/cancelled/no-show; time passing implies completed",
    dbColumn: "status",
    writePolicy: "keeper_auto",
  },
  {
    key: "startTime",
    label: "Start",
    entityType: "meeting",
    fieldType: "datetime",
    requiredForCapabilities: [],
    aiDescription: "Start time; calendar sync owns it for external meetings",
    dbColumn: "start_time",
    writePolicy: "keeper_auto",
  },
  {
    key: "endTime",
    label: "End",
    entityType: "meeting",
    fieldType: "datetime",
    requiredForCapabilities: [],
    aiDescription: "End time; calendar sync owns it for external meetings",
    dbColumn: "end_time",
    writePolicy: "keeper_auto",
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
    writePolicy: "keeper_auto",
  },
  {
    key: "meetingUrl",
    label: "Meeting URL",
    entityType: "meeting",
    fieldType: "url",
    requiredForCapabilities: [],
    aiDescription: "Join link for video meetings; calendar sync can set it",
    dbColumn: "meeting_url",
    writePolicy: "keeper_auto",
  },
  {
    key: "address",
    label: "Address",
    entityType: "meeting",
    fieldType: "text",
    requiredForCapabilities: [],
    aiDescription: "Physical address for in-person meetings",
    dbColumn: "address",
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
  },
  {
    key: "description",
    label: "Description",
    entityType: "meeting",
    fieldType: "text",
    requiredForCapabilities: [],
    aiDescription: "Agenda or context for the meeting",
    dbColumn: "description",
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
    keeperSignal: "meeting_attendees",
    requiredForCapabilities: [],
    aiDescription: "Attendee list; calendar sync maintains it for external meetings",
    dbColumn: "attendees",
    writePolicy: "keeper_auto",
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
  { key: "preferredName", label: "Preferred Name", entityType: "me", fieldType: "text", aiDescription: "Name the operator goes by", dbColumn: "preferred_name", ...ME_USER_ONLY },
  { key: "fullName", label: "Full Name", entityType: "me", fieldType: "text", aiDescription: "Operator's full legal/display name", dbColumn: "display_name", formatRule: "Also split into first_name/last_name; full_name is a generated column", ...ME_USER_ONLY },
  { key: "gender", label: "Gender", entityType: "me", fieldType: "select", aiDescription: "Optional gender", dbColumn: "gender", ...ME_USER_ONLY },
  { key: "roleTitle", label: "Role", entityType: "me", fieldType: "text", aiDescription: "What the operator calls their role", dbColumn: "role_title", ...ME_USER_ONLY },
  { key: "phone", label: "Phone", entityType: "me", fieldType: "phone", aiDescription: "Operator's phone number", dbColumn: "phone", ...ME_USER_ONLY },
  { key: "timezone", label: "Timezone", entityType: "me", fieldType: "timezone", vocabulary: "timezone", aiDescription: "Operator's IANA timezone", dbColumn: "timezone", ...ME_USER_ONLY },
  { key: "workingHours", label: "Working Hours", entityType: "me", fieldType: "text", aiDescription: "Typical working hours", dbColumn: "working_hours", ...ME_USER_ONLY },
  { key: "location", label: "Location", entityType: "me", fieldType: "text", aiDescription: "Where the operator is based", dbColumn: "location", ...ME_USER_ONLY },
  { key: "addressLine1", label: "Street Address", entityType: "me", fieldType: "text", aiDescription: "Operator address line 1", dbColumn: "address_line_1", ...ME_USER_ONLY },
  { key: "addressLine2", label: "Address Line 2", entityType: "me", fieldType: "text", aiDescription: "Operator address line 2", dbColumn: "address_line_2", ...ME_USER_ONLY },
  { key: "city", label: "City", entityType: "me", fieldType: "text", aiDescription: "Operator city", dbColumn: "city", ...ME_USER_ONLY },
  { key: "state", label: "State/Province", entityType: "me", fieldType: "text", aiDescription: "Operator state or province", dbColumn: "state", ...ME_USER_ONLY },
  { key: "postalCode", label: "Postal Code", entityType: "me", fieldType: "text", aiDescription: "Operator postal code", dbColumn: "postal_code", ...ME_USER_ONLY },
  { key: "country", label: "Country", entityType: "me", fieldType: "country", vocabulary: "country", aiDescription: "Operator country", dbColumn: "country", ...ME_USER_ONLY },
  { key: "professionalCredentials", label: "Credentials", entityType: "me", fieldType: "text", aiDescription: "Professional credentials or certifications", dbColumn: "professional_credentials", ...ME_USER_ONLY },
  { key: "email", label: "Email", entityType: "me", fieldType: "email", aiDescription: "Auth email (read-only)", dbColumn: "email", isReadonly: true, requiredForCapabilities: [] },
];

export const ME_BUSINESS_FIELDS: FieldDescriptor<"workspaces">[] = [
  { key: "name", label: "Business Name", entityType: "me", fieldType: "text", aiDescription: "Workspace/business display name", dbColumn: "name", ...ME_USER_ONLY },
  { key: "tagline", label: "Tagline", entityType: "me", fieldType: "text", aiDescription: "One-line business description", dbColumn: "tagline", ...ME_USER_ONLY },
  { key: "websiteUrl", label: "Website", entityType: "me", fieldType: "url", aiDescription: "Business website", dbColumn: "website_url", ...ME_USER_ONLY },
  { key: "industry", label: "Industry", entityType: "me", fieldType: "text", aiDescription: "Industry the business operates in", dbColumn: "industry", ...ME_USER_ONLY },
  { key: "legalBusinessName", label: "Legal Business Name", entityType: "me", fieldType: "text", aiDescription: "Registered legal name for contracts and invoices", dbColumn: "legal_business_name", formatRule: "Exact registered name", ...ME_USER_ONLY },
  { key: "businessType", label: "Business Type", entityType: "me", fieldType: "select", vocabulary: "business_type", aiDescription: "Legal structure", dbColumn: "business_type", ...ME_USER_ONLY },
  { key: "businessPhone", label: "Business Phone", entityType: "me", fieldType: "phone", aiDescription: "Business phone number", dbColumn: "business_phone", ...ME_USER_ONLY },
  { key: "businessEmail", label: "Business Email", entityType: "me", fieldType: "email", aiDescription: "Business contact email", dbColumn: "business_email", ...ME_USER_ONLY },
  { key: "location", label: "Business Location", entityType: "me", fieldType: "text", aiDescription: "Where the business operates from", dbColumn: "location", ...ME_USER_ONLY },
  { key: "taxIdType", label: "Tax ID Type", entityType: "me", fieldType: "text", aiDescription: "Type of tax identifier (EIN, VAT, ...)", dbColumn: "tax_id_type", ...ME_USER_ONLY },
  { key: "taxIdLast4", label: "Tax ID (last 4)", entityType: "me", fieldType: "text", aiDescription: "Last four characters of the tax ID", dbColumn: "tax_id_last4", formatRule: "Max 4 characters; never store the full ID", ...ME_USER_ONLY },
  { key: "defaultCurrency", label: "Default Currency", entityType: "me", fieldType: "select", vocabulary: "currency", aiDescription: "Default currency for new work and billing", dbColumn: "default_currency", formatRule: "Uppercase ISO 4217", ...ME_USER_ONLY },
  { key: "paymentTerms", label: "Default Payment Terms", entityType: "me", fieldType: "select", vocabulary: "payment_terms", aiDescription: "Default payment terms for new invoices", dbColumn: "payment_terms", ...ME_USER_ONLY },
  { key: "legalAddressLine1", label: "Legal Address", entityType: "me", fieldType: "text", aiDescription: "Legal address line 1", dbColumn: "legal_address_line_1", ...ME_USER_ONLY },
  { key: "legalAddressLine2", label: "Legal Address Line 2", entityType: "me", fieldType: "text", aiDescription: "Legal address line 2", dbColumn: "legal_address_line_2", ...ME_USER_ONLY },
  { key: "legalCity", label: "Legal City", entityType: "me", fieldType: "text", aiDescription: "Legal address city", dbColumn: "legal_city", ...ME_USER_ONLY },
  { key: "legalState", label: "Legal State", entityType: "me", fieldType: "text", aiDescription: "Legal address state/province", dbColumn: "legal_state", ...ME_USER_ONLY },
  { key: "legalPostalCode", label: "Legal Postal Code", entityType: "me", fieldType: "text", aiDescription: "Legal address postal code", dbColumn: "legal_postal_code", ...ME_USER_ONLY },
  { key: "legalCountry", label: "Legal Country", entityType: "me", fieldType: "country", vocabulary: "country", aiDescription: "Legal address country", dbColumn: "legal_country", ...ME_USER_ONLY },
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

export function getKeeperSignals(): Array<{ signal: string; field: FieldDescriptor }> {
  return ALL_CONTRACT_FIELDS.filter((f) => f.keeperSignal).map((f) => ({
    signal: f.keeperSignal!,
    field: f,
  }));
}
