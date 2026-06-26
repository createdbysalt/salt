import type { BillingRecordDraft } from "../actions/billing-record-draft";

export function applyAlreadyPaidToDraft(draft: BillingRecordDraft): BillingRecordDraft {
  const now = new Date().toISOString();
  const intakeTag = draft.direction === "receivable" ? "payment-received" : "receipt";

  return {
    ...draft,
    status: "paid",
    paidAt: now,
    worthAttention: undefined,
    tags: [...new Set([...draft.tags.filter((tag) => tag !== "draft"), intakeTag, "paid"])],
  };
}
