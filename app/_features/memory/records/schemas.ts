import { z } from "zod";
import type { ToolRiskClass } from "@/app/_lib/composio/tool-policy";
import type { RecordActionSlug } from "./types";

const uuidSchema = z.string().uuid();

/** UUID that treats empty string as undefined (for optional FK fields from AI tools) */
const optionalUuidSchema = z.union([
  z.literal("").transform(() => undefined),
  z.string().uuid(),
  z.undefined(),
]);

export const relationshipTypeSchema = z.enum([
  "client",
  "prospect",
  "team",
  "partner",
  "vendor",
  "personal",
  "unknown",
]);

export const noteTargetTypeSchema = z.enum(["person", "org", "work", "space"]);

export const findPeopleInputSchema = z.object({
  query: z
    .string()
    .describe("Search by name or email. Leave empty to list recent people."),
  limit: z.number().int().min(1).max(25).optional(),
});

export const findOrgsInputSchema = z.object({
  query: z
    .string()
    .describe("Search by name or domain. Leave empty to list organizations."),
  limit: z.number().int().min(1).max(25).optional(),
});

export const findWorkInputSchema = z.object({
  query: z
    .string()
    .describe("Search by project/work name. Leave empty to list recent work items."),
  limit: z.number().int().min(1).max(25).optional(),
});

export const createPersonInputSchema = z
  .object({
    name: z.string().min(1).optional(),
    email: z.string().email().optional(),
    relationship_type: relationshipTypeSchema.optional(),
    title: z.string().min(1).optional(),
    phone: z.string().min(1).optional().describe("Phone number"),
    billing_email: z.string().email().optional().describe("Billing email if different from primary"),
    timezone: z.string().min(1).optional().describe("IANA timezone (e.g., America/New_York)"),
    address_line_1: z.string().min(1).optional().describe("Street address"),
    address_line_2: z.string().optional().describe("Apt, suite, unit, etc."),
    city: z.string().min(1).optional(),
    state: z.string().min(1).optional().describe("State or province"),
    postal_code: z.string().min(1).optional(),
    country: z.string().min(1).optional().describe("Country code (e.g., US, CA)"),
    notes: z.string().optional().describe("Initial notes about this person"),
    last_contact_at: z.string().optional().describe("Last contact date (ISO 8601 timestamp)"),
    first_contact_at: z.string().optional().describe("First contact date (ISO 8601 timestamp)"),
    org_id: optionalUuidSchema,
    organization_name: z.string().min(1).optional(),
    domain: z.string().min(1).optional(),
    user_insists_person: z.boolean().optional(),
  })
  .refine((data) => Boolean(data.name?.trim() || data.email?.trim()), {
    message: "Provide name or email to create a person",
  });

export const updatePersonInputSchema = z.object({
  person_id: uuidSchema,
  fields: z
    .object({
      name: z.string().min(1).optional(),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      billing_email: z.string().email().optional(),
      timezone: z.string().optional(),
      title: z.string().optional(),
      address_line_1: z.string().optional(),
      address_line_2: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      postal_code: z.string().optional(),
      country: z.string().optional(),
      notes: z.string().optional(),
      relationship_type: relationshipTypeSchema.optional(),
      last_contact_at: z.string().optional().describe("Last contact date (ISO 8601 timestamp)"),
      first_contact_at: z.string().optional().describe("First contact date (ISO 8601 timestamp)"),
    })
    .refine((fields) => Object.keys(fields).length > 0, {
      message: "Provide at least one field to update",
    }),
});

export const classifyPersonInputSchema = z.object({
  person_id: uuidSchema,
  relationship_type: relationshipTypeSchema,
});

export const archivePersonInputSchema = z.object({
  person_id: uuidSchema,
  reason: z.string().optional(),
});

