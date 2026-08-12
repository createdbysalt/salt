import { beforeEach, describe, expect, it, vi } from "vitest";

const mockMemoryUpdateField = vi.fn();
const mockRunCareForSignal = vi.fn();

type Filter = [string, string, unknown];
let billingRows: Array<Record<string, unknown>> = [];
let peopleRows: Array<{ id: string; email: string | null }> = [];
let orgLinkRows: Array<{ organization_id: string }> = [];

function matchesFilters(row: Record<string, unknown>, filters: Filter[]): boolean {
  return filters.every(([op, f, v]) => {
    if (op === "eq") return row[f] === v;
    if (op === "in") return Array.isArray(v) && v.includes(row[f]);
    if (op === "is") return row[f] === null;
    return true;
  });
}

const mockFrom = vi.fn((table: string) => {
  const filters: Filter[] = [];
  const builder = {
    select: () => builder,
    eq: (f: string, v: unknown) => {
      filters.push(["eq", f, v]);
      return builder;
    },
    in: (f: string, v: unknown) => {
      filters.push(["in", f, v]);
      return builder;
    },
    is: (f: string, v: unknown) => {
      filters.push(["is", f, v]);
      return builder;
    },
    limit: () => builder,
    maybeSingle: async () => {
      if (table === "billing_records") {
        return { data: billingRows.filter((r) => matchesFilters(r, filters))[0] ?? null };
      }
      if (table === "people") {
        const emailFilter = filters.find(([op, f]) => op === "eq" && f === "email");
        return {
          data: peopleRows.find((p) => p.email === emailFilter?.[2]) ?? null,
        };
      }
      return { data: null };
    },
    then: (resolve: (value: { data: unknown }) => void) => {
      if (table === "billing_records") {
        return resolve({ data: billingRows.filter((r) => matchesFilters(r, filters)) });
      }
      if (table === "organization_people") return resolve({ data: orgLinkRows });
      return resolve({ data: [] });
    },
  };
  return builder;
});

vi.mock("@/app/_lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockFrom }),
}));
vi.mock("@/app/_lib/memory-tools", () => ({
  memoryUpdateField: (...args: unknown[]) => mockMemoryUpdateField(...args),
}));
vi.mock("@/app/_features/memory/care/scheduler", () => ({
  runCareForSignal: (...args: unknown[]) => mockRunCareForSignal(...args),
}));

import { produceBillingRecordSignals } from "./billing-record-producer";
import type { CaptureEnvelope } from "../../adapters/types";

const WS = "ws-1";

function paymentEnvelope(overrides: Record<string, unknown> = {}): CaptureEnvelope {
  return {
    sourceType: "stripe",
    captureType: "payment",
    externalId: "in_123",
    title: "Stripe: invoice.payment_succeeded",
    occurredAt: "2026-08-10T12:00:00.000Z",
    participants: [{ email: "jane@northwind.com", name: "Jane Doe", role: "payer" }],
    threadId: null,
    extracted: {
      customer_email: "jane@northwind.com",
      customer_name: "Jane Doe",
      amount: 1500,
      amount_paid: 1500,
      currency: "usd",
      status: "paid",
      invoice_number: "INV-0042",
      due_date: "2026-08-15T00:00:00.000Z",
      hosted_invoice_url: "https://invoice.stripe.com/i/123",
    },
    raw: {},
    noise: null,
    ...overrides,
  } as CaptureEnvelope;
}

function openBillingRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "bill-1",
    workspace_id: WS,
    number: null,
    status: "due",
    direction: "receivable",
    category: null,
    vendor_label: null,
    amount_cents: 150000,
    amount_paid_cents: 0,
    currency: "USD",
    due_at: null,
    paid_at: null,
    app_url: null,
    person_id: "person-1",
    organization_id: "org-1",
    work_id: null,
    deleted_at: null,
    archived_at: null,
    ...overrides,
  };
}

