import { z } from "zod";
import { CurrencySchema } from "./schemas";

const BillingLineItemDraftSchema = z.object({
  description: z.string().min(1).max(180),
  amountCents: z.number().int(),
});

export const BillingRecordDraftSchema = z.object({
  direction: z.enum(["receivable", "payable"]),
  number: z.string().min(1).max(80),
  amountCents: z.number().int().refine((value) => value !== 0, {
    message: "Amount must not be zero",
  }),
  // Normalized to the uppercase ISO-4217 canon — the billing_records CHECK
  // (20260703180000) and CurrencySchema are uppercase.
  currency: z
    .string()
    .min(3)
    .max(3)
    .transform((value) => value.toUpperCase())
    .pipe(CurrencySchema)
    .default("USD"),
  status: z.enum(["draft", "due", "overdue", "paid", "partial", "refunded", "disputed"]).default("draft"),
  dueAt: z.string().datetime(),
  issuedAt: z.string().datetime().optional(),
  paidAt: z.string().datetime().optional(),
  org: z.object({ id: z.string(), name: z.string() }).optional(),
  billTo: z
    .object({
      kind: z.literal("person").default("person"),
      id: z.string(),
      name: z.string(),
      subtitle: z.string().optional(),
    })
    .optional(),
  payTo: z
    .object({
      kind: z.literal("person").default("person"),
      id: z.string(),
      name: z.string(),
      subtitle: z.string().optional(),
    })
    .optional(),
  vendorLabel: z.string().max(140).optional(),
  work: z.object({ id: z.string(), title: z.string() }).optional(),
  category: z.enum(["contractor", "software", "other"]).optional(),
  lineItems: z.array(BillingLineItemDraftSchema).min(1),
  tags: z.array(z.string()).default([]),
  extraction: z
    .object({
      confidence: z.number().int().min(0).max(100),
      needsReview: z.array(z.string()),
      sourceDocId: z.string().optional(),
    })
    .optional(),
  worthAttention: z
    .object({
      reason: z.string(),
      suggestedPlay: z.string().optional(),
    })
    .optional(),
});

export type BillingRecordDraft = z.infer<typeof BillingRecordDraftSchema>;

export type CreateBillingRecordResult = {
  id: string;
  href: string;
  alreadyExists?: boolean;
};
