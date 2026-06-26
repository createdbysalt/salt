import type { BillingRecord } from "../data";

const day = (offset: number) => {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  date.setHours(12, 0, 0, 0);
  return date.toISOString();
};

export const billingRecordFixtures = {
  stripeInvoice: {
    id: "br-stripe-inv-2041",
    direction: "receivable",
    number: "INV-2041",
    amountCents: 480000,
    amountPaidCents: 0,
    currency: "USD",
    status: "due",
    dueAt: day(3),
    issuedAt: day(-18),
    org: { id: "northwind", name: "Northwind Studio" },
    billTo: { kind: "person", id: "maya-chen", name: "Maya Chen", subtitle: "Head of Brand" },
    work: { id: "nw-site", title: "Marketing site relaunch" },
    lineItems: [
      { description: "Marketing site relaunch — design phase", amountCents: 320000 },
      { description: "Project management", amountCents: 160000 },
    ],
    activity: [],
    worthAttention: {
      reason: "Invoice is 3 days past due. Site work is stalled pending exec review.",
      suggestedPlay: "Send warm payment reminder with timeline context",
    },
    source: "imported",
    provider: "stripe",
    origin: "found",
    sourceExternalId: "in_1QxNw2041Northwind",
    tags: ["client", "retainer"],
    retainerTier: "Growth",
    mrrCents: 1_200_000,
  },
  shopifyPartial: {
    id: "br-shopify-payout-4431",
    direction: "receivable",
    number: "SHOP-4431",
    amountCents: 132500,
    amountPaidCents: 75000,
    currency: "USD",
    status: "partial",
    dueAt: day(3),
    issuedAt: day(-7),
    org: { id: "org-sable", name: "Sable Goods" },
    lineItems: [
      { description: "Product page optimization", amountCents: 95000 },
      { description: "Shopify theme QA", amountCents: 37500 },
    ],
    activity: [],
    source: "imported",
    provider: "shopify",
    origin: "found",
    recurrence: { seriesId: "rec-shopify-sable", cadence: "monthly", nextAt: day(33) },
    tags: ["partial"],
  },
  manualPdf: {
    id: "br-manual-pdf-1408",
    direction: "payable",
    number: "DOC-1408",
    amountCents: 37500,
    currency: "USD",
    status: "draft",
    dueAt: day(10),
    issuedAt: day(0),
    vendorLabel: "Northstar Printing",
    category: "other",
    lineItems: [
      { description: "Printed workshop materials", amountCents: 31000 },
      { description: "Shipping", amountCents: 6500 },
    ],
    activity: [],
    source: "user",
    provider: "manual",
    origin: "added",
    extraction: {
      confidence: 78,
      needsReview: ["category", "dueAt"],
      sourceDocId: "billing-documents/mock/northstar-printing.pdf",
    },
    tags: ["document"],
  },
} satisfies Record<string, BillingRecord>;
