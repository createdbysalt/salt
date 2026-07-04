import { describe, expect, it } from "vitest";
import { runAdapterConformance } from "./adapter-conformance";
import { stripeCaptureAdapter } from "./stripe";
import {
  STRIPE_CHARGE_FAILED,
  STRIPE_CHARGE_SUCCEEDED,
  STRIPE_CUSTOMER_OBJECT,
  STRIPE_EVENT_NESTED_INVOICE,
  STRIPE_INVOICE_OPEN,
  STRIPE_INVOICE_PAID,
  STRIPE_TRIGGER_INVOICE_PAYMENT_SUCCEEDED,
} from "./__fixtures__/stripe-payloads";

describe("stripe capture adapter conformance", () => {
  it("passes the shared harness across payload shapes", () => {
    runAdapterConformance(stripeCaptureAdapter, [
      {
        name: "open invoice",
        payload: STRIPE_INVOICE_OPEN,
        expectExternalId: "in_1PZk2xLkdIwHu7ixVNsGr8mB",
      },
      {
        name: "paid invoice",
        payload: STRIPE_INVOICE_PAID,
        expectExternalId: "in_1PZm4yLkdIwHu7ixWOtHs9nC",
      },
      {
        name: "succeeded charge",
        payload: STRIPE_CHARGE_SUCCEEDED,
        expectExternalId: "ch_3PZn5zLkdIwHu7ix0XpIt0oD",
      },
      {
        name: "webhook-nested invoice",
        payload: STRIPE_EVENT_NESTED_INVOICE,
        expectExternalId: "in_1PZp7bLkdIwHu7ix3AsLw3rG",
      },
      {
        name: "invoice-payment-succeeded trigger (body-wrapped event)",
        payload: STRIPE_TRIGGER_INVOICE_PAYMENT_SUCCEEDED,
        expectExternalId: "in_1PZq8cLkdIwHu7ix5CuNy5tI",
      },
      { name: "failed charge declines", payload: STRIPE_CHARGE_FAILED, expectExternalId: null },
      { name: "customer object declines", payload: STRIPE_CUSTOMER_OBJECT, expectExternalId: null },
      { name: "non-object declines", payload: "nonsense", expectExternalId: null },
    ]);
  });

  it("formats invoice titles with currency amounts", () => {
    const envelope = stripeCaptureAdapter.normalize(STRIPE_INVOICE_OPEN);
    expect(envelope?.title).toBe("Invoice SALT-0042 — $2,500.00");
    expect(envelope?.extracted.amount).toBe(2500);
    expect(envelope?.extracted.currency).toBe("USD");
  });

  it("captures the payer with lowered email", () => {
    const envelope = stripeCaptureAdapter.normalize(STRIPE_INVOICE_OPEN);
    expect(envelope?.participants).toContainEqual({
      email: "billing@northwind.com",
      name: "Northwind Studio",
      role: "payer",
    });
  });

  it("converts epoch timestamps to ISO", () => {
    const envelope = stripeCaptureAdapter.normalize(STRIPE_CHARGE_SUCCEEDED);
    expect(envelope?.occurredAt).toBe(new Date(1782172800 * 1000).toISOString());
  });

  it("groups items by customer via threadId", () => {
    const invoice = stripeCaptureAdapter.normalize(STRIPE_INVOICE_PAID);
    const charge = stripeCaptureAdapter.normalize(STRIPE_CHARGE_SUCCEEDED);
    expect(invoice?.threadId).toBe("cus_QPz71fJ8kQxT2a");
    expect(invoice?.threadId).toBe(charge?.threadId);
  });
});