export const createOrgInputSchema = z
  .object({
    name: z.string().min(1).optional(),
    domain: z.string().min(1).optional(),
    website: z.string().url().optional().describe("Company website URL"),
    billing_email: z.string().email().optional().describe("Billing contact email"),
    industry: z.string().min(1).optional().describe("Industry or sector"),
    industry_parent: z.string().optional().describe("Parent industry category"),
    industry_child: z.string().optional().describe("Industry sub-category"),
    estimated_company_size: z.string().optional().describe("Company size estimate (e.g., 1-10, 11-50, 51-200)"),
    estimated_budget_tier: z.string().optional().describe("Budget tier (e.g., low, medium, high, enterprise)"),
    address_line_1: z.string().min(1).optional().describe("Street address"),
    address_line_2: z.string().optional().describe("Suite, floor, etc."),
    city: z.string().min(1).optional(),
    state: z.string().min(1).optional().describe("State or province"),
    postal_code: z.string().min(1).optional(),
    country: z.string().min(1).optional().describe("Country code (e.g., US, CA)"),
    last_contact_at: z.string().optional().describe("ISO date of last contact with this organization"),
    notes: z.string().optional().describe("Initial notes about this organization"),
  })
  .refine((data) => Boolean(data.name?.trim() || data.domain?.trim()), {
    message: "Provide name or domain to create an organization",
  });

export const updateOrgInputSchema = z.object({
  org_id: uuidSchema,
  fields: z
    .object({
      name: z.string().min(1).optional(),
      domain: z.string().optional(),
      website: z.string().optional(),
      billing_email: z.string().email().optional(),
      industry: z.string().optional(),
      industry_parent: z.string().optional(),
      industry_child: z.string().optional(),
      estimated_company_size: z.string().optional(),
      estimated_budget_tier: z.string().optional(),
      address_line_1: z.string().optional(),
      address_line_2: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      postal_code: z.string().optional(),
      country: z.string().optional(),
      last_contact_at: z.string().optional(),
      notes: z.string().optional(),
    })
    .refine((fields) => Object.keys(fields).length > 0, {
      message: "Provide at least one field to update",
    }),
});

export const archiveOrgInputSchema = z.object({
  org_id: uuidSchema,
  reason: z.string().optional(),
});

export const workTypeSchema = z.enum([
  "project",
  "retainer",
  "hourly",
  "event",
  "other",
]);

export const workPaymentTypeSchema = z.enum([
  "fixed",
  "hourly",
  "retainer",
  "milestone",
  "other",
]);

export const workPaymentTermsSchema = z.enum([
  "net_7",
  "net_14",
  "net_30",
  "net_60",
  "due_on_receipt",
  "custom",
]);

export const workBillingCycleSchema = z.enum([
  "weekly",
  "biweekly",
  "monthly",
  "quarterly",
  "annually",
  "one_time",
]);

export const createWorkInputSchema = z.object({
  name: z.string().min(1),
  person_id: optionalUuidSchema,
  org_id: optionalUuidSchema,
  description: z.string().optional().describe("Project description or scope"),
  work_type: workTypeSchema.optional().describe("Type of work (project, retainer, hourly, event)"),
  status: z.string().optional().describe("Project status (e.g., active, on_hold, completed)"),
  deadline: z.string().optional().describe("ISO date for project deadline"),
  start_date: z.string().optional().describe("ISO date for project start"),
  contract_value_cents: z.number().int().optional().describe("Total contract value in cents"),
  base_price_cents: z.number().int().optional().describe("Base price in cents before adjustments"),
  currency: z.string().optional().describe("Currency code (e.g., USD, CAD)"),
  hourly_rate_cents: z.number().int().optional().describe("Hourly rate in cents for hourly work"),
  hours_estimate: z.number().optional().describe("Estimated hours for the project"),
  payment_type: workPaymentTypeSchema.optional().describe("How the work is billed"),
  payment_terms: workPaymentTermsSchema.optional().describe("Payment terms (net_30, due_on_receipt, etc.)"),
  billing_cycle: workBillingCycleSchema.optional().describe("Billing cycle for retainers"),
  retainer_mrr_cents: z.number().int().optional().describe("Monthly recurring revenue for retainers in cents"),
  po_number: z.string().optional().describe("Purchase order number"),
  is_bundle: z.boolean().optional().describe("Whether this work is a bundle of services"),
  value_proposition: z.string().optional().describe("Why this work is valuable to the client"),
  deliverables: z.string().optional().describe("What will be delivered"),
  prerequisites: z.string().optional().describe("What's needed before work can begin"),
  differentiators: z.string().optional().describe("What makes this offering unique"),
});

