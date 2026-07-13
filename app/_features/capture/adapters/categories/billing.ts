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

type BillingProvider = "stripe" | "quickbooks" | "xero";

const BILLING_PROVIDERS: BillingProvider[] = ["stripe", "quickbooks", "xero"];

const BILLING_TRIGGER_SLUGS: Record<BillingProvider, string[]> = {
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

function deriveBillingSignals(
  envelopes: readonly CaptureEnvelope[],
  _context: SignalDerivationContext
): Map<string, PersonSignals> {
  const contacts = new Map<string, PersonSignals>();

  for (const envelope of envelopes) {
    if (!isBillingSource(envelope.sourceType)) continue;

    const customerEmail = envelope.extracted.customer_email as string | null;
    if (!customerEmail) continue;

    const existing = contacts.get(customerEmail) ?? {};
    const isStripe = envelope.sourceType === "stripe";

    contacts.set(customerEmail, {
      ...existing,
      has_payment_received: true,
      has_stripe_payment: isStripe || existing.has_stripe_payment,
      has_invoice_sent: true,
    });
  }

  return contacts;
}

function isBillingSource(sourceType: CaptureSourceType): boolean {
  return BILLING_PROVIDERS.includes(sourceType as BillingProvider);
}

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
  const customerEmail = (obj.customer_email as string) ?? (obj.email as string);
  const customerName = (obj.customer_name as string) ?? (obj.name as string);
  const amountPaid =
    typeof obj.amount_paid === "number" ? obj.amount_paid / 100 : null;
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

export function createBillingCategoryAdapter(
  provider: BillingProvider
): CaptureAdapter {
  const triggerSlugs = BILLING_TRIGGER_SLUGS[provider] ?? [];

  return {
    sourceType: provider as CaptureSourceType,
    toolkit: provider,
    triggerSlugs,
    deriveSignals: deriveBillingSignals,

    normalize(payload: unknown): CaptureEnvelope | null {
      switch (provider) {
        case "stripe":
          return normalizeStripe(payload);
        case "quickbooks":
          return normalizeQuickbooks(payload);
        default:
          return normalizeGenericBilling(payload, provider as CaptureSourceType);
      }
    },
  };
}

export const billingCategoryAdapters = BILLING_PROVIDERS.map(
  createBillingCategoryAdapter
);

export function getBillingAdapter(provider: string): CaptureAdapter | null {
  if (!BILLING_PROVIDERS.includes(provider as BillingProvider)) {
    return null;
  }
  return createBillingCategoryAdapter(provider as BillingProvider);
}
