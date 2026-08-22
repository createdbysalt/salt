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
import {
  emailEntity,
  firstParticipantEmailEntity,
  verbatimEntity,
} from "../feedback-entity";
import { isRecord, pickString, unwrapRecord } from "../normalize-utils";
import {
  isPersonalDomain,
  type PersonSignals,
} from "@/app/_features/memory/records/person-signals";
import type { DerivedPersonFields } from "@/app/_features/capture/services/producers/person-field-types";
import type {
  DerivedOrgFields,
  DerivedRecordSignals,
} from "@/app/_features/capture/services/producers/record-field-types";
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

/** Provider address shapes (Stripe billing_details.address, QBO BillAddr). */
interface RawAddress {
  line1?: unknown;
  line2?: unknown;
  Line1?: unknown;
  Line2?: unknown;
  city?: unknown;
  City?: unknown;
  state?: unknown;
  CountrySubDivisionCode?: unknown;
  postal_code?: unknown;
  PostalCode?: unknown;
  country?: unknown;
  Country?: unknown;
}

function str(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

/**
 * Normalize a provider address into the snake_case `customer_address`
 * extracted contract. Returns null when the address carries no content.
 */
function extractCustomerAddress(raw: unknown): Record<string, string> | null {
  if (!isRecord(raw)) return null;
  const address = raw as RawAddress;
  const normalized: Record<string, string> = {};
  const line1 = str(address.line1) ?? str(address.Line1);
  const line2 = str(address.line2) ?? str(address.Line2);
  const city = str(address.city) ?? str(address.City);
  const state = str(address.state) ?? str(address.CountrySubDivisionCode);
  const postalCode = str(address.postal_code) ?? str(address.PostalCode);
  const country = str(address.country) ?? str(address.Country);
  if (line1) normalized.line1 = line1;
  if (line2) normalized.line2 = line2;
  if (city) normalized.city = city;
  if (state) normalized.state = state;
  if (postalCode) normalized.postal_code = postalCode;
  if (country) normalized.country = country;
  return Object.keys(normalized).length > 0 ? normalized : null;
}

/**
 * Stripe carries tax IDs as `{ type, value }` pairs (invoice
 * customer_tax_ids, checkout customer_details.tax_ids). Only the value
 * feeds the org record.
 */
function extractCustomerTaxIds(raw: unknown): string[] | null {
  if (!Array.isArray(raw)) return null;
  const values = raw
    .map((entry) => (isRecord(entry) ? pickString(entry, ["value"]) : null))
    .filter((value): value is string => !!value);
  return values.length > 0 ? values : null;
}

/**
 * Record-signal derivation (Track G): a billing payload attests the
 * counterparty org's billing address and tax ID — current because money
 * depends on them. Org keys carry the domain:/name: resolution prefix;
 * personal-email customers key by name only.
 */
function deriveBillingRecordSignals(
  envelopes: readonly CaptureEnvelope[],
): DerivedRecordSignals {
  const orgs = new Map<string, DerivedOrgFields>();

  for (const envelope of envelopes) {
    const address = envelope.extracted.customer_address as
      | Record<string, string>
      | null
      | undefined;
    const taxIds = envelope.extracted.customer_tax_ids as
      | string[]
      | null
      | undefined;
    if (!address && !taxIds?.length) continue;

    const email = envelope.extracted.customer_email as string | null;
    const name = envelope.extracted.customer_name as string | null;
    const domain = email?.split("@")[1]?.toLowerCase();
    const key =
      domain && !isPersonalDomain(`probe@${domain}`)
        ? `domain:${domain}`
        : name
          ? `name:${name.toLowerCase()}`
          : null;
    if (!key) continue;

    const existing = orgs.get(key) ?? { signalValues: {} };
    if (name) existing.name ??= name;
    if (email) existing.contactEmail ??= email;
    if (address && !existing.address) {
      existing.address = {
        line1: address.line1,
        line2: address.line2,
        city: address.city,
        state: address.state,
        postalCode: address.postal_code,
        country: address.country,
      };
    }
    if (taxIds?.length && !existing.taxId) existing.taxId = taxIds[0];
    orgs.set(key, existing);
  }

  return { orgs, deals: new Map() };
}

/**
 * Field-signal derivation (registry-wiring Phase 4): a billing payload
 * attests the customer's billing email (the address invoices go to) and,
 * when the provider carries it, the billing address. Consumed by the
 * person-field producer after resolvePerson.
 */
function deriveBillingFieldSignals(
  envelopes: readonly CaptureEnvelope[],
): Map<string, DerivedPersonFields> {
  const contacts = new Map<string, DerivedPersonFields>();

  for (const envelope of envelopes) {
    const email = envelope.extracted.customer_email as string | null;
    if (!email) continue;

    const existing = contacts.get(email) ?? { signalValues: {} };
    existing.signalValues.person_billing_email_extracted = email;

    if (!existing.address) {
      const address = envelope.extracted.customer_address as
        | Record<string, string>
        | null
        | undefined;
      if (address) {
        existing.address = {
          line1: address.line1,
          line2: address.line2,
          city: address.city,
          state: address.state,
          postalCode: address.postal_code,
          country: address.country,
        };
      }
    }

    contacts.set(email, existing);
  }

  return contacts;
}

function normalizeStripe(payload: unknown): CaptureEnvelope | null {
  if (!payload || typeof payload !== "object") return null;
  const outer = payload as Record<string, unknown>;

  // Composio STRIPE_*_TRIGGER payloads wrap the full Stripe webhook event in
  // a `body` envelope: { body: { id, type, data: { object } }, event_type }
  // — verified against the live trigger schemas 2026-08-05
  // (__fixtures__/composio-trigger-schemas.json). Raw Stripe events and bare
  // objects (backfill rows) must keep parsing too.
  const record =
    typeof outer.body === "object" && outer.body !== null && !Array.isArray(outer.body)
      ? (outer.body as Record<string, unknown>)
      : outer;

  const dataObject = (record.data as Record<string, unknown>)?.object as
    | Record<string, unknown>
    | undefined;
  const obj = dataObject ?? record;

  const externalId = (obj.id as string) ?? (record.id as string);
  if (!externalId) return null;

  const eventType =
    (record.type as string) ?? (outer.event_type as string) ?? null;
  const objectType = (obj.object as string) ?? null;
  const billingDetails = obj.billing_details as Record<string, unknown> | undefined;
  // checkout.session carries the customer under customer_details
  const customerDetails = obj.customer_details as Record<string, unknown> | undefined;
  const customerEmail = (obj.customer_email as string) ??
    (obj.email as string) ??
    (billingDetails?.email as string) ??
    (customerDetails?.email as string);
  const customerName = (obj.customer_name as string) ??
    (obj.name as string) ??
    (billingDetails?.name as string) ??
    (customerDetails?.name as string);
  // Stripe amounts arrive in minor units (cents). The extracted contract is
  // decimal dollars (major units) — convert exactly once, here.
  const amountPaid =
    typeof obj.amount_paid === "number" ? obj.amount_paid / 100 :
    typeof obj.amount === "number" ? obj.amount / 100 :
    typeof obj.amount_total === "number" ? obj.amount_total / 100 : null;
  const amountDue =
    typeof obj.amount_due === "number" ? obj.amount_due / 100 : null;
  // Stripe invoices carry due_date as epoch seconds (null for auto-charge).
  const dueDate =
    typeof obj.due_date === "number"
      ? new Date(obj.due_date * 1000).toISOString()
      : null;

  const participants: EnvelopeParticipant[] = customerEmail
    ? [{ email: customerEmail.toLowerCase(), name: customerName ?? null, role: "payer" }]
    : [];

  const occurredAt =
    typeof obj.created === "number"
      ? new Date(obj.created * 1000).toISOString()
      : null;

  return {
    sourceType: "stripe",
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
      // Canonical money field: decimal dollars. amount_paid/amount_due kept
      // for provider-specific consumers.
      amount: amountPaid ?? amountDue,
      amount_paid: amountPaid,
      amount_due: amountDue,
      currency: (obj.currency as string) ?? "usd",
      status: (obj.status as string) ?? null,
      invoice_number: (obj.number as string) ?? null,
      due_date: dueDate,
      // Artifact-first (Phase 7): the hosted invoice page becomes the
      // billing record's link Resource on creation.
      hosted_invoice_url: (obj.hosted_invoice_url as string) ?? null,
      invoice_pdf_url: (obj.invoice_pdf as string) ?? null,
      customer_address: extractCustomerAddress(
        billingDetails?.address ?? customerDetails?.address
      ),
      customer_tax_ids: extractCustomerTaxIds(
        obj.customer_tax_ids ?? customerDetails?.tax_ids
      ),
    },
    raw: {
      stripeEventId: externalId,
      object_type: objectType,
      source: "composio_trigger",
    },
    noise: null,
  };
}

