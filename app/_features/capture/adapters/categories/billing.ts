/**
 * Billing Category Adapter (Captures V2 Phase 1).
 *
 * Handles all billing/invoicing sources: stripe, quickbooks, xero, etc.
 * Routes by provider for provider-specific parsing.
 */

import type {
  CaptureAdapter,
  CaptureEnvelope,
  EnvelopeParticipant,
  SignalDerivationContext,
} from "../types";
import type { PersonSignals } from "@/app/_features/capture/services/system-plays/person-signals";
import type { CaptureSourceType } from "@/app/_features/capture/types";

type KnownBillingProvider = "stripe" | "quickbooks" | "xero";

const KNOWN_BILLING_PROVIDERS: KnownBillingProvider[] = ["stripe", "quickbooks", "xero"];

const BILLING_TRIGGER_SLUGS: Record<KnownBillingProvider, string[]> = {
  stripe: [
    "STRIPE_INVOICE_PAYMENT_SUCCEEDED_TRIGGER",
    "STRIPE_CHECKOUT_SESSION_COMPLETED_TRIGGER",
    "STRIPE_SUBSCRIPTION_ADDED_TRIGGER",
    "STRIPE_SUBSCRIPTION_DELETED_TRIGGER",
    "STRIPE_CHARGE_FAILED_TRIGGER",
  ],
  quickbooks: [], // Backfill only — Composio has no QuickBooks triggers
  xero: [], // Backfill only — Composio has no Xero triggers
};

function isKnownBillingProvider(provider: string): provider is KnownBillingProvider {
  return KNOWN_BILLING_PROVIDERS.includes(provider as KnownBillingProvider);
}

function deriveBillingSignals(
  envelopes: readonly CaptureEnvelope[],
  _context: SignalDerivationContext
): Map<string, PersonSignals> {
  const contacts = new Map<string, PersonSignals>();

  for (const envelope of envelopes) {
    // Billing adapters already filter by category - process all envelopes
    const customerEmail = envelope.extracted.customer_email as string | null;
    if (!customerEmail) continue;

    const existing = contacts.get(customerEmail) ?? {};
    const isStripe = envelope.sourceType === "stripe";
    const raw = envelope.raw as Record<string, unknown>;
    const objectType = raw.object_type as string | undefined;
    const status = envelope.extracted.status as string | undefined;
    const amountPaid = envelope.extracted.amount_paid as number | undefined;

    const isCharge = objectType === "charge";
    const isInvoice = objectType === "invoice";
    const isPaid = status === "paid" || status === "succeeded" || (amountPaid ?? 0) > 0;

    const signals: PersonSignals = { ...existing };

    if (isInvoice) {
      signals.has_invoice_sent = true;
      if (isPaid) {
        signals.has_payment_received = true;
        if (isStripe) signals.has_stripe_payment = true;
      }
    } else if (isCharge) {
      if (isPaid) {
        signals.has_payment_received = true;
        if (isStripe) signals.has_stripe_payment = true;
      }
    } else {
      signals.has_invoice_sent = true;
      signals.has_payment_received = true;
      if (isStripe) signals.has_stripe_payment = true;
    }

    contacts.set(customerEmail, signals);
  }

  return contacts;
}

// Billing adapters already filter by category - no need for source type check

function normalizeStripe(payload: unknown): CaptureEnvelope | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;

  const dataObject = (record.data as Record<string, unknown>)?.object as
    | Record<string, unknown>
    | undefined;
  const obj = dataObject ?? record;

  const externalId = (obj.id as string) ?? (record.id as string);
  if (!externalId) return null;

  const eventType = (record.type as string) ?? null;
  const objectType = (obj.object as string) ?? null;
  const billingDetails = obj.billing_details as Record<string, unknown> | undefined;
  const customerEmail = (obj.customer_email as string) ??
    (obj.email as string) ??
    (billingDetails?.email as string);
  const customerName = (obj.customer_name as string) ??
    (obj.name as string) ??
    (billingDetails?.name as string);
  const amountPaid =
    typeof obj.amount_paid === "number" ? obj.amount_paid / 100 :
    typeof obj.amount === "number" ? obj.amount / 100 : null;
  const amountDue =
    typeof obj.amount_due === "number" ? obj.amount_due / 100 : null;

  const participants: EnvelopeParticipant[] = customerEmail
    ? [{ email: customerEmail.toLowerCase(), name: customerName ?? null, role: "payer" }]
    : [];

  const occurredAt =
    typeof obj.created === "number"
      ? new Date(obj.created * 1000).toISOString()
      : null;

  return {
    sourceType: "stripe" as CaptureSourceType,
    captureType: "payment",
    externalId,
    title: eventType ? `Stripe: ${eventType}` : "Stripe Event",
    occurredAt,
    participants,
    threadId: (obj.invoice as string) ?? null,
    extracted: {
      event_type: eventType,
      customer_email: customerEmail?.toLowerCase() ?? null,
      customer_name: customerName ?? null,
      amount_paid: amountPaid,
      amount_due: amountDue,
      currency: (obj.currency as string) ?? null,
      status: (obj.status as string) ?? null,
      invoice_number: (obj.number as string) ?? null,
    },
    raw: {
      stripeEventId: externalId,
      object_type: objectType,
      source: "composio_trigger",
    },
    noise: null,
  };
}

