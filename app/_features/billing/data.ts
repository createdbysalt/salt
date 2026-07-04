import { relativeDays, type ActivityEvent, type SourceKind } from "@/app/_lib/demo/people-demo-data";

export { relativeDays };

export type BillingDirection = "receivable" | "payable";
export type PayableCategory = "contractor" | "software" | "other";
export type BillingProvider =
  | "stripe"
  | "quickbooks"
  | "square"
  | "shopify"
  | "lemonsqueezy"
  | "mercury"
  | "manual";
export type BillingOrigin = "found" | "added";
export type BillingStatus = "paid" | "due" | "overdue" | "draft" | "partial" | "refunded" | "disputed";
export type BillingRecurrence = {
  seriesId: string;
  cadence: "monthly" | "yearly" | "weekly";
  nextAt?: string;
};
export type BillingExtraction = {
  confidence: number;
  needsReview: string[];
  sourceDocId?: string;
};

export type BillingPersonRef = {
  kind: "person";
  id: string;
  name: string;
  subtitle?: string;
};

export type BillingRecord = {
  id: string;
  direction: BillingDirection;
  number: string;
  amountCents: number;
  amountPaidCents?: number;
  currency: string;
  status: BillingStatus;
  dueAt: string;
  issuedAt: string;
  paidAt?: string;
  org?: { id: string; name: string };
  billTo?: BillingPersonRef;
  payTo?: BillingPersonRef;
  vendorLabel?: string;
  work?: { id: string; title: string };
  category?: PayableCategory;
  lineItems: { description: string; amountCents: number }[];
  activity: ActivityEvent[];
  worthAttention?: { reason: string; suggestedPlay?: string };
  source: SourceKind;
  provider: BillingProvider;
  origin: BillingOrigin;
  sourceExternalId?: string;
  captureId?: string;
  appUrl?: string;
  recurrence?: BillingRecurrence;
  extraction?: BillingExtraction;
  duplicateOf?: string;
  tags: string[];
  /** User chose "Added manually" instead of Salt extraction display */
  sourceReclassifiedAsManual?: boolean;
  /** Enriched from linked org metadata when available. */
  retainerTier?: string;
  mrrCents?: number;
};

export const PAYABLE_CATEGORY_LABEL: Record<PayableCategory, string> = {
  contractor: "Contractor",
  software: "Software",
  other: "Other",
};

export const BILLING_STATUS_LABEL: Record<BillingStatus, string> = {
  paid: "Paid",
  due: "Due",
  overdue: "Overdue",
  draft: "Draft",
  partial: "Partial",
  refunded: "Refunded",
  disputed: "Disputed",
};

export function formatBillingMoney(amountCents: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amountCents / 100);
}
