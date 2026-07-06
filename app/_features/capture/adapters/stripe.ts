import type {
  CaptureAdapter,
  CaptureEnvelope,
  EnvelopeParticipant,
  SignalDerivationContext,
} from "./types";
import type { PersonSignals } from "@/app/_features/capture/services/system-plays/person-signals";

/**
 * Stripe capture adapter (connector-platform Phase 3.5) — the USER's own
 * Stripe account via the Composio API-key connector, not Salt SaaS billing.
 *
 * Consumes Stripe API invoice and charge objects — the per-item shapes
 * STRIPE_LIST_INVOICES / STRIPE_LIST_CHARGES return (Stripe objects carry a
 * discriminating `object` field; webhook-style payloads nest the resource
 * under data.object). The STRIPE_INVOICE_PAYMENT_SUCCEEDED_TRIGGER webhook
 * trigger (verified 2026-07-04) wraps the entire Stripe event under `body` —
 * normalize unwraps body → data.object. Charges have no succeeded-trigger,
 * so they ride backfill + reconciliation.
 */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function epochToIso(value: unknown): string | null {
  const seconds = num(value);
  if (seconds === null || seconds <= 0) return null;
  return new Date(seconds * 1000).toISOString();
}

function formatAmount(amountCents: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amountCents / 100);
  } catch {
    return `${(amountCents / 100).toFixed(2)} ${currency.toUpperCase()}`;
  }
}

function payerParticipant(source: Record<string, unknown>): EnvelopeParticipant[] {
  const email =
    str(source.customer_email) ??
    (isRecord(source.billing_details) ? str(source.billing_details.email) : null) ??
    (isRecord(source.customer) ? str(source.customer.email) : null);
  if (!email) return [];
  const name =
    str(source.customer_name) ??
    (isRecord(source.billing_details) ? str(source.billing_details.name) : null);
  return [{ email: email.toLowerCase(), name, role: "payer" }];
}

function normalizeInvoice(invoice: Record<string, unknown>): CaptureEnvelope | null {
  const externalId = str(invoice.id);
  if (!externalId) return null;

  const currency = str(invoice.currency) ?? "usd";
  const amountDue = num(invoice.amount_due) ?? 0;
  const number = str(invoice.number);
  const status = str(invoice.status);
  const created = epochToIso(invoice.created);
  const customerId = isRecord(invoice.customer)
    ? str(invoice.customer.id)
    : str(invoice.customer);

  return {
    sourceType: "stripe",
    captureType: "payment",
    externalId,
    title: `Invoice ${number ?? externalId.slice(-8)} — ${formatAmount(amountDue, currency)}`,
    occurredAt: created,
    participants: payerParticipant(invoice),
    threadId: customerId,
    extracted: {
      type: "payment",
      subtype: "invoice",
      invoice_id: externalId,
      invoice_number: number,
      customer_id: customerId,
      customer_name: str(invoice.customer_name),
      customer_email: str(invoice.customer_email),
      status,
      amount: amountDue / 100,
      amount_paid: (num(invoice.amount_paid) ?? 0) / 100,
      currency: currency.toUpperCase(),
      due_date: epochToIso(invoice.due_date),
      link: str(invoice.hosted_invoice_url),
    },
    raw: {
      objectType: "invoice",
      invoiceId: externalId,
      number,
      status,
      amountDue,
      currency,
      customerId,
      source: "composio",
    },
    // Payments bypass the noise gate — the gate models inbox noise.
    noise: null,
  };
}

function normalizeCharge(charge: Record<string, unknown>): CaptureEnvelope | null {
  const externalId = str(charge.id);
  if (!externalId) return null;

  // Only settled money is memory; pending/failed charges are noise-by-status.
  if (str(charge.status) !== "succeeded") return null;

  const currency = str(charge.currency) ?? "usd";
  const amount = num(charge.amount) ?? 0;
  const created = epochToIso(charge.created);
  const customerId = isRecord(charge.customer)
    ? str(charge.customer.id)
    : str(charge.customer);

  return {
    sourceType: "stripe",
    captureType: "payment",
    externalId,
    title: `Payment received — ${formatAmount(amount, currency)}`,
    occurredAt: created,
    participants: payerParticipant(charge),
    threadId: customerId,
    extracted: {
      type: "payment",
      subtype: "charge",
      charge_id: externalId,
      customer_id: customerId,
      amount: amount / 100,
      currency: currency.toUpperCase(),
      description: str(charge.description),
      receipt_url: str(charge.receipt_url),
    },
    raw: {
      objectType: "charge",
      chargeId: externalId,
      status: "succeeded",
      amount,
      currency,
      customerId,
      source: "composio",
    },
    noise: null,
  };
}

/**
 * Payers carry the revenue signals the fill-rules reference (Phase 5.1):
 * a succeeded charge or paid invoice = has_stripe_payment/has_payment_received;
 * any invoice to them = has_invoice_sent.
 */
function deriveStripeSignals(
  envelopes: readonly CaptureEnvelope[],
  context: SignalDerivationContext,
): Map<string, PersonSignals> {
  const signals = new Map<string, PersonSignals>();
  const self = context.userEmail?.toLowerCase() ?? null;
  for (const envelope of envelopes) {
    if (envelope.sourceType !== "stripe") continue;
    const subtype = envelope.extracted.subtype;
    const paid =
      subtype === "charge" ||
      (subtype === "invoice" && envelope.extracted.status === "paid");
    for (const p of envelope.participants) {
      if (p.role !== "payer" || !p.email || p.email === self) continue;
      const entry = signals.get(p.email) ?? {};
      if (subtype === "invoice") entry.has_invoice_sent = true;
      if (paid) {
        entry.has_stripe_payment = true;
        entry.has_payment_received = true;
      }
      signals.set(p.email, entry);
    }
  }
  return signals;
}

export const stripeCaptureAdapter: CaptureAdapter = {
  sourceType: "stripe",
  toolkit: "stripe",
  // Verified against GET /api/v3/triggers_types 2026-07-04 (webhook trigger).
  triggerSlugs: ["STRIPE_INVOICE_PAYMENT_SUCCEEDED_TRIGGER"],
  deriveSignals: deriveStripeSignals,

  normalize(payload: unknown): CaptureEnvelope | null {
    if (!isRecord(payload)) return null;
    // Composio's Stripe triggers wrap the entire Stripe event under `body`.
    const unwrapped = isRecord(payload.body) ? payload.body : payload;
    // Webhook-style payloads nest the resource under data.object.
    const nested = isRecord(unwrapped.data) ? unwrapped.data : null;
    const resource =
      nested && isRecord(nested.object) ? nested.object : unwrapped;

    const objectType = str(resource.object);
    const id = str(resource.id);
    if (objectType === "invoice" || id?.startsWith("in_")) {
      return normalizeInvoice(resource);
    }
    if (objectType === "charge" || id?.startsWith("ch_")) {
      return normalizeCharge(resource);
    }
    return null;
  },
};
