/**
 * Finance Category Adapter (producer roadmap track 3).
 *
 * Handles banking / treasury sources: mercury, etc. Bank transactions are
 * the strongest relationship witness in the system — money moving settles
 * what invoices and emails only claim.
 *
 * Category-level contract: normalizers fold provider payloads into shared
 * extracted keys (direction, amount, counterparty_name, counterparty_email,
 * status, kind, memo); the derive functions below read only those keys, so
 * the next banking app (brex, ramp, relay) plugs in with a normalizer and
 * nothing else.
 */

import type {
  CaptureAdapter,
  CaptureEnvelope,
  SignalDerivationContext,
} from "../types";
import {
  emailEntity,
  firstParticipantEmailEntity,
  verbatimEntity,
} from "../feedback-entity";
import { isRecord, pickString, unwrapRecord } from "../normalize-utils";
import type { PersonSignals } from "@/app/_features/memory/records/person-signals";
import type { DerivedPersonFields } from "@/app/_features/capture/services/producers/person-field-types";
import type { CaptureSourceType } from "@/app/_features/capture/types";

type KnownFinanceProvider = "mercury";

const KNOWN_FINANCE_PROVIDERS: KnownFinanceProvider[] = ["mercury"];

const FINANCE_TRIGGER_SLUGS: Record<KnownFinanceProvider, string[]> = {
  mercury: [], // No triggers verified yet - backfill only (fireflies pattern)
};

function isKnownFinanceProvider(provider: string): provider is KnownFinanceProvider {
  return KNOWN_FINANCE_PROVIDERS.includes(provider as KnownFinanceProvider);
}

function pickNumber(record: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return null;
}

/** Counterparty email: direct field, or the first entry of an emails array. */
function pickCounterpartyEmail(
  record: Record<string, unknown>,
  counterparty: Record<string, unknown> | null,
): string | null {
  const direct =
    pickString(record, ["counterparty_email", "counterpartyEmail"]) ??
    (counterparty ? pickString(counterparty, ["email"]) : null);
  if (direct && direct.includes("@")) return direct.toLowerCase();

  const emails = counterparty?.emails;
  if (Array.isArray(emails)) {
    const first = emails.find(
      (entry): entry is string => typeof entry === "string" && entry.includes("@"),
    );
    if (first) return first.toLowerCase();
  }
  return null;
}

function pickCounterpartyName(
  record: Record<string, unknown>,
  counterparty: Record<string, unknown> | null,
): string | null {
  return (
    pickString(record, ["counterparty_name", "counterpartyName"]) ??
    (counterparty ? pickString(counterparty, ["name", "nickname"]) : null)
  );
}

/**
 * Shared normalization for transaction-shaped payloads. Returns null when
 * the payload carries no stable id (dedupe would be impossible).
 */
function normalizeTransaction(
  record: Record<string, unknown>,
  sourceType: CaptureSourceType,
): CaptureEnvelope | null {
  const externalId = pickString(record, ["id", "transaction_id", "transactionId"]);
  if (!externalId) return null;

  const counterparty = isRecord(record.counterparty) ? record.counterparty : null;
  const amount = pickNumber(record, ["amount", "amount_cents", "total"]);
  // amount_cents is cents; everything else is treated as signed dollars.
  const dollars =
    record.amount_cents !== undefined && record.amount === undefined && amount !== null
      ? amount / 100
      : amount;
  const direction =
    pickString(record, ["direction"]) ??
    (dollars !== null ? (dollars < 0 ? "debit" : "credit") : null);

  const counterpartyName = pickCounterpartyName(record, counterparty);
  const counterpartyEmail = pickCounterpartyEmail(record, counterparty);
  const memo = pickString(record, ["note", "memo", "description", "bankDescription"]);

  return {
    sourceType,
    captureType: "payment",
    externalId,
    title:
      [counterpartyName, dollars !== null ? `$${Math.abs(dollars).toFixed(2)}` : null]
        .filter(Boolean)
        .join(" · ") || memo?.slice(0, 100) || null,
    occurredAt:
      pickString(record, ["postedAt", "posted_at", "createdAt", "created_at", "date"]) ??
      null,
    participants: counterpartyEmail
      ? [{ email: counterpartyEmail, name: counterpartyName, role: "from" }]
      : [],
    threadId: null,
    extracted: {
      direction,
      amount: dollars,
      currency: pickString(record, ["currency", "currency_code"]) ?? "USD",
      counterparty_name: counterpartyName,
      counterparty_email: counterpartyEmail,
      status: pickString(record, ["status"]),
      kind: pickString(record, ["kind", "type", "method"]),
      memo,
    },
    raw: {
      transactionId: externalId,
      source: "composio_trigger",
    },
    noise: null,
  };
}

