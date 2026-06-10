import { formatMoney, relativeDays, type ActivityEvent, type Invoice, type SourceKind } from "@/app/_lib/demo/people-demo-data";

export { relativeDays, formatMoney };

export type BillingDirection = "receivable" | "payable";
export type PayableCategory = "contractor" | "software" | "other";

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
  status: Invoice["status"];
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
  tags: string[];
};

export const PAYABLE_CATEGORY_LABEL: Record<PayableCategory, string> = {
  contractor: "Contractor",
  software: "Software",
  other: "Other",
};

export const BILLING_RECORDS: BillingRecord[] = [];

export function billingRecordsForDirection(direction: BillingDirection): BillingRecord[] {
  return BILLING_RECORDS.filter((r) => r.direction === direction);
}
