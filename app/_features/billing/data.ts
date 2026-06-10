import { formatMoney, relativeDays, type ActivityEvent, type Invoice, type SourceKind } from "@/app/_lib/demo/people-demo-data";
import { ORGS } from "@/app/_lib/demo/orgs-demo-data";
import { PEOPLE } from "@/app/_lib/demo/people-demo-data";

export { relativeDays, formatMoney };

const day = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
};

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

const northwind = ORGS.find((o) => o.id === "northwind");
const maya = PEOPLE.find((p) => p.id === "maya-chen");

export const BILLING_RECORDS: BillingRecord[] = [
  {
    id: "inv-2041",
    direction: "receivable",
    number: "INV-2041",
    amountCents: 480000,
    status: "overdue",
    dueAt: day(-3),
    issuedAt: day(18),
    org: northwind ? { id: northwind.id, name: northwind.name } : { id: "northwind", name: "Northwind Studio" },
    billTo: maya
      ? { kind: "person", id: maya.id, name: maya.name, subtitle: maya.role }
      : { kind: "person", id: "maya-chen", name: "Maya Chen" },
    work: { id: "nw-site", title: "Marketing site relaunch" },
    lineItems: [
      { description: "Marketing site relaunch — design phase", amountCents: 320000 },
      { description: "Project management", amountCents: 160000 },
    ],
    activity: [
      { id: "a1", at: day(18), kind: "system", label: "Invoice created in Stripe" },
      { id: "a2", at: day(12), kind: "system", label: "Invoice sent to Maya Chen" },
      {
        id: "a3",
        at: day(5),
        kind: "salt",
        label: "Drafted payment reminder",
        detail: "Awaiting approval in Plays",
      },
    ],
    worthAttention: {
      reason: "Invoice is 3 days past due. Site work is stalled pending exec review.",
      suggestedPlay: "Send warm payment reminder with timeline context",
    },
    source: "imported",
    tags: ["retainer", "overdue"],
  },
  {
    id: "inv-2032",
    direction: "receivable",
    number: "INV-2032",
    amountCents: 240000,
    status: "paid",
    dueAt: day(15),
    issuedAt: day(45),
    paidAt: day(20),
    org: northwind ? { id: northwind.id, name: northwind.name } : { id: "northwind", name: "Northwind Studio" },
    billTo: maya
      ? { kind: "person", id: maya.id, name: maya.name }
      : { kind: "person", id: "maya-chen", name: "Maya Chen" },
    lineItems: [{ description: "Brand system refresh — Phase 1", amountCents: 240000 }],
    activity: [{ id: "a1", at: day(20), kind: "system", label: "Payment received" }],
    source: "imported",
    tags: ["brand"],
  },
  {
    id: "bill-figma",
    direction: "payable",
    number: "FIGMA-2026-03",
    amountCents: 4500,
    status: "due",
    dueAt: day(7),
    issuedAt: day(2),
    vendorLabel: "Figma",
    category: "software",
    lineItems: [{ description: "Figma Organization — March", amountCents: 4500 }],
    activity: [{ id: "a1", at: day(2), kind: "system", label: "Bill imported from email" }],
    source: "user",
    tags: ["software", "recurring"],
  },
  {
    id: "bill-contractor",
    direction: "payable",
    number: "ARI-MAR-03",
    amountCents: 85000,
    status: "due",
    dueAt: day(14),
    issuedAt: day(1),
    payTo: { kind: "person", id: "ari-mendez", name: "Ari Mendez", subtitle: "Counsel" },
    vendorLabel: "Ari Mendez LLC",
    category: "contractor",
    lineItems: [{ description: "Atlas SOW redline — March", amountCents: 85000 }],
    activity: [{ id: "a1", at: day(1), kind: "user", label: "Bill logged manually" }],
    source: "user",
    tags: ["contractor"],
  },
];

export function billingRecordsForDirection(direction: BillingDirection): BillingRecord[] {
  return BILLING_RECORDS.filter((r) => r.direction === direction);
}
