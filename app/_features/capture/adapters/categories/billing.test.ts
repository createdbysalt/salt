import { describe, it, expect } from "vitest";
import { createBillingCategoryAdapter, getBillingAdapter } from "./billing";
import { runAdapterConformance } from "../adapter-conformance";
import {
  STRIPE_TRIGGER_INVOICE_PAYMENT_SUCCEEDED,
  STRIPE_TRIGGER_CHECKOUT_SESSION_COMPLETED,
  STRIPE_TRIGGER_SUBSCRIPTION_ADDED,
  STRIPE_TRIGGER_SUBSCRIPTION_DELETED,
  STRIPE_TRIGGER_CHARGE_FAILED,
} from "../__fixtures__/stripe-payloads";

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

    it("returns adapter with generic extraction for unknown provider", () => {
      const adapter = getBillingAdapter("unknown");
      expect(adapter).not.toBeNull();
      expect(adapter.sourceType).toBe("unknown");
    });

    it("returns adapter with generic extraction for non-billing provider", () => {
      const adapter = getBillingAdapter("gmail");
      expect(adapter).not.toBeNull();
      expect(adapter.sourceType).toBe("gmail");
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

  describe("stripe trigger payloads (Composio body envelope)", () => {
    // Every STRIPE_*_TRIGGER wraps the full Stripe webhook event in
    // { body, event_type } — verified against the live trigger schemas
    // 2026-08-05 (__fixtures__/composio-trigger-schemas.json).
    const adapter = createBillingCategoryAdapter("stripe");

    it("passes conformance against all five trigger fixtures", () => {
      runAdapterConformance(adapter, [
        {
          name: "invoice.payment_succeeded",
          payload: STRIPE_TRIGGER_INVOICE_PAYMENT_SUCCEEDED,
          expectExternalId: "in_1PZq8cLkdIwHu7ix5CuNy5tI",
        },
        {
          name: "checkout.session.completed",
          payload: STRIPE_TRIGGER_CHECKOUT_SESSION_COMPLETED,
          expectExternalId: "cs_test_a1B2c3D4e5F6g7H8i9J0",
        },
        {
          name: "customer.subscription.created",
          payload: STRIPE_TRIGGER_SUBSCRIPTION_ADDED,
          expectExternalId: "sub_1Qs0eMkdIwHu7ix8FxQb8wL",
        },
        {
          name: "customer.subscription.deleted",
          payload: STRIPE_TRIGGER_SUBSCRIPTION_DELETED,
          expectExternalId: "sub_1Qs0eMkdIwHu7ix8FxQb8wL",
        },
        {
          name: "charge.failed",
          payload: STRIPE_TRIGGER_CHARGE_FAILED,
          expectExternalId: "ch_3Qu2gOkdIwHu7ixB0AtEbBzO",
        },
      ]);
    });

    it("unwraps the body envelope for invoice payments", () => {
      const envelope = adapter.normalize(STRIPE_TRIGGER_INVOICE_PAYMENT_SUCCEEDED);
      expect(envelope?.extracted.event_type).toBe("invoice.payment_succeeded");
      expect(envelope?.extracted.customer_email).toBe("billing@northwind.com");
      expect(envelope?.extracted.amount_paid).toBe(1750);
      expect(envelope?.participants[0]?.role).toBe("payer");
    });

    it("reads checkout sessions from customer_details and amount_total", () => {
      const envelope = adapter.normalize(STRIPE_TRIGGER_CHECKOUT_SESSION_COMPLETED);
      expect(envelope?.extracted.customer_email).toBe("billing@northwind.com");
      expect(envelope?.extracted.customer_name).toBe("Northwind Studio");
      expect(envelope?.extracted.amount_paid).toBe(950);
    });

    it("reads failed charges from billing_details", () => {
      const envelope = adapter.normalize(STRIPE_TRIGGER_CHARGE_FAILED);
      expect(envelope?.extracted.customer_email).toBe("billing@northwind.com");
      expect(envelope?.extracted.status).toBe("failed");
    });

    it("normalizes subscription events without an email", () => {
      const envelope = adapter.normalize(STRIPE_TRIGGER_SUBSCRIPTION_ADDED);
      expect(envelope?.externalId).toBe("sub_1Qs0eMkdIwHu7ix8FxQb8wL");
      expect(envelope?.participants).toHaveLength(0);
      expect(envelope?.extracted.event_type).toBe("customer.subscription.created");
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