/**
 * Flatten a QuickBooks report (Customer Balance Detail) into one record per
 * transaction row. Composio's reworked QuickBooks toolkit (2026-08-06) has no
 * invoice/payment read tools left — QUICKBOOKS_CUSTOMER_BALANCE_DETAIL is the
 * only invoice-level read, and it returns Intuit's standard report shape:
 *   { Header, Columns: { Column: [{ ColTitle, ColType }] },
 *     Rows: { Row: [ { type: "Section", Header, Rows: { Row: [
 *       { type: "Data", ColData: [{ value, id? }] } ] } } ] } }
 * Cells are keyed by the column's ColType (fallback: slugified ColTitle);
 * section headers carry the customer name; any cell `id` is kept as `txn_id`
 * for dedupe.
 */
export function parseQuickbooksBalanceDetailReport(
  report: unknown,
): Array<Record<string, unknown>> {
  if (!isRecord(report)) return [];

  // The executor already unwraps Composio's envelope, but the QuickBooks tool
  // wraps the Intuit report one more level down: { data: { Columns, Rows,
  // Header } } (verified against a live execution 2026-08-06). Descend until
  // the report body is in hand.
  let body: Record<string, unknown> = report;
  while (!("Rows" in body) && !("Columns" in body) && isRecord(body.data)) {
    body = body.data;
  }

  const columns = isRecord(body.Columns)
    ? ((body.Columns.Column as Array<Record<string, unknown>>) ?? [])
    : [];
  const columnKeys = columns.map((column) => {
    const colType = typeof column.ColType === "string" ? column.ColType : "";
    if (colType) return colType;
    const title = typeof column.ColTitle === "string" ? column.ColTitle : "";
    return title.toLowerCase().replace(/\W+/g, "_") || "col";
  });

  const rows: Array<Record<string, unknown>> = [];

  const walk = (node: unknown, customerName: string | null): void => {
    if (!isRecord(node)) return;
    const rowList = isRecord(node.Rows)
      ? ((node.Rows.Row as unknown[]) ?? [])
      : [];

    for (const row of rowList) {
      if (!isRecord(row)) continue;

      if (Array.isArray(row.ColData) && row.type !== "Section") {
        const colData = row.ColData as Array<Record<string, unknown>>;
        const flat: Record<string, unknown> = {
          customer_name: customerName,
        };
        colData.forEach((cell, index) => {
          const key = columnKeys[index] ?? `col_${index}`;
          const value = cell?.value;
          if (typeof value === "string" && value.length > 0) {
            flat[key] = value;
          }
          const cellId = cell?.id;
          if (typeof cellId === "string" && cellId.length > 0 && !flat.txn_id) {
            flat.txn_id = cellId;
          }
        });
        // Skip empty filler rows
        if (Object.keys(flat).length > 1) rows.push(flat);
        continue;
      }

      // Section: header cell 0 is the customer; recurse into nested rows
      const header = isRecord(row.Header)
        ? ((row.Header.ColData as Array<Record<string, unknown>>) ?? [])
        : [];
      const sectionCustomer =
        typeof header[0]?.value === "string" && header[0].value.length > 0
          ? (header[0].value as string)
          : customerName;
      walk(row, sectionCustomer);
    }
  };

  walk(body, null);
  return rows;
}

