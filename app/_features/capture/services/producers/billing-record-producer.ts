import { createAdminClient } from "@/app/_lib/supabase/admin";
import { runCareForSignal } from "@/app/_features/memory/care/scheduler";
import { memoryUpdateField } from "@/app/_lib/memory-tools";
import { getFieldsForEntity } from "@/app/_features/memory/taxonomy/field-registry";
import type { CaptureEnvelope } from "../../adapters/types";

/**
 * Track G: billing/bank corroboration. A payment capture (Stripe invoice,
 * QuickBooks invoice, generic provider) is matched against open billing
 * records — by invoice number first, then by exact amount + currency +
 * counterparty, then by a unique open amount. A match corroborates the
 * record: empty money/date/link fields fill via memoryUpdateField with the
 * registry's provenance, status rules fire through the records capability,
 * and money received on an org-linked record attests a live org.
 *
 * Matching never creates billing records and never overwrites set fields.
 */

const OPEN_STATUSES = ["draft", "due", "overdue", "partial"] as const;

/** Vendor-name keywords → billing_category. Only clear cases classify. */
const CATEGORY_KEYWORDS: Array<{ category: "contractor" | "software"; pattern: RegExp }> = [
  {
    category: "software",
    pattern:
      /\b(adobe|figma|github|gitlab|notion|slack|zoom|google|microsoft|aws|vercel|supabase|openai|anthropic|dropbox|canva|linear|asana|trello|mailchimp|shopify|stripe|quickbooks|xero|heroku|digitalocean|cloudflare|datadog|sentry|twilio|intercom|hubspot|salesforce|zapier|airtable|webflow|framer|loom|calendly|docusign|pandadoc)\b/i,
  },
  {
    category: "contractor",
    pattern: /\b(upwork|fiverr|freelancer|toptal|99designs|contra)\b/i,
  },
];

interface BillingRow {
  id: string;
  number: string | null;
  status: string;
  direction: string;
  category: string | null;
  vendor_label: string | null;
  amount_cents: number;
  amount_paid_cents: number;
  currency: string;
  due_at: string | null;
  paid_at: string | null;
  app_url: string | null;
  person_id: string | null;
  organization_id: string | null;
}

function fillRule(fieldKey: string, signal: string) {
  const field = getFieldsForEntity("billing").find((f) => f.key === fieldKey);
  return field?.fillRules?.find((r) => r.signal === signal);
}

function classifyCategory(text: string | null): "contractor" | "software" | null {
  if (!text) return null;
  for (const { category, pattern } of CATEGORY_KEYWORDS) {
    if (pattern.test(text)) return category;
  }
  return null;
}

