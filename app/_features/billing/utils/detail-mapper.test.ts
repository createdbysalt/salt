import { describe, expect, it } from "vitest";
import { billingRecordFixtures } from "../fixtures/billing-record-fixtures";
import { buildBillingSummary, toBillingDetailViewModel } from "./detail-mapper";

describe("toBillingDetailViewModel", () => {
  it("maps a connector invoice with org context and open balance", () => {
    const view = toBillingDetailViewModel(billingRecordFixtures.stripeInvoice);

    expect(view.number).toBe("INV-2041");
    expect(view.providerDisplay.label).toBe("Stripe");
    expect(view.sourceLabel).toBe("Found in Stripe");
    expect(view.partyLabel).toBe("Northwind Studio");
    expect(view.balance).toBe("$4,800.00");
    expect(view.retainerTier).toBe("Growth");
    expect(view.mrr).toBe("$12,000.00");
    expect(view.statusReasons.some((reason) => reason.label === "Awaiting payment")).toBe(true);
    expect(view.connections.map((connection) => connection.type)).toEqual(["org", "person", "work"]);
  });

  it("maps partial payments with an open balance", () => {
    const view = toBillingDetailViewModel(billingRecordFixtures.shopifyPartial);

    expect(view.statusLabel).toBe("Partial");
    expect(view.amountPaid).toBe("$750.00");
    expect(view.balance).toBe("$575.00");
    expect(view.recurrenceLabel).toContain("Recurring monthly");
  });

  it("keeps uploaded document records reviewable", () => {
    const view = toBillingDetailViewModel(billingRecordFixtures.manualPdf);

    expect(view.providerDisplay.label).toBe("Added by user");
    expect(view.originLabel).toBe("Added to Salt");
    expect(view.paymentFlowLabel).toBe("Money out");
    expect(view.paymentSidebar.heroLabel).toBe("Payable draft");
    expect(view.extraction?.needsReview).toEqual(["category", "dueAt"]);
    expect(view.summary).toContain("Northstar Printing");
  });

  it("builds receivable and payable summaries", () => {
    const invoiceSummary = buildBillingSummary(billingRecordFixtures.stripeInvoice, 480000);
    expect(invoiceSummary).toContain("INV-2041");
    expect(invoiceSummary).toContain("Northwind Studio");
    expect(invoiceSummary).toContain("outstanding");

    const payableSummary = buildBillingSummary(billingRecordFixtures.manualPdf, 37500);
    expect(payableSummary).toContain("Northstar Printing");
    expect(payableSummary).toContain("review");
  });
});
