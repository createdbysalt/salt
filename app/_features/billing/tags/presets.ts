/**
 * Billing Tag Presets
 *
 * Suggested tags for billing records. These are created lazily
 * when a user first visits a billing detail page.
 */

export type BillingTagPreset = {
  slug: string;
  label: string;
  category: "priority" | "segment" | "signal" | "custom";
  direction?: "receivable" | "payable" | "both";
  aiDescription: string;
};

export const BILLING_TAG_PRESETS: BillingTagPreset[] = [
  // Receivables (invoices)
  {
    slug: "priority",
    label: "Priority",
    category: "priority",
    direction: "receivable",
    aiDescription: "High-value or time-sensitive invoice requiring immediate attention",
  },
  {
    slug: "follow-up-needed",
    label: "Follow-up needed",
    category: "signal",
    direction: "receivable",
    aiDescription: "Invoice needs a reminder or collection follow-up",
  },
  {
    slug: "at-risk",
    label: "At risk",
    category: "signal",
    direction: "receivable",
    aiDescription: "Payment is at risk due to client situation or history",
  },
  {
    slug: "vip-client",
    label: "VIP client",
    category: "segment",
    direction: "receivable",
    aiDescription: "Invoice from a high-value or strategic client",
  },
  {
    slug: "retainer",
    label: "Retainer",
    category: "segment",
    direction: "receivable",
    aiDescription: "Part of a recurring retainer agreement",
  },
  {
    slug: "deposit",
    label: "Deposit",
    category: "segment",
    direction: "receivable",
    aiDescription: "Upfront deposit payment before work begins",
  },
  {
    slug: "milestone",
    label: "Milestone",
    category: "segment",
    direction: "receivable",
    aiDescription: "Payment tied to a project milestone completion",
  },
  {
    slug: "final",
    label: "Final",
    category: "segment",
    direction: "receivable",
    aiDescription: "Final payment for a completed project",
  },

  // Payables (bills)
  {
    slug: "contractor",
    label: "Contractor",
    category: "segment",
    direction: "payable",
    aiDescription: "Payment to a freelancer, agency, or subcontractor",
  },
  {
    slug: "essential",
    label: "Essential",
    category: "priority",
    direction: "payable",
    aiDescription: "Critical expense that must be paid (rent, insurance, etc.)",
  },
  {
    slug: "can-defer",
    label: "Can defer",
    category: "signal",
    direction: "payable",
    aiDescription: "Payment timing is flexible and can be delayed if needed",
  },
  {
    slug: "tax-deductible",
    label: "Tax deductible",
    category: "segment",
    direction: "payable",
    aiDescription: "Expense is tax-deductible for accounting purposes",
  },
  {
    slug: "reimbursable",
    label: "Reimbursable",
    category: "segment",
    direction: "payable",
    aiDescription: "Expense will be reimbursed by a client",
  },
  {
    slug: "subscription",
    label: "Subscription",
    category: "segment",
    direction: "payable",
    aiDescription: "Recurring subscription for software or services",
  },
  {
    slug: "software",
    label: "Software",
    category: "segment",
    direction: "payable",
    aiDescription: "Software license, tool, or SaaS payment",
  },

  // Shared (both directions)
  {
    slug: "recurring",
    label: "Recurring",
    category: "segment",
    direction: "both",
    aiDescription: "Part of a recurring billing series",
  },
  {
    slug: "auto-pay",
    label: "Auto-pay",
    category: "signal",
    direction: "both",
    aiDescription: "Payment is handled automatically",
  },
  {
    slug: "needs-review",
    label: "Needs review",
    category: "signal",
    direction: "both",
    aiDescription: "Record needs human review before action",
  },
  {
    slug: "disputed",
    label: "Disputed",
    category: "signal",
    direction: "both",
    aiDescription: "Payment or amount is in dispute",
  },
];

export function getPresetsForDirection(
  direction: "receivable" | "payable"
): BillingTagPreset[] {
  return BILLING_TAG_PRESETS.filter(
    (preset) => preset.direction === direction || preset.direction === "both"
  );
}
