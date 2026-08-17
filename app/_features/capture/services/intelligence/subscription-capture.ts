import "server-only";

/**
 * Vendor Subscription Capture
 *
 * When daily-scan classifies an email as `vendor_saas` (a tool the operator
 * pays), the receipt is spend signal — not a relationship. This module turns
 * that mail into a payable billing_records row tagged `subscription`, so
 * Billing shows "ClickUp — $7/mo, renews ~Sep 13" instead of the intake
 * silently discarding it.
 *
 * v1 is deliberately regex-only: no LLM call, so no metering obligation.
 * Amounts we can't parse confidently are skipped, never guessed.
 *
 * Idempotency: source_external_id = `vendor-sub:<capture_id>` and the unique
 * (workspace_id, source_external_id) index make rescans safe.
 */

import type { createAdminClient } from "@/app/_lib/supabase/admin";

export interface VendorSubscriptionParse {
  amountCents: number;
  cadence: "weekly" | "monthly" | "yearly" | null;
  /** receipt = money already moved (paid); renewal_notice = upcoming charge (due). */
  kind: "receipt" | "renewal_notice";
}

const AMOUNT_PATTERN = /\$\s?(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d{2}))?/;
const MAX_PLAUSIBLE_CENTS = 1_000_000_00; // $1M — a solo operator's SaaS bill is never near this

const RECEIPT_PATTERN =
  /\b(receipt|payment (received|successful|confirmed)|paid|charge (succeeded|successful))\b/i;
const RENEWAL_PATTERN =
  /\b(renew(s|ed|al|ing)?|upcoming (payment|charge|invoice)|trial (ends|ending|expir)|payment due|auto[- ]?renew)\b/i;

function parseAmountCents(text: string): number | null {
  const match = AMOUNT_PATTERN.exec(text);
  if (!match) return null;
  const dollars = Number((match[1] ?? "").replace(/,/g, ""));
  const cents = Number(match[2] ?? "0");
  if (!Number.isFinite(dollars)) return null;
  const total = Math.round(dollars * 100) + cents;
  if (total <= 0 || total > MAX_PLAUSIBLE_CENTS) return null;
  return total;
}

function parseCadence(
  combined: string
): "weekly" | "monthly" | "yearly" | null {
  if (/\b(annual(ly)?|yearly|per year|\/yr|a year)\b/i.test(combined)) return "yearly";
  if (/\b(month(ly)?|per month|\/mo|each month)\b/i.test(combined)) return "monthly";
  if (/\b(week(ly)?|per week)\b/i.test(combined)) return "weekly";
  return null;
}

/**
 * Parse a vendor receipt/renewal email into a subscription observation.
 * Returns null when the mail isn't clearly money-related or carries no
 * plausible amount — silence is better than a wrong number.
 */
export function parseVendorSubscriptionEmail(input: {
  subject: string;
  bodyText?: string | null;
  snippet?: string | null;
}): VendorSubscriptionParse | null {
  const subject = input.subject ?? "";
  const body = input.bodyText ?? input.snippet ?? "";
  const combined = `${subject}\n${body}`;

  let kind: VendorSubscriptionParse["kind"];
  if (RECEIPT_PATTERN.test(combined)) {
    kind = "receipt";
  } else if (RENEWAL_PATTERN.test(combined)) {
    kind = "renewal_notice";
  } else {
    return null;
  }

  const amountCents = parseAmountCents(subject) ?? parseAmountCents(body);
  if (!amountCents) return null;

  return { amountCents, cadence: parseCadence(combined), kind };
}

function addCadence(isoDate: string, cadence: "weekly" | "monthly" | "yearly"): string {
  const date = new Date(isoDate);
  if (cadence === "weekly") date.setUTCDate(date.getUTCDate() + 7);
  if (cadence === "monthly") date.setUTCMonth(date.getUTCMonth() + 1);
  if (cadence === "yearly") date.setUTCFullYear(date.getUTCFullYear() + 1);
  return date.toISOString();
}

export type SubscriptionCaptureOutcome = "created" | "duplicate" | "skipped" | "failed";

/**
 * Persist a vendor receipt as a payable subscription record. Only call for
 * emails already classified `vendor_saas` with a vendor name.
 */
export async function captureVendorSubscription(args: {
  supabase: ReturnType<typeof createAdminClient>;
  workspaceId: string;
  captureId: string;
  vendorName: string;
  email: {
    subject: string;
    body_text?: string | null;
    snippet?: string | null;
    sent_at?: string | null;
  };
  dryRun?: boolean;
}): Promise<SubscriptionCaptureOutcome> {
  const parsed = parseVendorSubscriptionEmail({
    subject: args.email.subject,
    bodyText: args.email.body_text,
    snippet: args.email.snippet,
  });
  if (!parsed) return "skipped";

  const sourceExternalId = `vendor-sub:${args.captureId}`;

  const { data: existing, error: lookupError } = await args.supabase
    .from("billing_records")
    .select("id")
    .eq("workspace_id", args.workspaceId)
    .eq("source_external_id", sourceExternalId)
    .maybeSingle();
  if (lookupError) {
    console.error("[subscription-capture] dedupe lookup failed:", lookupError);
    return "failed";
  }
  if (existing) return "duplicate";

  if (args.dryRun) return "created";

  const observedAt = args.email.sent_at ?? new Date().toISOString();
  const isReceipt = parsed.kind === "receipt";

  const { error } = await args.supabase.from("billing_records").insert({
    workspace_id: args.workspaceId,
    direction: "payable",
    status: isReceipt ? "paid" : "due",
    amount_cents: parsed.amountCents,
    amount_paid_cents: isReceipt ? parsed.amountCents : 0,
    currency: "usd",
    issued_at: observedAt,
    paid_at: isReceipt ? observedAt : null,
    vendor_label: args.vendorName,
    category: "software",
    provider: "manual",
    source: "salt_inferred",
    origin: "found",
    capture_event_id: args.captureId,
    source_external_id: sourceExternalId,
    tags: ["subscription"],
    recurrence_cadence: parsed.cadence,
    recurrence_next_at:
      isReceipt && parsed.cadence ? addCadence(observedAt, parsed.cadence) : null,
    metadata: {
      vendor_receipt: true,
      parser: "regex-v1",
      subject: args.email.subject,
    },
  } as never);

  if (error) {
    // Unique-violation on a racing rescan is a duplicate, not a failure.
    if (error.code === "23505") return "duplicate";
    console.error("[subscription-capture] insert failed:", error);
    return "failed";
  }
  return "created";
}