export async function produceBillingRecordSignals(input: {
  workspaceId: string;
  envelope: CaptureEnvelope;
  source: string;
}): Promise<{ matched: boolean; writes: number; reason?: string }> {
  const extracted = input.envelope.extracted;
  const invoiceNumber =
    (extracted.invoice_number as string | null) ??
    (extracted.doc_number as string | null);
  const amountDollars =
    (extracted.amount as number | null) ?? (extracted.amount_paid as number | null);
  if (typeof amountDollars !== "number" || amountDollars <= 0) {
    return { matched: false, writes: 0, reason: "no-amount" };
  }
  const amountCents = Math.round(amountDollars * 100);
  const amountPaidDollars = extracted.amount_paid as number | null;
  const amountPaidCents =
    typeof amountPaidDollars === "number" ? Math.round(amountPaidDollars * 100) : 0;
  const currency = ((extracted.currency as string | null) ?? "usd").toUpperCase();
  const status = (extracted.status as string | null) ?? null;
  const isPaid = status === "paid" || status === "succeeded" || amountPaidCents >= amountCents;
  const dueDate = (extracted.due_date as string | null) ?? null;
  const hostedUrl = (extracted.hosted_invoice_url as string | null) ?? null;
  const customerEmail = (extracted.customer_email as string | null) ?? null;
  const customerName = (extracted.customer_name as string | null) ?? null;
  const stripeSynced = input.envelope.sourceType === "stripe";
  const syncSignal = stripeSynced ? "billing_stripe_synced" : "billing_invoice_parsed";

  const admin = createAdminClient();

  let row: BillingRow | null = null;

  // 1. Invoice number is the strongest match.
  if (invoiceNumber) {
    const { data } = await admin
      .from("billing_records")
      .select(
        "id, number, status, direction, category, vendor_label, amount_cents, amount_paid_cents, currency, due_at, paid_at, app_url, person_id, organization_id",
      )
      .eq("workspace_id", input.workspaceId)
      .eq("number", invoiceNumber)
      .is("deleted_at", null)
      .is("archived_at", null)
      .limit(1)
      .maybeSingle();
    row = (data as BillingRow | null) ?? null;
  }

  // 2. Exact amount + currency + resolved counterparty.
  if (!row && customerEmail) {
    const { data: person } = await admin
      .from("people")
      .select("id")
      .eq("workspace_id", input.workspaceId)
      .eq("email", customerEmail)
      .is("deleted_at", null)
      .limit(1)
      .maybeSingle();
    if (person) {
      const { data } = await admin
        .from("billing_records")
        .select(
          "id, number, status, direction, category, vendor_label, amount_cents, amount_paid_cents, currency, due_at, paid_at, app_url, person_id, organization_id",
        )
        .eq("workspace_id", input.workspaceId)
        .eq("person_id", person.id)
        .eq("amount_cents", amountCents)
        .eq("currency", currency)
        .in("status", [...OPEN_STATUSES])
        .is("deleted_at", null)
        .is("archived_at", null)
        .limit(1)
        .maybeSingle();
      row = (data as BillingRow | null) ?? null;
    }
  }

  // 3. Unique open record at this exact amount + currency.
  if (!row) {
    const { data } = await admin
      .from("billing_records")
      .select(
        "id, number, status, direction, category, vendor_label, amount_cents, amount_paid_cents, currency, due_at, paid_at, app_url, person_id, organization_id",
      )
      .eq("workspace_id", input.workspaceId)
      .eq("amount_cents", amountCents)
      .eq("currency", currency)
      .in("status", [...OPEN_STATUSES])
      .is("deleted_at", null)
      .is("archived_at", null);
    const candidates = (data as BillingRow[] | null) ?? [];
    if (candidates.length === 1) row = candidates[0];
  }

  if (!row || !OPEN_STATUSES.includes(row.status as (typeof OPEN_STATUSES)[number])) {
    return { matched: false, writes: 0, reason: "no-open-match" };
  }

  let writes = 0;
  const write = async (input2: {
    fieldKey: string;
    dbColumn: string;
    signal: string;
    value: string | number;
  }) => {
    const rule = fillRule(input2.fieldKey, input2.signal);
    if (!rule) return;
    const result = await memoryUpdateField({
      workspaceId: input.workspaceId,
      entityType: "billing",
      entityId: row!.id,
      field: input2.dbColumn,
      value: input2.value,
      confidence: rule.confidence,
      because: rule.because,
      source: "enrichment",
      sourceDetails: {
        playbookSlug: "memory-records",
        externalId: input.envelope.externalId,
        ruleId: `billing-${input2.fieldKey}-${input2.signal}`,
      },
    });
    if (result.action === "applied") writes++;
  };

  if (invoiceNumber && !row.number) {
    await write({ fieldKey: "number", dbColumn: "number", signal: syncSignal, value: invoiceNumber });
  }
  if (amountPaidCents > 0 && row.amount_paid_cents < amountPaidCents) {
    await write({
      fieldKey: "amountPaidCents",
      dbColumn: "amount_paid_cents",
      signal: syncSignal,
      value: amountPaidCents,
    });
  }
  if (isPaid && !row.paid_at && input.envelope.occurredAt) {
    await write({
      fieldKey: "paidAt",
      dbColumn: "paid_at",
      signal: syncSignal,
      value: input.envelope.occurredAt,
    });
  }
  if (dueDate && !row.due_at) {
    await write({ fieldKey: "dueAt", dbColumn: "due_at", signal: syncSignal, value: dueDate });
  }
  if (hostedUrl && !row.app_url) {
    await write({ fieldKey: "appUrl", dbColumn: "app_url", signal: "billing_stripe_synced", value: hostedUrl });
  }
  if (!row.currency) {
    await write({ fieldKey: "currency", dbColumn: "currency", signal: syncSignal, value: currency });
  }
  if (row.direction === "payable" && customerName && !row.vendor_label) {
    await write({
      fieldKey: "vendorLabel",
      dbColumn: "vendor_label",
      signal: "billing_invoice_parsed",
      value: customerName,
    });
  }
  if (!row.category) {
    const category = classifyCategory(customerName ?? input.envelope.title);
    if (category) {
      await write({
        fieldKey: "category",
        dbColumn: "category",
        signal: "billing_invoice_parsed",
        value: category,
      });
    }
  }

  // Status rules fire through the records capability (constant values ride
  // as boolean signalValues — the rules are eq:true).
  if (isPaid && amountPaidCents >= row.amount_cents) {
    await runCareForSignal({
      workspaceId: input.workspaceId,
      signalKey: "billing_amount_paid_covers_total",
      entityType: "billing",
      entityId: row.id,
      evidence: {
        source: input.source,
        externalId: input.envelope.externalId,
        signalValues: { billing_amount_paid_covers_total: true },
      },
    });
  } else if (amountPaidCents > 0 && amountPaidCents < row.amount_cents) {
    await runCareForSignal({
      workspaceId: input.workspaceId,
      signalKey: "billing_payment_matched",
      entityType: "billing",
      entityId: row.id,
      evidence: {
        source: input.source,
        externalId: input.envelope.externalId,
        signalValues: { billing_payment_matched: true },
      },
    });
  }

  // Money received attests a live org — directly linked, or through the
  // counterparty person's org links.
  if (isPaid) {
    const orgIds = new Set<string>();
    if (row.organization_id) orgIds.add(row.organization_id);
    if (!row.organization_id && row.person_id) {
      const { data: links } = await admin
        .from("organization_people")
        .select("organization_id")
        .eq("person_id", row.person_id);
      for (const link of (links as Array<{ organization_id: string }> | null) ?? []) {
        orgIds.add(link.organization_id);
      }
    }
    for (const orgId of orgIds) {
      await runCareForSignal({
        workspaceId: input.workspaceId,
        signalKey: "org_has_payment_received",
        entityType: "organization",
        entityId: orgId,
        evidence: {
          source: input.source,
          externalId: input.envelope.externalId,
          signalValues: { org_has_payment_received: true },
        },
      });
    }
  }

  return { matched: true, writes };
}