/** A flattened report row from parseQuickbooksBalanceDetailReport. */
function isQuickbooksReportRow(record: Record<string, unknown>): boolean {
  return (
    !("Id" in record) &&
    !("id" in record) &&
    (typeof record.txn_type === "string" || typeof record.doc_num === "string")
  );
}

function parseReportAmount(value: unknown): number | null {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return null;
  const parsed = Number.parseFloat(value.replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeQuickbooksReportRow(
  record: Record<string, unknown>,
): CaptureEnvelope | null {
  const txnType = (record.txn_type as string) ?? "Transaction";
  const docNum = (record.doc_num as string) ?? null;
  const txnId = (record.txn_id as string) ?? null;

  const externalId = txnId
    ? `qbo:${txnId}`
    : docNum
      ? `qbo:${txnType}:${docNum}`
      : null;
  if (!externalId) return null;

  const customerEmail = (record.cust_bill_email as string) ?? null;
  const customerName = (record.customer_name as string) ?? (record.cust_name as string) ?? null;

  const participants: EnvelopeParticipant[] = customerEmail
    ? [{ email: customerEmail.toLowerCase(), name: customerName, role: "payer" }]
    : [];

  return {
    sourceType: "quickbooks",
    captureType: "payment",
    externalId,
    title: `QuickBooks ${txnType}${docNum ? ` ${docNum}` : ""}`,
    occurredAt: (record.tx_date as string) ?? null,
    participants,
    threadId: null,
    extracted: {
      customer_email: customerEmail?.toLowerCase() ?? null,
      customer_name: customerName,
      amount_paid: parseReportAmount(record.subt_amount ?? record.amount),
      balance: parseReportAmount(record.open_balance ?? record.rbal_open_balance),
      doc_number: docNum,
      due_date: (record.due_date as string) ?? null,
      txn_type: txnType,
    },
    raw: {
      quickbooksId: externalId,
      object_type: "invoice",
      source: "composio_backfill",
    },
    noise: null,
  };
}

function normalizeQuickbooks(payload: unknown): CaptureEnvelope | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;

  // Flattened Customer Balance Detail report rows (backfill path)
  if (isQuickbooksReportRow(record)) {
    return normalizeQuickbooksReportRow(record);
  }

  const externalId = (record.Id as string) ?? (record.id as string);
  if (!externalId) return null;

  const customerRef = record.CustomerRef as Record<string, unknown> | undefined;
  const customerName = (customerRef?.name as string) ?? (record.customer_name as string);
  const customerEmail = (record.BillEmail as Record<string, unknown>)?.Address as string;

  // QuickBooks amounts are already decimal dollars — no unit conversion.
  const totalAmt = record.TotalAmt as number | undefined;
  const currencyRef = record.CurrencyRef as Record<string, unknown> | undefined;
  const currency =
    typeof currencyRef?.value === "string" ? currencyRef.value.toLowerCase() : "usd";

  const participants: EnvelopeParticipant[] = customerEmail
    ? [{ email: customerEmail.toLowerCase(), name: customerName ?? null, role: "payer" }]
    : [];

  return {
    sourceType: "quickbooks",
    captureType: "payment",
    externalId,
    title: `QuickBooks Invoice ${(record.DocNumber as string) ?? externalId}`,
    occurredAt: (record.TxnDate as string) ?? (record.MetaData as Record<string, unknown>)?.CreateTime as string ?? null,
    participants,
    threadId: null,
    extracted: {
      customer_email: customerEmail?.toLowerCase() ?? null,
      customer_name: customerName ?? null,
      amount: totalAmt ?? null,
      amount_paid: totalAmt ?? null,
      currency,
      status: (record.Balance as number) === 0 ? "paid" : null,
      doc_number: (record.DocNumber as string) ?? null,
      invoice_number: (record.DocNumber as string) ?? null,
      due_date: (record.DueDate as string) ?? null,
      balance: (record.Balance as number) ?? null,
      customer_address: extractCustomerAddress(record.BillAddr),
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
  if (!isRecord(payload)) return null;

  // Try one level of trigger nesting before giving up — providers wrap the
  // billing object in envelopes like body/data/invoice/payment.
  const record = unwrapRecord(payload, ["body", "data", "invoice", "payment", "object"]);

  const externalId =
    pickString(record, ["id", "Id", "invoice_id", "invoiceId", "payment_id", "paymentId"]) ??
    pickString(payload, ["id", "Id", "invoice_id", "invoiceId"]);
  if (!externalId) return null;

  const customerEmail = pickString(record, [
    "customer_email",
    "customerEmail",
    "email",
  ]);

  const participants: EnvelopeParticipant[] = customerEmail
    ? [{ email: customerEmail.toLowerCase(), name: null, role: "payer" }]
    : [];

  // Generic providers (Xero et al.) report decimal dollars — no conversion.
  const amountRaw = record.amount ?? record.total ?? record.amount_paid;
  const amount = typeof amountRaw === "number" ? amountRaw : null;
  const currency =
    pickString(record, ["currency", "currency_code", "currencyCode"])?.toLowerCase() ??
    "usd";

  return {
    sourceType,
    captureType: "payment",
    externalId,
    title: `Payment ${externalId}`,
    occurredAt:
      pickString(record, ["created_at", "createdAt", "date", "timestamp"]) ?? null,
    participants,
    threadId: null,
    extracted: {
      customer_email: customerEmail?.toLowerCase() ?? null,
      amount,
      amount_paid: amount,
      currency,
      status: pickString(record, ["status", "state"]) ?? null,
      due_date: pickString(record, ["due_date", "dueDate"]) ?? null,
      hosted_invoice_url:
        pickString(record, ["hosted_invoice_url", "invoice_url", "invoiceUrl"]) ?? null,
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
    sourceType: provider,
    toolkit: provider,
    triggerSlugs,
    deriveSignals: deriveBillingSignals,
    deriveFieldSignals: deriveBillingFieldSignals,
    deriveRecordSignals: deriveBillingRecordSignals,

    extractFeedbackEntity(envelope) {
      return emailEntity(envelope, "customer_email", "customer");
    },

    normalize(payload: unknown): CaptureEnvelope | null {
      // Route known providers to specific parsing
      switch (provider) {
        case "stripe":
          return normalizeStripe(payload);
        case "quickbooks":
          return normalizeQuickbooks(payload);
        default:
          // Any unknown billing provider gets generic extraction
          return normalizeGenericBilling(payload, provider);
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