export const updateWorkInputSchema = z.object({
  work_id: uuidSchema,
  fields: z
    .object({
      name: z.string().min(1).optional(),
      description: z.string().optional(),
      status: z.string().optional(),
      work_type: workTypeSchema.optional(),
      deadline: z.string().optional(),
      start_date: z.string().optional(),
      contract_value_cents: z.number().int().optional(),
      base_price_cents: z.number().int().optional(),
      currency: z.string().optional(),
      hourly_rate_cents: z.number().int().optional(),
      hours_estimate: z.number().optional(),
      hours_logged: z.number().optional(),
      payment_type: workPaymentTypeSchema.optional(),
      payment_terms: workPaymentTermsSchema.optional(),
      billing_cycle: workBillingCycleSchema.optional(),
      retainer_mrr_cents: z.number().int().optional(),
      po_number: z.string().optional(),
      is_bundle: z.boolean().optional(),
      value_proposition: z.string().optional(),
      deliverables: z.string().optional(),
      prerequisites: z.string().optional(),
      differentiators: z.string().optional(),
    })
    .refine((fields) => Object.keys(fields).length > 0, {
      message: "Provide at least one field to update",
    }),
});

export const archiveWorkInputSchema = z.object({
  work_id: uuidSchema,
  reason: z.string().optional(),
});

export const linkPersonOrgInputSchema = z.object({
  person_id: uuidSchema,
  org_id: uuidSchema,
});

export const linkPersonWorkInputSchema = z.object({
  person_id: uuidSchema,
  work_id: uuidSchema,
});

export const linkPersonPersonInputSchema = z.object({
  person_id: uuidSchema,
  target_person_id: uuidSchema,
});

export const linkPersonSpaceInputSchema = z.object({
  person_id: uuidSchema,
  space_id: uuidSchema,
});

export const linkOrgWorkInputSchema = z.object({
  org_id: uuidSchema,
  work_id: uuidSchema,
});

export const linkWorkSpaceInputSchema = z.object({
  work_id: uuidSchema,
  space_id: uuidSchema,
});

export const createNoteInputSchema = z.object({
  content: z.string().min(1),
  target_type: noteTargetTypeSchema,
  target_id: uuidSchema,
});

export const blockerTypeSchema = z.enum([
  "awaiting_reply",
  "meeting_cancelled",
  "approval_pending",
  "asset_pending",
  "payment_pending",
  "dependency",
  "resource_unavailable",
  "custom",
]);

export const addBlockerInputSchema = z.object({
  work_id: uuidSchema.describe("Work/project ID from memory_create_work or by searching work records."),
  blocker_type: blockerTypeSchema.describe(
    "Type of blocker: awaiting_reply (waiting for someone to respond), asset_pending (waiting for deliverables/files), payment_pending (waiting for payment), approval_pending (waiting for sign-off), dependency (blocked by another task), meeting_cancelled, resource_unavailable, or custom."
  ),
  title: z.string().min(1).max(200).describe("Short description of what's blocking progress."),
  detail: z.string().max(1000).optional().describe("Optional longer explanation or context."),
});

export const meetingTypeSchema = z.enum([
  "discovery",
  "check-in",
  "review",
  "kickoff",
  "other",
]);

export const locationTypeSchema = z.enum([
  "google-meet",
  "zoom",
  "phone",
  "in-person",
  "custom",
]);

export const findMeetingsInputSchema = z.object({
  query: z
    .string()
    .describe("Search by meeting title or person name. Leave empty to list upcoming meetings."),
  limit: z.number().int().min(1).max(25).optional(),
});

export const createClientMeetingInputSchema = z.object({
  title: z.string().min(1).describe("Meeting title/subject"),
  person_id: uuidSchema.describe("Person ID from memory_find_people - the client/contact for this meeting"),
  person_name: z.string().optional().describe("Person name for display"),
  meeting_type: meetingTypeSchema.optional().default("other").describe("Meeting type - defaults to 'other' if not specified"),
  start_time: z.string().describe("ISO datetime for meeting start (e.g. 2026-07-01T14:00:00Z)"),
  end_time: z.string().optional().describe("ISO datetime for meeting end - defaults to 30 min after start if not specified"),
  location_type: locationTypeSchema.optional().default("google-meet").describe("How meeting will be held - defaults to 'google-meet'"),
  meeting_url: z.string().url().optional().describe("Meeting URL if virtual"),
  description: z.string().max(2000).optional(),
  work_id: optionalUuidSchema.describe("Work/project ID to link this meeting to"),
});

// ============================================================================
// BILLING SCHEMAS
// ============================================================================

export const billingDirectionSchema = z.enum(["receivable", "payable"]);

export const billingStatusSchema = z.enum([
  "draft",
  "due",
  "overdue",
  "paid",
  "partial",
]);

