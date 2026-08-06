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

/**
 * Remaining trigger payloads — verified against the live Composio trigger
 * schemas 2026-08-05 (composio-trigger-schemas.json): every STRIPE_*_TRIGGER
 * sends { body, event_type } where `body` is the full Stripe webhook event.
 */

/** STRIPE_CHECKOUT_SESSION_COMPLETED_TRIGGER — customer under customer_details. */
export const STRIPE_TRIGGER_CHECKOUT_SESSION_COMPLETED = {
  event_type: "checkout.session.completed",
  body: {
    id: "evt_1Qr9dLkdIwHu7ix6DvOz6uJ",
    object: "event",
    type: "checkout.session.completed",
    data: {
      object: {
        id: "cs_test_a1B2c3D4e5F6g7H8i9J0",
        object: "checkout.session",
        amount_total: 95000,
        currency: "usd",
        customer: "cus_QPz71fJ8kQxT2a",
        customer_details: {
          email: "billing@northwind.com",
          name: "Northwind Studio",
        },
        payment_status: "paid",
        status: "complete",
        created: 1783209600,
      },
    },
  },
};

/** STRIPE_SUBSCRIPTION_ADDED_TRIGGER — no email on the subscription object. */
export const STRIPE_TRIGGER_SUBSCRIPTION_ADDED = {
  event_type: "customer.subscription.created",
  body: {
    id: "evt_1Qs0eMkdIwHu7ix7EwPa7vK",
    object: "event",
    type: "customer.subscription.created",
    data: {
      object: {
        id: "sub_1Qs0eMkdIwHu7ix8FxQb8wL",
        object: "subscription",
        customer: "cus_QPz71fJ8kQxT2a",
        status: "active",
        currency: "usd",
        created: 1783296000,
      },
    },
  },
};

/** STRIPE_SUBSCRIPTION_DELETED_TRIGGER. */
export const STRIPE_TRIGGER_SUBSCRIPTION_DELETED = {
  event_type: "customer.subscription.deleted",
  body: {
    id: "evt_1Qt1fNkdIwHu7ix9GyRc9xM",
    object: "event",
    type: "customer.subscription.deleted",
    data: {
      object: {
        id: "sub_1Qs0eMkdIwHu7ix8FxQb8wL",
        object: "subscription",
        customer: "cus_QPz71fJ8kQxT2a",
        status: "canceled",
        currency: "usd",
        created: 1783296000,
        canceled_at: 1783382400,
      },
    },
  },
};

/** STRIPE_CHARGE_FAILED_TRIGGER — billing_details carries the email. */
export const STRIPE_TRIGGER_CHARGE_FAILED = {
  event_type: "charge.failed",
  body: {
    id: "evt_1Qu2gOkdIwHu7ixAHzSdAyN",
    object: "event",
    type: "charge.failed",
    data: {
      object: {
        id: "ch_3Qu2gOkdIwHu7ixB0AtEbBzO",
        object: "charge",
        amount: 45000,
        currency: "usd",
        status: "failed",
        customer: "cus_QPz71fJ8kQxT2a",
        billing_details: { email: "billing@northwind.com", name: "Northwind Studio" },
        failure_code: "card_declined",
        failure_message: "Your card was declined.",
        created: 1783468800,
      },
    },
  },
};
