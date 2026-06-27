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

export interface FieldDescriptor {
  key: string;
  label: string;
  entityType: CapabilityEntityType | "all";
  fieldType: FieldType;
  vocabulary?: string;
  keeperSignal?: string;
  requiredForCapabilities: CapabilityId[];
  aiDescription: string;
  dbColumn?: string;
  isReadonly?: boolean;
}

// ============================================================================
// PERSON FIELDS
// ============================================================================

export const PERSON_FIELDS: FieldDescriptor[] = [
  {
    key: "name",
    label: "Name",
    entityType: "person",
    fieldType: "text",
    keeperSignal: "person_name",
    requiredForCapabilities: ["invoicing"],
    aiDescription: "Full display name of the person",
    dbColumn: "display_name",
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
    dbColumn: "address_line1",
  },
  {
    key: "addressLine2",
    label: "Address Line 2",
    entityType: "person",
    fieldType: "text",
    keeperSignal: "person_address_line2",
    requiredForCapabilities: [],
    aiDescription: "Street address line 2 (apt, suite, etc.)",
    dbColumn: "address_line2",
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
];

// ============================================================================
// ORG FIELDS
// ============================================================================

export const ORG_FIELDS: FieldDescriptor[] = [
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
    dbColumn: "relationship_type",
  },
  {
    key: "primaryContact",
    label: "Primary Contact",
    entityType: "org",
    fieldType: "reference",
    keeperSignal: "org_primary_contact",
    requiredForCapabilities: [],
    aiDescription: "Main person to contact at this organization",
    dbColumn: "primary_contact_id",
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
    dbColumn: "address_line1",
  },
  {
    key: "addressLine2",
    label: "Address Line 2",
    entityType: "org",
    fieldType: "text",
    keeperSignal: "org_address_line2",
    requiredForCapabilities: [],
    aiDescription: "Street address line 2 (apt, suite, etc.)",
    dbColumn: "address_line2",
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
];

// ============================================================================
// WORK FIELDS
// ============================================================================

export const WORK_FIELDS: FieldDescriptor[] = [
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
    vocabulary: "project_stage",
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
// FIELD REGISTRY (All fields in one lookup)
// ============================================================================

export const FIELD_REGISTRY: Record<string, FieldDescriptor> = {};

for (const field of [...PERSON_FIELDS, ...ORG_FIELDS, ...WORK_FIELDS]) {
  FIELD_REGISTRY[`${field.entityType}:${field.key}`] = field;
}

// ============================================================================
// LOOKUP HELPERS
// ============================================================================

export function getFieldDescriptor(
  entityType: CapabilityEntityType,
  fieldKey: string
): FieldDescriptor | undefined {
  return FIELD_REGISTRY[`${entityType}:${fieldKey}`];
}

export function getFieldsForEntity(
  entityType: CapabilityEntityType
): FieldDescriptor[] {
  const allFields = [...PERSON_FIELDS, ...ORG_FIELDS, ...WORK_FIELDS];
  return allFields.filter((f) => f.entityType === entityType || f.entityType === "all");
}

export function getFieldsForCapability(
  capabilityId: CapabilityId
): FieldDescriptor[] {
  const allFields = [...PERSON_FIELDS, ...ORG_FIELDS, ...WORK_FIELDS];
  return allFields.filter((f) => f.requiredForCapabilities.includes(capabilityId));
}

export function getVocabularyControlledFields(): FieldDescriptor[] {
  const allFields = [...PERSON_FIELDS, ...ORG_FIELDS, ...WORK_FIELDS];
  return allFields.filter((f) => f.vocabulary);
}

export function isVocabularyField(
  entityType: CapabilityEntityType,
  fieldKey: string
): boolean {
  const field = getFieldDescriptor(entityType, fieldKey);
  return !!field?.vocabulary;
}

export function getKeeperSignals(): Array<{ signal: string; field: FieldDescriptor }> {
  const allFields = [...PERSON_FIELDS, ...ORG_FIELDS, ...WORK_FIELDS];
  return allFields
    .filter((f) => f.keeperSignal)
    .map((f) => ({ signal: f.keeperSignal!, field: f }));
}
