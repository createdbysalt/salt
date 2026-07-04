/**
 * Billing Activity mappers — keep in sync with Overview surfaces.
 *
 * When adding a new Overview section or editable field on Billing detail:
 * 1. Add mapper(s) here → ProfileActivityTimelineEntry
 * 2. Fetch in getBillingSupplementalActivity (queries.ts)
 * 3. Wire BillingActivityTab + unit test in activity.test.ts
 *
 * Full checklist: docs/guides/memory-activity-parity.md
 *
 * Inline field edits (updateBillingRecordField) write profile_field_provenance
 * rows with entity_type 'billing_record' (CHECK widened in 20260703190000) —
 * mapped below by mapBillingProvenanceToActivityEntry and fetched in
 * getBillingSupplementalActivity.
 *
 * Known gaps (blocked on schema — do not work around here):
 * - lifecycle_events' entity_type CHECK now admits 'billing_record'
 *   (20260703190000), but no writer emits billing lifecycle rows yet (the
 *   tab already merges lifecycleEvents for when one lands).
 * - notes' entity_type CHECK admits person/organization/work only; the note
 *   mapper below is wired for when the CHECK is widened.
 * - Tag removal is not recorded (entity_tag_assignments rows are deleted).
 */
import type { ActivityEvent } from "@/app/_lib/demo/people-demo-data";
import type {
  ProfileProvenanceSource,
  ProfileProvenanceStatus,
} from "@/app/_features/plays/playbooks/records-engine/types";
import {
  buildGenericRecordActivityAskSaltPrompt,
  mapActivityEventToTimelineEntry,
  type ProfileActivityTimelineEntry,
} from "@/app/_features/people/utils/activity";
import { mapNoteToActivityEntry } from "@/app/_features/work/utils/activity";
import type { EntityNoteWithProvenance } from "@/app/_features/memory/types/taxonomies";

export function mapBillingActivityToTimeline(
  activity: ActivityEvent[],
): ProfileActivityTimelineEntry[] {
  return activity.map(mapActivityEventToTimelineEntry);
}

// ============================================================================
// Field-edit provenance (profile_field_provenance, entity_type 'billing_record')
// ============================================================================

export type BillingProvenanceActivityInput = {
  field: string;
  value: string | null;
  source: ProfileProvenanceSource;
  confidence: number | null;
  because: string | null;
  status: ProfileProvenanceStatus;
  setAt: string;
};

const BILLING_FIELD_LABELS: Record<string, string> = {
  number: "number",
  status: "status",
  amount: "amount",
  amountPaid: "amount paid",
  currency: "currency",
  issuedAt: "issued date",
  dueAt: "due date",
  paidAt: "paid date",
  organizationId: "organization",
  personId: "contact",
  projectId: "work",
};

export function billingProfileFieldLabel(field: string): string {
  return BILLING_FIELD_LABELS[field] ?? field.replaceAll("_", " ");
}

export function mapBillingProvenanceToActivityEntry(
  provenance: BillingProvenanceActivityInput,
): ProfileActivityTimelineEntry {
  const field = billingProfileFieldLabel(provenance.field);
  const detailParts = [
    provenance.because ?? "Based on trusted billing-record evidence.",
    provenance.confidence != null ? `${provenance.confidence}% sure` : null,
  ].filter((part): part is string => Boolean(part));

  if (provenance.source === "manual") {
    return {
      id: `billing-profile-${provenance.field}-${provenance.setAt}`,
      at: provenance.setAt,
      kind: "user",
      label: `You updated ${field}`,
      detail: detailParts.join(" · "),
    };
  }

  const action =
    provenance.status === "pending"
      ? "suggested"
      : provenance.source === "ai_fallback"
        ? "inferred"
        : "updated";
  return {
    id: `billing-profile-${provenance.field}-${provenance.setAt}`,
    at: provenance.setAt,
    kind: "keeper",
    label: `Keeper ${action} ${field}`,
    detail: detailParts.join(" · "),
  };
}

// ============================================================================
// Payments (billing_payments)
// ============================================================================

export type BillingPaymentActivityInput = {
  id: string;
  amountCents: number;
  currency: string;
  paidAt: string | null;
  provider: string;
  matchStatus: "matched" | "unmatched" | "reversed";
  matchConfidence: number | null;
  createdAt: string;
  updatedAt: string;
};

function formatMoney(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(Math.abs(cents) / 100);
}

const BILLING_PAYMENT_PROVIDER_LABELS: Record<string, string> = {
  stripe: "Stripe",
  square: "Square",
  paypal: "PayPal",
  quickbooks: "QuickBooks",
  freshbooks: "FreshBooks",
  wave: "Wave",
  manual: "manual entry",
};

function paymentProviderLabel(provider: string): string {
  return BILLING_PAYMENT_PROVIDER_LABELS[provider] ?? provider;
}

export function mapBillingPaymentToActivityEntries(
  payment: BillingPaymentActivityInput,
): ProfileActivityTimelineEntry[] {
  const entries: ProfileActivityTimelineEntry[] = [];
  const amountLabel = formatMoney(payment.amountCents, payment.currency);
  const isRefund = payment.amountCents < 0;

  const detailParts = [
    amountLabel,
    `via ${paymentProviderLabel(payment.provider)}`,
    payment.matchStatus === "matched"
      ? payment.matchConfidence != null
        ? `Matched by Salt · ${payment.matchConfidence}% sure`
        : "Matched by Salt"
      : null,
  ].filter((part): part is string => Boolean(part));

  entries.push({
    id: `billing-payment-${payment.id}`,
    at: payment.paidAt ?? payment.createdAt,
    kind: payment.provider === "manual" ? "user" : "system",
    label: isRefund ? "Refund recorded" : "Payment received",
    detail: detailParts.join(" · "),
  });

  if (payment.matchStatus === "reversed") {
    entries.push({
      id: `billing-payment-reversed-${payment.id}`,
      at: payment.updatedAt,
      kind: "system",
      label: "Payment reversed",
      detail: amountLabel,
    });
  }

  return entries;
}

// ============================================================================
// Notes (entity-scoped)
// ============================================================================

export function mapBillingNotesToActivityEntries(
  notes: EntityNoteWithProvenance[],
): ProfileActivityTimelineEntry[] {
  return notes.map(mapNoteToActivityEntry);
}

// ============================================================================
// Ask Salt prompt
// ============================================================================

export function buildBillingActivityAskSaltPrompt(
  entry: ProfileActivityTimelineEntry,
  partyLabel: string,
): string {
  return buildGenericRecordActivityAskSaltPrompt(`billing for ${partyLabel}`, entry);
}
