/**
 * Golden payload fixtures for the Stripe capture adapter.
 *
 * PROVENANCE: synthesized 2026-07-04 from the Stripe API invoice/charge
 * objects (the per-item shapes STRIPE_LIST_INVOICES / STRIPE_LIST_CHARGES
 * return and the shapes the legacy stripe-ingestion service consumed) — not
 * yet captured live. Replace with live rows when the first stripe backfill
 * runs against a sandbox account.
 */

/** Open invoice with customer details. */
export const STRIPE_INVOICE_OPEN = {
  id: "in_1PZk2xLkdIwHu7ixVNsGr8mB",
  object: "invoice",
  number: "SALT-0042",
  customer: "cus_QPz71fJ8kQxT2a",
  customer_name: "Northwind Studio",
  customer_email: "Billing@northwind.com",
  status: "open",
  amount_due: 250000,
  amount_paid: 0,
  currency: "usd",
  due_date: 1783468800,
  created: 1782950400,
  hosted_invoice_url: "https://invoice.stripe.com/i/acct_test/in_1PZk2x",
};

/** Paid invoice. */
export const STRIPE_INVOICE_PAID = {
  id: "in_1PZm4yLkdIwHu7ixWOtHs9nC",
  object: "invoice",
  number: "SALT-0041",
  customer: "cus_QPz71fJ8kQxT2a",
  customer_name: "Northwind Studio",
  customer_email: "billing@northwind.com",
  status: "paid",
  amount_due: 120000,
  amount_paid: 120000,
  currency: "usd",
  due_date: null,
  created: 1781308800,
  hosted_invoice_url: "https://invoice.stripe.com/i/acct_test/in_1PZm4y",
};

/** Succeeded charge. */
export const STRIPE_CHARGE_SUCCEEDED = {
  id: "ch_3PZn5zLkdIwHu7ix0XpIt0oD",
  object: "charge",
  amount: 120000,
  currency: "usd",
  status: "succeeded",
  customer: "cus_QPz71fJ8kQxT2a",
  description: "Invoice SALT-0041",
  created: 1782172800,
  receipt_url: "https://pay.stripe.com/receipts/ch_3PZn5z",
  billing_details: { email: "billing@northwind.com", name: "Northwind Studio" },
};

/** Failed charge — not settled money, decline. */
export const STRIPE_CHARGE_FAILED = {
  id: "ch_3PZo6aLkdIwHu7ix1YqJu1pE",
  object: "charge",
  amount: 45000,
  currency: "usd",
  status: "failed",
  customer: "cus_QPz71fJ8kQxT2a",
  created: 1782259200,
};

/** Webhook-style nesting under data.object. */
export const STRIPE_EVENT_NESTED_INVOICE = {
  id: "evt_1PZp7bLkdIwHu7ix2ZrKv2qF",
  object: "event",
  type: "invoice.finalized",
  data: {
    object: {
      id: "in_1PZp7bLkdIwHu7ix3AsLw3rG",
      object: "invoice",
      number: "SALT-0043",
      customer: "cus_QPz71fJ8kQxT2a",
      customer_email: "billing@northwind.com",
      status: "open",
      amount_due: 90000,
      amount_paid: 0,
      currency: "usd",
      created: 1783036800,
      hosted_invoice_url: "https://invoice.stripe.com/i/acct_test/in_1PZp7b",
    },
  },
};

/**
 * STRIPE_INVOICE_PAYMENT_SUCCEEDED_TRIGGER payload — verified against the
 * live trigger schema 2026-07-04: { body, event_type } where `body` is the
 * entire Stripe webhook event.
 */
export const STRIPE_TRIGGER_INVOICE_PAYMENT_SUCCEEDED = {
  event_type: "invoice.payment_succeeded",
  body: {
    id: "evt_1PZq8cLkdIwHu7ix4BtMx4sH",
    object: "event",
    type: "invoice.payment_succeeded",
    data: {
      object: {
        id: "in_1PZq8cLkdIwHu7ix5CuNy5tI",
        object: "invoice",
        number: "SALT-0044",
        customer: "cus_QPz71fJ8kQxT2a",
        customer_name: "Northwind Studio",
        customer_email: "billing@northwind.com",
        status: "paid",
        amount_due: 175000,
        amount_paid: 175000,
        currency: "usd",
        created: 1783123200,
        hosted_invoice_url: "https://invoice.stripe.com/i/acct_test/in_1PZq8c",
      },
    },
  },
};

/** Unrelated Stripe object (customer) — decline. */
export const STRIPE_CUSTOMER_OBJECT = {
  id: "cus_QPz71fJ8kQxT2a",
  object: "customer",
  email: "billing@northwind.com",
  name: "Northwind Studio",
};
