import { describe, it, expect } from "vitest";
import { createBillingCategoryAdapter, getBillingAdapter } from "./billing";

describe("billing category adapter", () => {
  describe("getBillingAdapter", () => {
    it("returns adapter for stripe", () => {
      const adapter = getBillingAdapter("stripe");
      expect(adapter).not.toBeNull();
      expect(adapter?.sourceType).toBe("stripe");
    });

    it("returns adapter for quickbooks", () => {
      const adapter = getBillingAdapter("quickbooks");
      expect(adapter).not.toBeNull();
      expect(adapter?.sourceType).toBe("quickbooks");
    });

    it("returns null for unknown provider", () => {
      expect(getBillingAdapter("unknown")).toBeNull();
    });

    it("returns null for non-billing provider", () => {
      expect(getBillingAdapter("gmail")).toBeNull();
    });
  });

  describe("stripe normalization", () => {
    const adapter = createBillingCategoryAdapter("stripe");

    it("normalizes stripe invoice event", () => {
      const payload = {
        id: "evt_123",
        type: "invoice.paid",
        data: {
          object: {
            id: "in_456",
            customer_email: "customer@example.com",
            customer_name: "Customer Name",
            amount_paid: 10000,
            amount_due: 10000,
            currency: "usd",
            status: "paid",
            number: "INV-001",
            created: 1720000000,
          },
        },
      };

      const envelope = adapter.normalize(payload);

      expect(envelope).not.toBeNull();
      expect(envelope?.sourceType).toBe("stripe");
      expect(envelope?.captureType).toBe("payment");
      expect(envelope?.externalId).toBe("in_456");
      expect(envelope?.title).toBe("Stripe: invoice.paid");
      expect(envelope?.participants).toHaveLength(1);
      expect(envelope?.participants[0].email).toBe("customer@example.com");
      expect(envelope?.participants[0].role).toBe("payer");
      expect(envelope?.extracted.amount_paid).toBe(100);
      expect(envelope?.extracted.currency).toBe("usd");
    });

    it("normalizes stripe customer event", () => {
      const payload = {
        id: "evt_789",
        type: "customer.created",
        data: {
          object: {
            id: "cus_abc",
            email: "newcustomer@example.com",
            name: "New Customer",
            created: 1720000000,
          },
        },
      };

      const envelope = adapter.normalize(payload);

      expect(envelope).not.toBeNull();
      expect(envelope?.externalId).toBe("cus_abc");
      expect(envelope?.participants[0].email).toBe("newcustomer@example.com");
    });

    it("returns null for invalid payload", () => {
      expect(adapter.normalize(null)).toBeNull();
      expect(adapter.normalize({})).toBeNull();
    });
  });

  describe("quickbooks normalization", () => {
    const adapter = createBillingCategoryAdapter("quickbooks");

    it("normalizes quickbooks invoice", () => {
      const payload = {
        Id: "qb-123",
        DocNumber: "1001",
        TxnDate: "2024-07-12",
        CustomerRef: { name: "Customer Inc" },
        BillEmail: { Address: "billing@customer.com" },
        TotalAmt: 500.0,
        Balance: 0,
      };

      const envelope = adapter.normalize(payload);

      expect(envelope).not.toBeNull();
      expect(envelope?.sourceType).toBe("quickbooks");
      expect(envelope?.captureType).toBe("payment");
      expect(envelope?.externalId).toBe("qb-123");
      expect(envelope?.title).toBe("QuickBooks Invoice 1001");
      expect(envelope?.participants).toHaveLength(1);
      expect(envelope?.participants[0].email).toBe("billing@customer.com");
      expect(envelope?.extracted.amount_paid).toBe(500);
      expect(envelope?.extracted.doc_number).toBe("1001");
    });

    it("returns null for invalid payload", () => {
      expect(adapter.normalize(null)).toBeNull();
      expect(adapter.normalize({})).toBeNull();
    });
  });

  describe("deriveSignals", () => {
    const adapter = createBillingCategoryAdapter("stripe");

    it("sets payment signals for customers", () => {
      const envelopes = [
        {
          sourceType: "stripe" as const,
          captureType: "payment" as const,
          externalId: "1",
          title: "Payment",
          occurredAt: "2024-07-12T10:00:00Z",
          participants: [{ email: "customer@example.com", name: "Customer", role: "payer" as const }],
          threadId: null,
          extracted: { customer_email: "customer@example.com" },
          raw: {},
          noise: null,
        },
      ];

      const signals = adapter.deriveSignals!(envelopes, { userEmail: "me@test.com" });

      expect(signals.has("customer@example.com")).toBe(true);
      const customerSignals = signals.get("customer@example.com");
      expect(customerSignals?.has_payment_received).toBe(true);
      expect(customerSignals?.has_stripe_payment).toBe(true);
      expect(customerSignals?.has_invoice_sent).toBe(true);
    });

    it("handles non-stripe billing sources", () => {
      const envelopes = [
        {
          sourceType: "quickbooks" as const,
          captureType: "payment" as const,
          externalId: "1",
          title: "Payment",
          occurredAt: "2024-07-12T10:00:00Z",
          participants: [],
          threadId: null,
          extracted: { customer_email: "qb-customer@example.com" },
          raw: {},
          noise: null,
        },
      ];

      const signals = adapter.deriveSignals!(envelopes, { userEmail: "me@test.com" });

      expect(signals.has("qb-customer@example.com")).toBe(true);
      const customerSignals = signals.get("qb-customer@example.com");
      expect(customerSignals?.has_payment_received).toBe(true);
      expect(customerSignals?.has_stripe_payment).toBeUndefined();
    });
  });
});
