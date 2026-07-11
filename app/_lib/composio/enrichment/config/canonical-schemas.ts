import { z } from "zod";

/**
 * Canonical schemas for Memory entity types.
 * These define the target fields that enrichment can populate.
 * Field names here are the "truth" that connector configs map TO.
 */

export const personCanonicalSchema = z.object({
  name: z.string(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  title: z.string().optional(),
  company: z.string().optional(),
  address_line_1: z.string().optional(),
  address_line_2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postal_code: z.string().optional(),
  country: z.string().optional(),
  website: z.string().url().optional(),
  linkedin_url: z.string().url().optional(),
  twitter_handle: z.string().optional(),
  timezone: z.string().optional(),
  notes: z.string().optional(),
  last_contact_at: z.string().datetime().optional(),
});

export const orgCanonicalSchema = z.object({
  name: z.string(),
  domain: z.string().optional(),
  industry_parent: z.string().optional(),
  industry_child: z.string().optional(),
  estimated_budget_tier: z.enum(["micro", "small", "medium", "large", "enterprise"]).optional(),
  address_line_1: z.string().optional(),
  address_line_2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postal_code: z.string().optional(),
  country: z.string().optional(),
  website: z.string().url().optional(),
  linkedin_url: z.string().url().optional(),
  notes: z.string().optional(),
  last_contact_at: z.string().datetime().optional(),
});

export const workCanonicalSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  base_price_cents: z.number().int().optional(),
  currency: z.string().optional(),
  is_bundle: z.boolean().optional(),
  value_proposition: z.string().optional(),
  deliverables: z.string().optional(),
  prerequisites: z.string().optional(),
  differentiators: z.string().optional(),
  notes: z.string().optional(),
});

export const billingCanonicalSchema = z.object({
  direction: z.enum(["receivable", "payable"]),
  amount_cents: z.number().int(),
  currency: z.string(),
  status: z.enum(["draft", "sent", "paid", "overdue", "cancelled"]),
  vendor_label: z.string().optional(),
  number: z.string().optional(),
  due_at: z.string().datetime().optional(),
  paid_at: z.string().datetime().optional(),
  description: z.string().optional(),
  notes: z.string().optional(),
});

export const meetingCanonicalSchema = z.object({
  title: z.string(),
  start_time: z.string().datetime(),
  end_time: z.string().datetime(),
  meeting_type: z.enum(["call", "video", "in_person", "other"]).optional(),
  location: z.string().optional(),
  conference_url: z.string().url().optional(),
  description: z.string().optional(),
  notes: z.string().optional(),
});

export const fileCanonicalSchema = z.object({
  file_name: z.string(),
  category: z.enum(["contract", "proposal", "invoice", "asset", "reference", "other"]),
  description: z.string().optional(),
  document_type: z.string().optional(),
  external_url: z.string().url().optional(),
  mime_type: z.string().optional(),
  file_size_bytes: z.number().int().optional(),
  notes: z.string().optional(),
});

export const meCanonicalSchema = z.object({
  value: z.string(),
  label: z.string().optional(),
  category: z.enum([
    "skill",
    "credential",
    "preference",
    "boundary",
    "goal",
    "contact",
    "bio",
    "other",
  ]),
  kind: z.enum(["fact", "preference", "goal", "boundary"]),
  notes: z.string().optional(),
});

export const CANONICAL_SCHEMAS = {
  person: personCanonicalSchema,
  org: orgCanonicalSchema,
  work: workCanonicalSchema,
  billing: billingCanonicalSchema,
  meeting: meetingCanonicalSchema,
  file: fileCanonicalSchema,
  me: meCanonicalSchema,
} as const;

export type CanonicalSchemaType = keyof typeof CANONICAL_SCHEMAS;

export function getCanonicalFields(entityType: CanonicalSchemaType): string[] {
  const schema = CANONICAL_SCHEMAS[entityType];
  if (!schema || !("shape" in schema)) return [];
  return Object.keys(schema.shape);
}

export type PersonCanonical = z.infer<typeof personCanonicalSchema>;
export type OrgCanonical = z.infer<typeof orgCanonicalSchema>;
export type WorkCanonical = z.infer<typeof workCanonicalSchema>;
export type BillingCanonical = z.infer<typeof billingCanonicalSchema>;
export type MeetingCanonical = z.infer<typeof meetingCanonicalSchema>;
export type FileCanonical = z.infer<typeof fileCanonicalSchema>;
export type MeCanonical = z.infer<typeof meCanonicalSchema>;