function normalizeQuickbooks(payload: unknown): CaptureEnvelope | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;

  const externalId = (record.Id as string) ?? (record.id as string);
  if (!externalId) return null;

  const customerRef = record.CustomerRef as Record<string, unknown> | undefined;
  const customerName = (customerRef?.name as string) ?? (record.customer_name as string);
  const customerEmail = (record.BillEmail as Record<string, unknown>)?.Address as string;

  const totalAmt = record.TotalAmt as number | undefined;

  const participants: EnvelopeParticipant[] = customerEmail
    ? [{ email: customerEmail.toLowerCase(), name: customerName ?? null, role: "payer" }]
    : [];

  return {
    sourceType: "quickbooks" as CaptureSourceType,
    captureType: "payment",
    externalId,
    title: `QuickBooks Invoice ${(record.DocNumber as string) ?? externalId}`,
    occurredAt: (record.TxnDate as string) ?? (record.MetaData as Record<string, unknown>)?.CreateTime as string ?? null,
    participants,
    threadId: null,
    extracted: {
      customer_email: customerEmail?.toLowerCase() ?? null,
      customer_name: customerName ?? null,
      amount_paid: totalAmt ?? null,
      doc_number: (record.DocNumber as string) ?? null,
      balance: (record.Balance as number) ?? null,
    },
    raw: {
      quickbooksId: externalId,
      source: "composio_trigger",
    },
    noise: null,
  };
}

function normalizeGenericBilling(
  payload: unknown,
  sourceType: CaptureSourceType
): CaptureEnvelope | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;

  const externalId =
    (record.id as string) ??
    (record.Id as string) ??
    (record.invoice_id as string);
  if (!externalId) return null;

  const customerEmail =
    (record.customer_email as string) ??
    (record.email as string) ??
    null;

  const participants: EnvelopeParticipant[] = customerEmail
    ? [{ email: customerEmail.toLowerCase(), name: null, role: "payer" }]
    : [];

  return {
    sourceType,
    captureType: "payment",
    externalId,
    title: `Payment ${externalId}`,
    occurredAt: (record.created_at as string) ?? (record.date as string) ?? null,
    participants,
    threadId: null,
    extracted: {
      customer_email: customerEmail?.toLowerCase() ?? null,
      amount_paid: (record.amount as number) ?? (record.total as number) ?? null,
    },
    raw: {
      paymentId: externalId,
      source: "composio_trigger",
    },
    noise: null,
  };
}

/**
 * Create a billing adapter for ANY provider.
 * Known providers get specific parsing; unknown get generic extraction.
 */
export function createBillingCategoryAdapter(provider: string): CaptureAdapter {
  const triggerSlugs = isKnownBillingProvider(provider)
    ? BILLING_TRIGGER_SLUGS[provider]
    : []; // Unknown providers: triggers come from DB

  return {
    sourceType: provider as CaptureSourceType,
    toolkit: provider,
    triggerSlugs,
    deriveSignals: deriveBillingSignals,

    normalize(payload: unknown): CaptureEnvelope | null {
      // Route known providers to specific parsing
      switch (provider) {
        case "stripe":
          return normalizeStripe(payload);
        case "quickbooks":
          return normalizeQuickbooks(payload);
        default:
          // Any unknown billing provider gets generic extraction
          return normalizeGenericBilling(payload, provider as CaptureSourceType);
      }
    },
  };
}

/** Known provider adapters (for backward compatibility). */
export const billingCategoryAdapters = KNOWN_BILLING_PROVIDERS.map(
  createBillingCategoryAdapter
);

/**
 * Get billing adapter for ANY provider in the billing category.
 * Always returns an adapter — unknown providers get generic extraction.
 */
export function getBillingAdapter(provider: string): CaptureAdapter {
  return createBillingCategoryAdapter(provider);
}