export const billingCategorySchema = z.enum([
  "contractor",
  "software",
  "other",
]);

export const findBillingInputSchema = z.object({
  query: z
    .string()
    .describe("Search by vendor name, number, or amount. Leave empty to list recent billing records."),
  direction: billingDirectionSchema.optional().describe("Filter by direction: receivable (money owed to you) or payable (money you owe)"),
  limit: z.number().int().min(1).max(25).optional(),
});

export const createBillingInputSchema = z.object({
  direction: billingDirectionSchema.describe("receivable = invoice you sent (money owed to you), payable = bill you received (money you owe)"),
  amount_cents: z.number().int().min(0).describe("Amount in cents (e.g., 10000 = $100.00)"),
  currency: z.string().default("USD").describe("Currency code (e.g., USD, CAD)"),
  status: billingStatusSchema.optional().default("draft").describe("Billing status"),
  category: billingCategorySchema.optional().describe("Category: contractor, software, other"),
  vendor_label: z.string().optional().describe("Vendor or client name"),
  number: z.string().optional().describe("Invoice/bill number"),
  due_at: z.string().optional().describe("Due date (ISO format)"),
  issued_at: z.string().optional().describe("Issue date (ISO format)"),
  paid_at: z.string().optional().describe("Payment date (ISO format)"),
  person_id: optionalUuidSchema.describe("Link to a person"),
  organization_id: optionalUuidSchema.describe("Link to an organization"),
  work_id: optionalUuidSchema.describe("Link to a work/project"),
  tags: z.array(z.string()).optional().describe("Tags for categorization"),
  app_url: z.string().url().optional().describe("Hosted invoice/bill page (e.g. Stripe hosted_invoice_url) — attached to the record as a link Resource"),
});

export const updateBillingInputSchema = z.object({
  billing_id: uuidSchema,
  fields: z
    .object({
      amount_cents: z.number().int().min(0).optional(),
      amount_paid_cents: z.number().int().min(0).optional().describe("Amount paid so far in cents"),
      currency: z.string().optional(),
      status: billingStatusSchema.optional(),
      category: billingCategorySchema.optional(),
      vendor_label: z.string().optional(),
      number: z.string().optional(),
      due_at: z.string().optional(),
      issued_at: z.string().optional(),
      paid_at: z.string().optional(),
      tags: z.array(z.string()).optional(),
    })
    .refine((fields) => Object.keys(fields).length > 0, {
      message: "Provide at least one field to update",
    }),
});

export const archiveBillingInputSchema = z.object({
  billing_id: uuidSchema,
  reason: z.string().optional(),
});

// ============================================================================
// FILES SCHEMAS
// ============================================================================

export const fileCategorySchema = z.enum([
  "brand_asset",
  "deliverable",
  "contract",
  "screenshot",
  "invoice",
  "proposal",
  "reference",
  "media",
  "notes",
  "process",
  "other",
]);

export const fileDirectionSchema = z.enum([
  "from_client",
  "to_client",
  "internal",
]);

export const findFilesInputSchema = z.object({
  query: z
    .string()
    .describe("Search by file name or description. Leave empty to list recent files."),
  category: fileCategorySchema.optional().describe("Filter by category"),
  limit: z.number().int().min(1).max(25).optional(),
});

export const createFileInputSchema = z.object({
  file_name: z.string().min(1).describe("File name"),
  external_url: z.string().url().optional().describe("External URL (e.g., Google Drive link)"),
  category: fileCategorySchema.optional().default("other").describe("File category"),
  description: z.string().optional().describe("File description"),
  document_type: z.string().optional().describe("Document type (e.g., PDF, Word, Image)"),
  direction: fileDirectionSchema.optional().describe("from_client, to_client, or internal"),
  due_date: z.string().optional().describe("Due date for action on this file"),
  expiry_date: z.string().optional().describe("Expiry date (e.g., for contracts)"),
  follow_up_date: z.string().optional().describe("Follow-up date"),
  total_amount_cents: z.number().int().optional().describe("Associated amount in cents"),
  currency: z.string().optional().describe("Currency code"),
  shared_with_client: z.boolean().optional().describe("Whether shared with client"),
  is_operator_asset: z.boolean().optional().default(false).describe("Whether this is an operator asset (branding, templates)"),
  person_id: optionalUuidSchema.describe("Link to a person"),
  organization_id: optionalUuidSchema.describe("Link to an organization"),
});