/**
 * Mercury transaction (API v1): { id, amount (signed dollars, negative =
 * money out), counterpartyName | counterparty { name, emails }, status,
 * kind, createdAt, postedAt, note }.
 */
function normalizeMercury(payload: unknown): CaptureEnvelope | null {
  if (!isRecord(payload)) return null;
  return normalizeTransaction(unwrapRecord(payload, ["transaction", "data"]), "mercury");
}

function normalizeGenericFinance(
  payload: unknown,
  sourceType: CaptureSourceType,
): CaptureEnvelope | null {
  if (!isRecord(payload)) return null;
  return normalizeTransaction(
    unwrapRecord(payload, ["transaction", "data", "event"]),
    sourceType,
  );
}

/**
 * Relationship witness (producer roadmap track 3): money IN from a
 * counterparty is the strongest client signal that exists — it settles what
 * invoices and emails only claim. Money out is spend, not a relationship
 * signal, so debits produce nothing.
 */
function deriveFinanceSignals(
  envelopes: readonly CaptureEnvelope[],
  _context: SignalDerivationContext,
): Map<string, PersonSignals> {
  const contacts = new Map<string, PersonSignals>();

  for (const envelope of envelopes) {
    if (envelope.extracted.direction !== "credit") continue;
    const email = envelope.extracted.counterparty_email as string | null;
    if (!email) continue;

    contacts.set(email, {
      ...contacts.get(email),
      has_payment_received: true,
    });
  }

  return contacts;
}

/**
 * Field-signal derivation: the counterparty name on a bank transaction is
 * the name money actually moves under — a strong corroborating name source.
 */
function deriveFinanceFieldSignals(
  envelopes: readonly CaptureEnvelope[],
): Map<string, DerivedPersonFields> {
  const contacts = new Map<string, DerivedPersonFields>();

  for (const envelope of envelopes) {
    const email = envelope.extracted.counterparty_email as string | null;
    if (!email) continue;

    const existing = contacts.get(email) ?? { signalValues: {} };
    const name = envelope.extracted.counterparty_name as string | null;
    if (name && !existing.signalValues.person_name_extracted) {
      existing.signalValues.person_name_extracted = name;
    }
    contacts.set(email, existing);
  }

  return contacts;
}

/**
 * Create a finance adapter for ANY provider.
 * Known providers get specific parsing; unknown get generic extraction.
 */
export function createFinanceCategoryAdapter(provider: string): CaptureAdapter {
  const triggerSlugs = isKnownFinanceProvider(provider)
    ? FINANCE_TRIGGER_SLUGS[provider]
    : []; // Unknown providers: triggers come from DB

  return {
    sourceType: provider,
    toolkit: provider,
    triggerSlugs,
    deriveSignals: deriveFinanceSignals,
    deriveFieldSignals: deriveFinanceFieldSignals,

    extractFeedbackEntity(envelope) {
      // A counterparty who pays you is a customer in rule terms — the money
      // vocabulary is shared with billing.
      return (
        emailEntity(envelope, "counterparty_email", "customer") ??
        verbatimEntity(envelope, "counterparty_name", "customer") ??
        firstParticipantEmailEntity(envelope, "customer")
      );
    },

    normalize(payload: unknown): CaptureEnvelope | null {
      switch (provider) {
        case "mercury":
          return normalizeMercury(payload);
        default:
          return normalizeGenericFinance(payload, provider);
      }
    },
  };
}

/** Known provider adapters (for backward compatibility). */
export const financeCategoryAdapters = KNOWN_FINANCE_PROVIDERS.map(
  createFinanceCategoryAdapter,
);

/**
 * Get finance adapter for ANY provider in the finance category.
 * Always returns an adapter — unknown providers get generic extraction.
 */
export function getFinanceAdapter(provider: string): CaptureAdapter {
  return createFinanceCategoryAdapter(provider);
}