describe("produceBillingRecordSignals", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    billingRows = [];
    peopleRows = [{ id: "person-1", email: "jane@northwind.com" }];
    orgLinkRows = [{ organization_id: "org-1" }];
    mockMemoryUpdateField.mockResolvedValue({ action: "applied" });
    mockRunCareForSignal.mockResolvedValue([]);
  });

  it("matches by invoice number and corroborates the open record", async () => {
    billingRows = [openBillingRow({ number: "INV-0042" })];

    const result = await produceBillingRecordSignals({
      workspaceId: WS,
      envelope: paymentEnvelope(),
      source: "stripe",
    });

    expect(result.matched).toBe(true);
    const written = mockMemoryUpdateField.mock.calls.map(
      ([arg]) => (arg as { field: string; value: unknown }).field,
    );
    expect(written).toEqual(
      expect.arrayContaining(["amount_paid_cents", "paid_at", "app_url", "due_at"]),
    );
    expect(mockMemoryUpdateField).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: "billing",
        entityId: "bill-1",
        field: "amount_paid_cents",
        value: 150000,
        sourceDetails: expect.objectContaining({
          ruleId: "billing-amountPaidCents-billing_stripe_synced",
        }),
      }),
    );
    // Full payment attests the status rule.
    expect(mockRunCareForSignal).toHaveBeenCalledWith(
      expect.objectContaining({
        signalKey: "billing_amount_paid_covers_total",
        entityType: "billing",
        entityId: "bill-1",
        evidence: expect.objectContaining({
          signalValues: { billing_amount_paid_covers_total: true },
        }),
      }),
    );
    // Money received on an org-linked record attests a live org.
    expect(mockRunCareForSignal).toHaveBeenCalledWith(
      expect.objectContaining({
        signalKey: "org_has_payment_received",
        entityType: "organization",
        entityId: "org-1",
      }),
    );
  });

  it("matches by amount + currency + counterparty when the number is not on file", async () => {
    // Row has no number yet, so the invoice-number lookup misses and the
    // amount + counterparty path matches; the number then gets filled.
    billingRows = [openBillingRow()];

    const result = await produceBillingRecordSignals({
      workspaceId: WS,
      envelope: paymentEnvelope(),
      source: "stripe",
    });

    expect(result.matched).toBe(true);
    expect(mockMemoryUpdateField).toHaveBeenCalledWith(
      expect.objectContaining({ field: "number", value: "INV-0042" }),
    );
  });

  it("does not touch records that are already paid", async () => {
    billingRows = [openBillingRow({ status: "paid", amount_paid_cents: 150000 })];

    const result = await produceBillingRecordSignals({
      workspaceId: WS,
      envelope: paymentEnvelope(),
      source: "stripe",
    });

    expect(result).toEqual({ matched: false, writes: 0, reason: "no-open-match" });
    expect(mockMemoryUpdateField).not.toHaveBeenCalled();
  });

  it("fills vendor label and category on payable records", async () => {
    billingRows = [
      openBillingRow({
        direction: "payable",
        organization_id: null,
        person_id: null,
        status: "due",
      }),
    ];
    const envelope = paymentEnvelope();
    envelope.extracted = {
      ...envelope.extracted,
      customer_name: "Figma Inc",
      invoice_number: null,
    };

    const result = await produceBillingRecordSignals({
      workspaceId: WS,
      envelope,
      source: "stripe",
    });

    expect(result.matched).toBe(true);
    expect(mockMemoryUpdateField).toHaveBeenCalledWith(
      expect.objectContaining({ field: "vendor_label", value: "Figma Inc" }),
    );
    expect(mockMemoryUpdateField).toHaveBeenCalledWith(
      expect.objectContaining({ field: "category", value: "software" }),
    );
  });

  it("dispatches the partial signal when payment covers less than the total", async () => {
    billingRows = [openBillingRow()];
    const envelope = paymentEnvelope();
    envelope.extracted = { ...envelope.extracted, amount_paid: 500, status: "open" };

    await produceBillingRecordSignals({ workspaceId: WS, envelope, source: "stripe" });

    expect(mockRunCareForSignal).toHaveBeenCalledWith(
      expect.objectContaining({
        signalKey: "billing_payment_matched",
        evidence: expect.objectContaining({
          signalValues: { billing_payment_matched: true },
        }),
      }),
    );
    expect(mockRunCareForSignal).not.toHaveBeenCalledWith(
      expect.objectContaining({ signalKey: "billing_amount_paid_covers_total" }),
    );
  });

  it("skips envelopes without a usable amount", async () => {
    const envelope = paymentEnvelope();
    envelope.extracted = { ...envelope.extracted, amount: null, amount_paid: null };

    const result = await produceBillingRecordSignals({
      workspaceId: WS,
      envelope,
      source: "stripe",
    });

    expect(result).toEqual({ matched: false, writes: 0, reason: "no-amount" });
  });
});