export const updateFileInputSchema = z.object({
  file_id: uuidSchema,
  fields: z
    .object({
      file_name: z.string().min(1).optional(),
      description: z.string().optional(),
      category: fileCategorySchema.optional(),
      document_type: z.string().optional(),
      direction: fileDirectionSchema.optional(),
      due_date: z.string().optional(),
      expiry_date: z.string().optional(),
      follow_up_date: z.string().optional(),
      total_amount_cents: z.number().int().optional(),
      currency: z.string().optional(),
      shared_with_client: z.boolean().optional(),
      is_operator_asset: z.boolean().optional(),
      lifecycle_status: z.string().optional().describe("Lifecycle status (e.g., active, signed, expired)"),
    })
    .refine((fields) => Object.keys(fields).length > 0, {
      message: "Provide at least one field to update",
    }),
});

export const archiveFileInputSchema = z.object({
  file_id: uuidSchema,
  reason: z.string().optional(),
});

// ============================================================================
// ME / OPERATOR FACTS SCHEMAS
// ============================================================================

export const operatorFactCategorySchema = z.enum([
  "identity",
  "business",
  "preference",
  "goal",
  "voice",
  "relationship",
]);

export const operatorFactKindSchema = z.enum([
  "fact",
  "preference",
  "procedure",
]);

export const operatorFactScopeSchema = z.enum([
  "global",
  "person",
  "org",
  "topic",
]);

export const operatorFactStatusSchema = z.enum([
  "proposed",
  "confirmed",
  "dismissed",
]);

export const findMeFactsInputSchema = z.object({
  query: z
    .string()
    .describe("Search by label or value. Leave empty to list recent facts about you."),
  category: operatorFactCategorySchema.optional().describe("Filter by category"),
  limit: z.number().int().min(1).max(25).optional(),
});

export const createMeFactInputSchema = z.object({
  value: z.string().min(1).describe("The fact content (e.g., 'My timezone is EST')"),
  label: z.string().optional().describe("Short label for the fact"),
  category: operatorFactCategorySchema.optional().default("business").describe("Category: identity, business, preference, goal, voice, relationship"),
  kind: operatorFactKindSchema.optional().default("fact").describe("Kind: fact, preference, procedure"),
  scope_type: operatorFactScopeSchema.optional().default("global").describe("Scope: global (applies everywhere), person (specific person), org (specific org), topic"),
  scope_value: z.string().optional().describe("Scope value (e.g., person_id for person scope)"),
  status: operatorFactStatusSchema.optional().default("confirmed").describe("Status: proposed, confirmed, dismissed"),
  confidence: z.number().min(0).max(100).optional().describe("Confidence level 0-100"),
});

export const updateMeFactInputSchema = z.object({
  fact_id: uuidSchema,
  fields: z
    .object({
      value: z.string().min(1).optional(),
      label: z.string().optional(),
      category: operatorFactCategorySchema.optional(),
      kind: operatorFactKindSchema.optional(),
      scope_type: operatorFactScopeSchema.optional(),
      scope_value: z.string().optional(),
      status: operatorFactStatusSchema.optional(),
      confidence: z.number().min(0).max(100).optional(),
    })
    .refine((fields) => Object.keys(fields).length > 0, {
      message: "Provide at least one field to update",
    }),
});

export const archiveMeFactInputSchema = z.object({
  fact_id: uuidSchema,
  reason: z.string().optional(),
});

// ============================================================================
// TAG SCHEMAS
// ============================================================================

export const tagEntityTypeSchema = z.enum([
  "person",
  "org",
  "work",
  "billing",
  "resource",
]);

export const tagScopeSchema = z.enum([
  "person",
  "org",
  "work",
  "billing",
  "resource",
  "all",
]);

export const tagCategorySchema = z.enum([
  "segment",
  "signal",
  "priority",
  "custom",
]);

export const findTagsInputSchema = z.object({
  scope: tagScopeSchema.optional().describe("Filter tags by scope (person, org, work, billing, resource, all)"),
  category: tagCategorySchema.optional().describe("Filter by category"),
});

export const assignTagInputSchema = z.object({
  entity_type: tagEntityTypeSchema.describe("Type of entity to tag"),
  entity_id: uuidSchema.describe("ID of the entity to tag"),
  tag_label: z.string().min(1).describe("Tag label to assign (will create if doesn't exist)"),
  because: z.string().optional().describe("Reason for assigning this tag"),
});

