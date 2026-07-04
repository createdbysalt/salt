import type { BillingDirection } from "../data";
import type { BillingRecordDraft } from "../actions/billing-record-draft";

export function buildBlankBillingDraft(direction: BillingDirection): BillingRecordDraft {
  const now = new Date();
  const due = new Date(now);
  due.setDate(due.getDate() + 14);
  due.setHours(12, 0, 0, 0);

  return {
    direction,
    number: `${direction === "receivable" ? "INV" : "BILL"}-${now.getFullYear()}-${String(
      Math.floor(Math.random() * 9000) + 1000,
    )}`,
    amountCents: 100,
    currency: "USD",
    status: "draft",
    dueAt: due.toISOString(),
    issuedAt: now.toISOString(),
    ...(direction === "receivable"
      ? { org: { id: "pending", name: "Unmatched customer" } }
      : { vendorLabel: "Unmatched vendor", category: "other" as const }),
    lineItems: [
      {
        description: direction === "receivable" ? "New invoice item" : "New payable item",
        amountCents: 100,
      },
    ],
    tags: ["manual", "draft"],
    extraction: {
      confidence: 100,
      needsReview: ["party", "amountCents", "dueAt"],
      sourceDocId: "manual",
    },
  };
}
