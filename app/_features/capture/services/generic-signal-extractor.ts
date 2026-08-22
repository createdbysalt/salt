import "server-only";

/**
 * Generic LLM signal extractor (connector-platform Phase 5.2).
 *
 * The long tail of connectors ships without a hand-written deriveSignals —
 * this extractor maps their envelopes onto the registry signal set with an
 * LLM instead. Three hard rules keep it safe:
 *
 * 1. Registry-bounded: only PERSON_SIGNAL_KEYS survive validation; unknown
 *    keys and wrong value types are dropped, never coerced.
 * 2. Anti-hallucination: only emails present in the envelopes' participants
 *    survive; the model cannot invent contacts.
 * 3. Ask-first only: absorption passes signalsInferred=true, so the
 *    records-engine caps admission at needs_confirmation — inferred evidence
 *    can never auto-create a record (confidence discount lives in
 *    admission.ts, provenance in the existing machinery).
 *
 * The LLM call is injected (same pattern as runDailyScan) so callers own
 * model routing and user attribution.
 *
 * Wired (Sources plan Phase 5.4): absorbDerivedSignals in
 * connector-backfills.ts supplements deterministic deriveSignals with this
 * extractor for providers outside HAND_WRITTEN_PARSING_PROVIDERS, on
 * newly-created envelopes only (the 6h reconciliation overlap would
 * otherwise re-extract the same data every run). Callers thread a metered
 * llmCall from runCaptureReconciliation (owner-attributed) and the manual
 * sync/scan actions.
 */

import type { CaptureEnvelope } from "../adapters/types";
import {
  PERSON_SIGNAL_KEYS,
  type PersonSignals,
} from "@/app/_features/memory/records/person-signals";
import { resolvePerson } from "@/app/_features/memory/records";

export type LlmCall = (_systemPrompt: string, _userPrompt: string) => Promise<string>;

/** What each signal means, for the model. Keep in sync with PersonSignals. */
const SIGNAL_DESCRIPTIONS: Record<(typeof PERSON_SIGNAL_KEYS)[number], string> = {
  has_payment_received: "boolean — this contact paid the user money (settled)",
  has_stripe_payment: "boolean — a settled Stripe payment from this contact",
  has_invoice_sent: "boolean — the user sent this contact an invoice",
  is_bidirectional_thread:
    "boolean — the user and this contact have BOTH written to each other",
  you_initiated: "boolean — the user reached out to this contact first",
  has_calendar_meeting: "boolean — a meeting with this contact exists",
  has_signature: "boolean — the contact's message carries a personal signature",
  email_count: "number — messages exchanged with this contact in this batch",
  last_email_date: "string — ISO timestamp of the latest item with this contact",
};

const SYSTEM_PROMPT = `You map captured items from a connected business tool onto per-contact profile signals.

Rules:
- Output ONLY minified JSON: {"contacts":[{"email":"...","signals":{...}}]}
- Use ONLY these signal keys (omit keys you cannot attest from the items):
${PERSON_SIGNAL_KEYS.map((key) => `  - ${key}: ${SIGNAL_DESCRIPTIONS[key]}`).join("\n")}
- Only include emails that literally appear in the items. Never invent contacts.
- Attest a signal only when the items clearly show it. When unsure, omit it.`;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Compact, prompt-safe projection of an envelope. */
function projectEnvelope(envelope: CaptureEnvelope): Record<string, unknown> {
  return {
    source: envelope.sourceType,
    type: envelope.captureType,
    title: envelope.title,
    occurredAt: envelope.occurredAt,
    participants: envelope.participants.map((p) => ({
      email: p.email,
      name: p.name,
      role: p.role,
    })),
    extracted: envelope.extracted,
  };
}

function validateSignals(raw: unknown): PersonSignals | null {
  if (!isRecord(raw)) return null;
  const out: PersonSignals = {};
  for (const key of PERSON_SIGNAL_KEYS) {
    const value = raw[key];
    if (value === undefined) continue;
    if (key === "email_count") {
      if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
        out.email_count = Math.floor(value);
      }
    } else if (key === "last_email_date") {
      if (typeof value === "string" && !Number.isNaN(Date.parse(value))) {
        out.last_email_date = new Date(value).toISOString();
      }
    } else if (typeof value === "boolean") {
      out[key] = value;
    }
  }
  return Object.keys(out).length > 0 ? out : null;
}

/**
 * Map envelopes → per-contact signals via the injected LLM. Strictly
 * validated; returns an empty map on any parse failure (fail closed).
 */
export async function extractSignalsGeneric(
  envelopes: readonly CaptureEnvelope[],
  context: { userEmail: string | null; customizeContext?: string | null },
  llmCall: LlmCall,
): Promise<Map<string, PersonSignals>> {
  const result = new Map<string, PersonSignals>();
  if (envelopes.length === 0) return result;

  const knownEmails = new Set<string>();
  for (const envelope of envelopes) {
    for (const p of envelope.participants) {
      if (p.email && p.email !== context.userEmail?.toLowerCase()) {
        knownEmails.add(p.email);
      }
    }
  }
  if (knownEmails.size === 0) return result;

  const userPrompt = JSON.stringify({
    userEmail: context.userEmail,
    items: envelopes.slice(0, 50).map(projectEnvelope),
  });

  let parsed: unknown;
  try {
    // Track A (Phase M4): owner customizations steer the extraction; they
    // ride the same call, so metering is unchanged.
    const systemPrompt = context.customizeContext
      ? `${SYSTEM_PROMPT}\n\n${context.customizeContext}`
      : SYSTEM_PROMPT;
    const response = await llmCall(systemPrompt, userPrompt);
    parsed = JSON.parse(response.trim().replace(/^```(?:json)?|```$/g, ""));
  } catch (error) {
    console.warn(
      "[generic-signal-extractor] LLM response unusable:",
      error instanceof Error ? error.message : error,
    );
    return result;
  }

  if (!isRecord(parsed) || !Array.isArray(parsed.contacts)) return result;

  for (const contact of parsed.contacts) {
    if (!isRecord(contact)) continue;
    const email =
      typeof contact.email === "string" ? contact.email.toLowerCase() : null;
    // Anti-hallucination: the model can only speak about observed emails.
    if (!email || !knownEmails.has(email)) continue;
    const signals = validateSignals(contact.signals);
    if (signals) result.set(email, signals);
  }

  return result;
}

/**
 * Absorb LLM-extracted signals through the records engine, ask-first only.
 */
export async function absorbInferredSignals(
  workspaceId: string,
  envelopes: readonly CaptureEnvelope[],
  context: { userEmail: string | null; customizeContext?: string | null },
  llmCall: LlmCall,
): Promise<{ contactsProposed: number }> {
  const derived = await extractSignalsGeneric(envelopes, context, llmCall);
  let contactsProposed = 0;

  for (const [email, signals] of derived) {
    const name = envelopes
      .flatMap((e) => e.participants)
      .find((p) => p.email === email && p.name)?.name;
    try {
      await resolvePerson(workspaceId, {
        email,
        name: name ?? undefined,
        signals,
        signalsInferred: true,
      });
      contactsProposed++;
    } catch (error) {
      console.warn(
        `[generic-signal-extractor] absorption failed for a contact:`,
        error instanceof Error ? error.message : error,
      );
    }
  }

  return { contactsProposed };
}