export const unassignTagInputSchema = z.object({
  entity_type: tagEntityTypeSchema.describe("Type of entity"),
  entity_id: uuidSchema.describe("ID of the entity"),
  tag_label: z.string().min(1).describe("Tag label to remove"),
});

export const createTagInputSchema = z.object({
  label: z.string().min(1).describe("Tag label"),
  scope: tagScopeSchema.optional().default("all").describe("Which entity types can use this tag"),
  category: tagCategorySchema.optional().default("custom").describe("Tag category"),
  description: z.string().optional().describe("Description of what this tag means"),
});

// ============================================================================
// TOOL SPECS
// ============================================================================

export interface RecordActionDefinitionToolSpec {
  toolName: string;
  /** Play slug to execute; omitted for read-only lookup tools. */
  slug?: RecordActionSlug;
  description: string;
  schema: z.ZodType<unknown>;
  risk: ToolRiskClass;
  needsApproval: boolean;
}

export const RECORD_ACTION_TOOL_SPECS: RecordActionDefinitionToolSpec[] = [
  {
    toolName: "memory_find_people",
    description:
      "Search people in Memory by name or email. Always use this before creating or updating a person to get the correct person_id.",
    schema: findPeopleInputSchema,
    risk: "read",
    needsApproval: false,
  },
  {
    toolName: "memory_find_orgs",
    description:
      "Search organizations in Memory by name or domain. Always use this before creating or linking an org to get the correct org_id.",
    schema: findOrgsInputSchema,
    risk: "read",
    needsApproval: false,
  },
  {
    toolName: "memory_find_work",
    description:
      "Search work/projects in Memory by name. Always use this before creating or updating work to get the correct work_id and check for duplicates.",
    schema: findWorkInputSchema,
    risk: "read",
    needsApproval: false,
  },
  {
    toolName: "memory_create_person",
    slug: "system:create-person",
    description:
      "Create a person in Memory. Requires name or email. Dedupes by email. Pass org_id (from memory_find_orgs) or organization_name or domain to auto-link the person to an organization.",
    schema: createPersonInputSchema,
    risk: "mutating",
    needsApproval: false,
  },
  {
    toolName: "memory_update_person",
    slug: "system:update-person",
    description: "Update fields on an existing person. Requires person_id from memory_find_people.",
    schema: updatePersonInputSchema,
    risk: "mutating",
    needsApproval: false,
  },
  {
    toolName: "memory_classify_person",
    slug: "system:classify-person",
    description:
      "Set relationship type (client, prospect, vendor, etc.) on a person.",
    schema: classifyPersonInputSchema,
    risk: "mutating",
    needsApproval: false,
  },
  {
    toolName: "memory_archive_person",
    slug: "system:archive-person",
    description:
      "Archive a person (soft delete — never hard-delete; restorable).",
    schema: archivePersonInputSchema,
    risk: "mutating",
    needsApproval: false,
  },
  {
    toolName: "memory_create_org",
    slug: "system:create-org",
    description:
      "Create an organization in Memory. Requires name or domain. Dedupes by domain.",
    schema: createOrgInputSchema,
    risk: "mutating",
    needsApproval: false,
  },
  {
    toolName: "memory_update_org",
    slug: "system:update-org",
    description: "Update fields on an existing organization.",
    schema: updateOrgInputSchema,
    risk: "mutating",
    needsApproval: false,
  },
  {
    toolName: "memory_archive_org",
    slug: "system:archive-org",
    description: "Archive an organization (soft delete — restorable).",
    schema: archiveOrgInputSchema,
    risk: "mutating",
    needsApproval: false,
  },
  {
    toolName: "memory_create_work",
    slug: "system:create-work",
    description: "Create a work/project item in Memory.",
    schema: createWorkInputSchema,
    risk: "mutating",
    needsApproval: false,
  },
  {
    toolName: "memory_update_work",
    slug: "system:update-work",
    description: "Update fields on existing work.",
    schema: updateWorkInputSchema,
    risk: "mutating",
    needsApproval: false,
  },
  {
    toolName: "memory_archive_work",
    slug: "system:archive-work",
    description: "Archive work/project (soft delete — restorable).",
    schema: archiveWorkInputSchema,
    risk: "mutating",
    needsApproval: false,
  },
  {
    toolName: "memory_link_person_org",
    slug: "system:link-person-org",
    description: "Link a person to an organization.",
    schema: linkPersonOrgInputSchema,
    risk: "mutating",
    needsApproval: false,
  },
  {
    toolName: "memory_unlink_person_org",
    slug: "system:unlink-person-org",
    description: "Remove link between a person and an organization.",
    schema: linkPersonOrgInputSchema,
    risk: "mutating",
    needsApproval: false,
  },
  {
    toolName: "memory_link_person_work",
    slug: "system:link-person-work",
    description: "Link a person to a work/project.",
    schema: linkPersonWorkInputSchema,
    risk: "mutating",
    needsApproval: false,
  },
  {
    toolName: "memory_unlink_person_work",
    slug: "system:unlink-person-work",
    description: "Remove link between a person and work.",
    schema: linkPersonWorkInputSchema,
    risk: "mutating",
    needsApproval: false,
  },
  {
    toolName: "memory_link_person_person",
    slug: "system:link-person-person",
    description: "Link two people in Memory.",
    schema: linkPersonPersonInputSchema,
    risk: "mutating",
    needsApproval: false,
  },
  {
    toolName: "memory_unlink_person_person",
    slug: "system:unlink-person-person",
    description: "Remove link between two people.",
    schema: linkPersonPersonInputSchema,
    risk: "mutating",
    needsApproval: false,
  },
  {
    toolName: "memory_link_person_space",
    slug: "system:link-person-space",
    description: "Link a person to a space.",
    schema: linkPersonSpaceInputSchema,
    risk: "mutating",
    needsApproval: false,
  },
  {
    toolName: "memory_unlink_person_space",
    slug: "system:unlink-person-space",
    description: "Remove link between a person and a space.",
    schema: linkPersonSpaceInputSchema,
    risk: "mutating",
    needsApproval: false,
  },
  {
    toolName: "memory_link_org_work",
    slug: "system:link-org-work",
    description: "Link an organization to work/project.",
    schema: linkOrgWorkInputSchema,
    risk: "mutating",
    needsApproval: false,
  },
  {
    toolName: "memory_unlink_org_work",
    slug: "system:unlink-org-work",
    description: "Remove link between org and work.",
    schema: linkOrgWorkInputSchema,
    risk: "mutating",
    needsApproval: false,
  },
  {
    toolName: "memory_link_work_space",
    slug: "system:link-work-space",
    description: "Link work/project to a space.",
    schema: linkWorkSpaceInputSchema,
    risk: "mutating",
    needsApproval: false,
  },
  {
    toolName: "memory_unlink_work_space",
    slug: "system:unlink-work-space",
    description: "Remove link between work and space.",
    schema: linkWorkSpaceInputSchema,
    risk: "mutating",
    needsApproval: false,
  },
  {
    toolName: "memory_create_note",
    slug: "system:create-note",
    description: "Add a note attached to a person, org, work, or space.",
    schema: createNoteInputSchema,
    risk: "mutating",
    needsApproval: false,
  },
  {
    toolName: "memory_add_blocker",
    slug: "system:add-blocker",
    description:
      "Add a blocker to a work/project. Use when something is blocking progress: waiting for a reply, deliverable, payment, approval, or has a dependency. Requires work_id from memory_create_work.",
    schema: addBlockerInputSchema,
    risk: "mutating",
    needsApproval: false,
  },
  {
    toolName: "memory_find_meetings",
    description:
      "Search meetings by title or person. Always use this before creating a meeting to avoid duplicates.",
    schema: findMeetingsInputSchema,
    risk: "read",
    needsApproval: false,
  },
  {
    toolName: "memory_create_meeting",
    slug: "system:create-client-meeting",
    description:
      "Create a meeting with a person. Requires person_id from memory_find_people. Use memory_find_meetings first to check for duplicates.",
    schema: createClientMeetingInputSchema,
    risk: "mutating",
    needsApproval: false,
  },
  // ========================================================================
  // BILLING TOOLS
  // ========================================================================
  {
    toolName: "memory_find_billing",
    description:
      "Search billing records (invoices, bills) by vendor name, number, or amount. Use before creating or updating billing records.",
    schema: findBillingInputSchema,
    risk: "read",
    needsApproval: false,
  },
  {
    toolName: "memory_create_billing",
    slug: "system:create-billing",
    description:
      "Create a billing record (invoice or bill). Use direction='receivable' for invoices you sent (money owed to you), direction='payable' for bills you received (money you owe).",
    schema: createBillingInputSchema,
    risk: "mutating",
    needsApproval: false,
  },
  {
    toolName: "memory_update_billing",
    slug: "system:update-billing",
    description: "Update fields on an existing billing record.",
    schema: updateBillingInputSchema,
    risk: "mutating",
    needsApproval: false,
  },
  {
    toolName: "memory_archive_billing",
    slug: "system:archive-billing",
    description: "Archive a billing record (soft delete — restorable).",
    schema: archiveBillingInputSchema,
    risk: "mutating",
    needsApproval: false,
  },
  // ========================================================================
  // FILES TOOLS
  // ========================================================================
  {
    toolName: "memory_find_files",
    description:
      "Search files by name or description. Use before creating or updating files.",
    schema: findFilesInputSchema,
    risk: "read",
    needsApproval: false,
  },
  {
    toolName: "memory_create_file",
    slug: "system:create-file",
    description:
      "Create a file record in Memory. Use for tracking contracts, deliverables, brand assets, proposals, etc. Can link to external URLs (e.g., Google Drive).",
    schema: createFileInputSchema,
    risk: "mutating",
    needsApproval: false,
  },
  {
    toolName: "memory_update_file",
    slug: "system:update-file",
    description: "Update fields on an existing file record.",
    schema: updateFileInputSchema,
    risk: "mutating",
    needsApproval: false,
  },
  {
    toolName: "memory_archive_file",
    slug: "system:archive-file",
    description: "Archive a file record (soft delete — restorable).",
    schema: archiveFileInputSchema,
    risk: "mutating",
    needsApproval: false,
  },
  // ========================================================================
  // ME / OPERATOR FACTS TOOLS
  // ========================================================================
  {
    toolName: "memory_find_me_facts",
    description:
      "Search facts about the operator (you) - identity, business info, preferences, goals, voice style. Use to recall what Salt knows about you.",
    schema: findMeFactsInputSchema,
    risk: "read",
    needsApproval: false,
  },
  {
    toolName: "memory_create_me_fact",
    slug: "system:create-me-fact",
    description:
      "Add a fact about the operator (you) to Memory. Use for storing identity info, business details, preferences, goals, voice/tone guidelines, or relationship context.",
    schema: createMeFactInputSchema,
    risk: "mutating",
    needsApproval: false,
  },
  {
    toolName: "memory_update_me_fact",
    slug: "system:update-me-fact",
    description: "Update an existing fact about you.",
    schema: updateMeFactInputSchema,
    risk: "mutating",
    needsApproval: false,
  },
  {
    toolName: "memory_archive_me_fact",
    slug: "system:archive-me-fact",
    description: "Archive a fact about you (soft delete — restorable).",
    schema: archiveMeFactInputSchema,
    risk: "mutating",
    needsApproval: false,
  },
  // ========================================================================
  // TAG TOOLS
  // ========================================================================
  {
    toolName: "memory_find_tags",
    description:
      "List available tags in the workspace. Filter by scope (person, org, work, billing, file) or category.",
    schema: findTagsInputSchema,
    risk: "read",
    needsApproval: false,
  },
  {
    toolName: "memory_assign_tag",
    slug: "system:assign-tag",
    description:
      "Assign a tag to a person, org, work, billing record, or file. Creates the tag if it doesn't exist.",
    schema: assignTagInputSchema,
    risk: "mutating",
    needsApproval: false,
  },
  {
    toolName: "memory_unassign_tag",
    slug: "system:unassign-tag",
    description: "Remove a tag from an entity.",
    schema: unassignTagInputSchema,
    risk: "mutating",
    needsApproval: false,
  },
  {
    toolName: "memory_create_tag",
    slug: "system:create-tag",
    description:
      "Create a new tag for categorizing records. Specify scope to limit which entity types can use it.",
    schema: createTagInputSchema,
    risk: "mutating",
    needsApproval: false,
  },
];

/** Lookup tools are separate from play slugs — keyed by toolName. */
export const LOOKUP_TOOL_NAMES = ["memory_find_people", "memory_find_orgs", "memory_find_work", "memory_find_meetings", "memory_find_billing", "memory_find_files", "memory_find_me_facts", "memory_find_tags"] as const;

export function getRecordActionToolSpecByName(
  toolName: string,
): RecordActionDefinitionToolSpec | undefined {
  return RECORD_ACTION_TOOL_SPECS.find((spec) => spec.toolName === toolName);
}
