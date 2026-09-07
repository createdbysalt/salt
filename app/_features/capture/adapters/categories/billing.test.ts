import { describe, it, expect } from "vitest";
import {
  createBillingCategoryAdapter,
  getBillingAdapter,
  parseQuickbooksBalanceDetailReport,
} from "./billing";
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

    it("converts Stripe minor units to decimal dollars exactly once (25000 cents -> 250)", () => {
      const payload = {
        id: "evt_golden",
        type: "invoice.payment_succeeded",
        data: {
          object: {
            id: "in_golden",
            customer_email: "golden@example.com",
            amount_paid: 25000,
            currency: "usd",
            status: "paid",
            created: 1720000000,
            due_date: 1721000000,
          },
        },
      };

      const envelope = adapter.normalize(payload);

      expect(envelope?.extracted.amount).toBe(250);
      expect(envelope?.extracted.amount_paid).toBe(250);
      expect(envelope?.extracted.due_date).toBe(
        new Date(1721000000 * 1000).toISOString()
      );
      // UI renders extracted amounts as-is (no second /100)
      const rendered = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(envelope?.extracted.amount as number);
      expect(rendered).toBe("$250.00");
    });

    it("falls back to amount_due for unpaid invoices in the amount alias", () => {
      const payload = {
        id: "evt_due",
        type: "invoice.created",
        data: {
          object: {
            id: "in_due",
            customer_email: "due@example.com",
            amount_due: 50000,
            currency: "usd",
            status: "open",
            created: 1720000000,
          },
        },
      };

      const envelope = adapter.normalize(payload);
      expect(envelope?.extracted.amount).toBe(500);
      expect(envelope?.extracted.amount_due).toBe(500);
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

    it("carries the hosted invoice URL through the extracted payload", () => {
      // Artifact-first (Phase 7): the hosted invoice page becomes the
      // billing record's link Resource.
      const envelope = adapter.normalize(STRIPE_TRIGGER_INVOICE_PAYMENT_SUCCEEDED);
      expect(envelope?.extracted.hosted_invoice_url).toBe(
        "https://invoice.stripe.com/i/acct_test/in_1PZq8c",
      );
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

    it("keeps QuickBooks decimal dollars as-is (2060.00 -> $2,060.00) with currency default", () => {
      const payload = {
        Id: "qb-golden",
        DocNumber: "2042",
        TxnDate: "2026-08-01",
        DueDate: "2026-08-15",
        CustomerRef: { name: "Golden Co" },
        BillEmail: { Address: "ap@golden.co" },
        TotalAmt: 2060.0,
        Balance: 2060.0,
      };

      const envelope = adapter.normalize(payload);

      expect(envelope?.extracted.amount).toBe(2060);
      expect(envelope?.extracted.currency).toBe("usd");
      expect(envelope?.extracted.invoice_number).toBe("2042");
      expect(envelope?.extracted.due_date).toBe("2026-08-15");
      const rendered = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(envelope?.extracted.amount as number);
      expect(rendered).toBe("$2,060.00");
    });

    it("respects CurrencyRef and marks zero-balance invoices paid", () => {
      const payload = {
        Id: "qb-cad",
        DocNumber: "77",
        CurrencyRef: { value: "CAD" },
        TotalAmt: 100,
        Balance: 0,
      };

      const envelope = adapter.normalize(payload);
      expect(envelope?.extracted.currency).toBe("cad");
      expect(envelope?.extracted.status).toBe("paid");
    });

    it("returns null for invalid payload", () => {
      expect(adapter.normalize(null)).toBeNull();
      expect(adapter.normalize({})).toBeNull();
    });
  });

  describe("quickbooks balance-detail report (backfill path)", () => {
    const adapter = createBillingCategoryAdapter("quickbooks");

    // Intuit standard report shape returned by QUICKBOOKS_CUSTOMER_BALANCE_DETAIL
    // (the only invoice-level read in the reworked toolkit, verified 2026-08-06).
    const REPORT = {
      Header: { ReportName: "CustomerBalanceDetail" },
      Columns: {
        Column: [
          { ColTitle: "Date", ColType: "tx_date" },
          { ColTitle: "Transaction Type", ColType: "txn_type" },
          { ColTitle: "Num", ColType: "doc_num" },
          { ColTitle: "Due Date", ColType: "due_date" },
          { ColTitle: "Email", ColType: "cust_bill_email" },
          { ColTitle: "Amount", ColType: "subt_amount" },
          { ColTitle: "Open Balance", ColType: "open_balance" },
        ],
      },
      Rows: {
        Row: [
          {
            type: "Section",
            Header: { ColData: [{ value: "Acme Creative", id: "42" }] },
            Rows: {
              Row: [
                {
                  type: "Data",
                  ColData: [
                    { value: "2026-07-01" },
                    { value: "Invoice", id: "130" },
                    { value: "1037" },
                    { value: "2026-07-31" },
                    { value: "billing@acme.co" },
                    { value: "1,362.07" },
                    { value: "362.07" },
                  ],
                },
              ],
            },
            Summary: { ColData: [{ value: "Total for Acme Creative" }] },
          },
        ],
      },
    };

    it("flattens report sections into per-transaction rows", () => {
      const rows = parseQuickbooksBalanceDetailReport(REPORT);

      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        customer_name: "Acme Creative",
        tx_date: "2026-07-01",
        txn_type: "Invoice",
        doc_num: "1037",
        due_date: "2026-07-31",
        cust_bill_email: "billing@acme.co",
        subt_amount: "1,362.07",
        open_balance: "362.07",
        txn_id: "130",
      });
    });

    it("unwraps the executor payload shape (live golden fixture)", () => {
      // Verbatim shape from a live QUICKBOOKS_CUSTOMER_BALANCE_DETAIL
      // execution against staging (2026-08-06): the executor strips Composio's
      // envelope, leaving the Intuit report wrapped one more level down in
      // { data: {...} }. Includes the empty filler Data row QBO appends.
      const executorPayload = {
        data: {
          Columns: {
            Column: [
              { ColTitle: "Date", ColType: "tx_date" },
              { ColTitle: "Transaction Type", ColType: "txn_type" },
              { ColTitle: "Num", ColType: "doc_num" },
              { ColTitle: "Client", ColType: "cust_name" },
              { ColTitle: "Email", ColType: "cust_bill_email" },
              { ColTitle: "Due Date", ColType: "due_date" },
              { ColTitle: "Memo/Description", ColType: "memo" },
            ],
          },
          Header: { Currency: "USD", ReportName: "CustomerBalanceDetail" },
          Rows: {
            Row: [
              {
                type: "Section",
                Header: {
                  ColData: [
                    { id: "42", value: "Sam Example" },
                    { value: "" },
                    { value: "" },
                    { value: "" },
                    { value: "" },
                    { value: "" },
                    { value: "" },
                  ],
                },
                Rows: {
                  Row: [
                    {
                      type: "Data",
                      ColData: [
                        { value: "2026-05-26" },
                        { id: "155", value: "Invoice" },
                        { value: "1032" },
                        { id: "42", value: "Sam Example" },
                        { value: "frank@vivachurch.ca" },
                        { value: "2026-06-25" },
                        { value: "" },
                      ],
                    },
                    {
                      type: "Data",
                      ColData: [
                        { value: "" },
                        { value: "" },
                        { value: "" },
                        { value: "" },
                        { value: "" },
                        { value: "" },
                        { value: "" },
                      ],
                    },
                  ],
                },
              },
            ],
          },
        },
      };

      const rows = parseQuickbooksBalanceDetailReport(executorPayload);

      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        customer_name: "Sam Example",
        tx_date: "2026-05-26",
        txn_type: "Invoice",
        doc_num: "1032",
        cust_bill_email: "frank@vivachurch.ca",
        due_date: "2026-06-25",
        txn_id: "155",
      });

      const envelope = adapter.normalize(rows[0]);
      expect(envelope?.externalId).toBe("qbo:155");
      expect(envelope?.participants).toEqual([
        { email: "frank@vivachurch.ca", name: "Sam Example", role: "payer" },
      ]);
    });

    it("normalizes a flattened report row into a billing envelope", () => {
      const [row] = parseQuickbooksBalanceDetailReport(REPORT);
      const envelope = adapter.normalize(row);

      expect(envelope).not.toBeNull();
      expect(envelope?.sourceType).toBe("quickbooks");
      expect(envelope?.captureType).toBe("payment");
      expect(envelope?.externalId).toBe("qbo:130");
      expect(envelope?.title).toBe("QuickBooks Invoice 1037");
      expect(envelope?.occurredAt).toBe("2026-07-01");
      expect(envelope?.participants).toEqual([
        { email: "billing@acme.co", name: "Acme Creative", role: "payer" },
      ]);
      // subt_amount is the invoice TOTAL; paid = total − open balance.
      expect(envelope?.extracted.amount).toBe(1362.07);
      expect(envelope?.extracted.amount_paid).toBe(1000);
      expect(envelope?.extracted.balance).toBe(362.07);
      expect(envelope?.extracted.due_date).toBe("2026-07-31");
    });

    it("dedupes on doc number when the report row has no txn id", () => {
      const envelope = adapter.normalize({
        customer_name: "Acme Creative",
        txn_type: "Invoice",
        doc_num: "2001",
        tx_date: "2026-07-15",
      });

      expect(envelope?.externalId).toBe("qbo:Invoice:2001");
    });

    it("returns empty rows for malformed reports", () => {
      expect(parseQuickbooksBalanceDetailReport(null)).toEqual([]);
      expect(parseQuickbooksBalanceDetailReport({})).toEqual([]);
      expect(parseQuickbooksBalanceDetailReport("nope")).toEqual([]);
    });
  });

  describe("generic billing normalization", () => {
    const adapter = createBillingCategoryAdapter("xero");

    it("writes the amount alias and currency without unit conversion", () => {
      const payload = {
        id: "xero-1",
        amount: 1234.56,
        currency: "NZD",
        status: "open",
        due_date: "2026-09-01",
        customer_email: "billing@client.nz",
      };

      const envelope = adapter.normalize(payload);
      expect(envelope?.extracted.amount).toBe(1234.56);
      expect(envelope?.extracted.amount_paid).toBe(1234.56);
      expect(envelope?.extracted.currency).toBe("nzd");
      expect(envelope?.extracted.status).toBe("open");
      expect(envelope?.extracted.due_date).toBe("2026-09-01");
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
