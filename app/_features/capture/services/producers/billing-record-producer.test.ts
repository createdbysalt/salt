import { beforeEach, describe, expect, it, vi } from "vitest";

const mockMemoryUpdateField = vi.fn();
const mockRunCareForSignal = vi.fn();
const mockRouteIntakeProposal = vi.fn();

type Filter = [string, string, unknown];
let billingRows: Array<Record<string, unknown>> = [];
let peopleRows: Array<{ id: string; email: string | null }> = [];
let orgLinkRows: Array<{ organization_id: string }> = [];
const updates: Array<{ table: string; payload: Record<string, unknown>; filters: Filter[] }> = [];

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
    update: (payload: Record<string, unknown>) => {
      updates.push({ table, payload, filters });
      return builder;
    },
    eq: (f: string, v: unknown) => {
      filters.push(["eq", f, v]);
      return builder;
    },
    in: (f: string, v: unknown) => {
      filters.push(["in", f, v]);
      return builder;
    },
    ilike: (f: string, v: unknown) => {
      filters.push(["ilike", f, v]);
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
        const idFilter = filters.find(([op, f]) => op === "in" && f === "id");
        if (idFilter) {
          return {
            data:
              peopleRows.find((p) => (idFilter[2] as string[]).includes(p.id)) ??
              null,
          };
        }
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
      if (table === "people") {
        const emailFilter = filters.find(
          ([op, f]) => (op === "eq" || op === "ilike") && f === "email",
        );
        return resolve({
          data: emailFilter
            ? peopleRows.filter((p) => p.email === emailFilter[2])
            : [],
        });
      }
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
vi.mock("@/app/_features/memory/evidence/route-intake-proposal", () => ({
  routeIntakeProposal: (...args: unknown[]) => mockRouteIntakeProposal(...args),
}));

const mockExecuteRecordAction = vi.fn();
vi.mock("@/app/_features/memory/records", () => ({
  executeRecordAction: (...args: unknown[]) => mockExecuteRecordAction(...args),
}));

// The category registry is DB-backed with a frozen fallback; against the
// mocked admin client the DB "wins" empty, so pin the taxonomy here.
vi.mock("@/app/_lib/composio/enrichment/registry", () => ({
  getCategoryForConnector: async (provider: string) =>
    provider === "stripe" || provider === "quickbooks" ? "billing" : null,
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
    updates.length = 0;
    billingRows = [];
    peopleRows = [{ id: "person-1", email: "jane@northwind.com" }];
    orgLinkRows = [{ organization_id: "org-1" }];
    mockMemoryUpdateField.mockResolvedValue({ action: "applied" });
    mockRunCareForSignal.mockResolvedValue([]);
    mockRouteIntakeProposal.mockResolvedValue({ outcome: "suggested", evidenceId: "ev-1" });
    mockExecuteRecordAction.mockResolvedValue({
      success: true,
      entity_id: "bill-new",
      entity_type: "invoice",
    });
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

    // The paid row is a different invoice (no number on file), so the
    // unmatched INV-0042 births its own record — the paid row stays
    // untouched either way.
    expect(result).toEqual({ matched: false, writes: 0, reason: "record-created" });
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

  it("attests the matched record's person as a client on payment", async () => {
    billingRows = [openBillingRow()];

    await produceBillingRecordSignals({
      workspaceId: WS,
      envelope: paymentEnvelope(),
      source: "stripe",
    });

    expect(mockRunCareForSignal).toHaveBeenCalledWith(
      expect.objectContaining({
        signalKey: "has_payment_received",
        entityType: "person",
        entityId: "person-1",
        evidence: expect.objectContaining({
          signalValues: { has_payment_received: true },
        }),
      }),
    );
  });

  it("attests the counterparty person even when no open record matches", async () => {
    billingRows = [];

    const result = await produceBillingRecordSignals({
      workspaceId: WS,
      envelope: paymentEnvelope(),
      source: "stripe",
    });

    expect(result.matched).toBe(false);
    expect(mockRunCareForSignal).toHaveBeenCalledWith(
      expect.objectContaining({
        signalKey: "has_payment_received",
        entityType: "person",
        entityId: "person-1",
      }),
    );
  });

  it("does not attest when the payment is unpaid or the person is unknown", async () => {
    billingRows = [openBillingRow()];

    const unpaid = paymentEnvelope();
    unpaid.extracted = { ...unpaid.extracted, status: "open", amount_paid: 0 };
    await produceBillingRecordSignals({ workspaceId: WS, envelope: unpaid, source: "stripe" });

    // Counterparty cannot be birthed (e.g. operator-guard refusal) and
    // nothing matches — there is no person to attest.
    billingRows = [];
    peopleRows = [];
    mockExecuteRecordAction.mockImplementation(async (_ws: string, slug: string) =>
      slug === "system:create-person"
        ? { success: false, error: "refused" }
        : { success: true, entity_id: "bill-new", entity_type: "invoice" },
    );
    await produceBillingRecordSignals({ workspaceId: WS, envelope: paymentEnvelope(), source: "stripe" });

    const personAttestations = mockRunCareForSignal.mock.calls.filter(
      ([arg]) => (arg as { signalKey: string }).signalKey === "has_payment_received",
    );
    expect(personAttestations).toHaveLength(0);
  });

  it("routes a work-lane proposal for the counterparty on every invoice", async () => {
    billingRows = [openBillingRow()];

    await produceBillingRecordSignals({
      workspaceId: WS,
      envelope: paymentEnvelope(),
      source: "stripe",
    });

    expect(mockRouteIntakeProposal).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: WS,
        entityType: "work",
        identifier: "Jane Doe",
        signals: ["invoice_line_items_suggest_project"],
      }),
    );
    // No calibration input — the evidence score is the only gate.
    const [workCall] = mockRouteIntakeProposal.mock.calls.find(
      ([arg]) => (arg as { entityType: string }).entityType === "work",
    )!;
    expect(workCall).not.toHaveProperty("autoApply");
  });

  it("never names the work evidence after the counterparty", async () => {
    billingRows = [openBillingRow()];

    await produceBillingRecordSignals({
      workspaceId: WS,
      envelope: paymentEnvelope(),
      source: "stripe",
    });

    const [workCall] = mockRouteIntakeProposal.mock.calls.find(
      ([arg]) => (arg as { entityType: string }).entityType === "work",
    )!;
    const fields = (workCall as { extractedFields: Record<string, { value: string }> })
      .extractedFields;
    // The counterparty anchors the evidence; the client name must never
    // occupy the work record's name field.
    expect(fields.counterparty?.value).toBe("Jane Doe");
    expect(fields.name).toBeUndefined();
  });

  it("names the work evidence from invoice line-item descriptions", async () => {
    billingRows = [openBillingRow()];

    await produceBillingRecordSignals({
      workspaceId: WS,
      envelope: paymentEnvelope({
        extracted: {
          ...paymentEnvelope().extracted,
          line_item_descriptions: ["Brand photography — day rate", "Travel"],
        },
      }),
      source: "stripe",
    });

    const [workCall] = mockRouteIntakeProposal.mock.calls.find(
      ([arg]) => (arg as { entityType: string }).entityType === "work",
    )!;
    const fields = (workCall as { extractedFields: Record<string, { value: string }> })
      .extractedFields;
    expect(fields.name?.value).toBe("Brand photography — day rate");
    expect(fields.counterparty?.value).toBe("Jane Doe");
  });

  it("skips the work proposal when no counterparty is identifiable", async () => {
    const envelope = paymentEnvelope();
    envelope.extracted = { ...envelope.extracted, customer_email: null, customer_name: null };

    await produceBillingRecordSignals({ workspaceId: WS, envelope, source: "stripe" });

    const workCalls = mockRouteIntakeProposal.mock.calls.filter(
      ([arg]) => (arg as { entityType: string }).entityType === "work",
    );
    expect(workCalls).toHaveLength(0);
  });

  describe("unmatched invoice from a connected billing provider → factual birth", () => {
    it("births the billing record directly from the connected-provider fact", async () => {
      const result = await produceBillingRecordSignals({
        workspaceId: WS,
        envelope: paymentEnvelope(),
        source: "stripe",
      });

      expect(result).toEqual({ matched: false, writes: 0, reason: "record-created" });
      expect(mockExecuteRecordAction).toHaveBeenCalledWith(
        WS,
        "system:create-billing",
        expect.objectContaining({
          direction: "receivable",
          amount_cents: 150000,
          amount_paid_cents: 150000,
          currency: "USD",
          status: "paid",
          number: "INV-0042",
          due_at: "2026-08-15T00:00:00.000Z",
          paid_at: "2026-08-10T12:00:00.000Z",
          app_url: "https://invoice.stripe.com/i/123",
          person_id: "person-1",
          // billing_records_source_check allows user/imported/salt_inferred —
          // the connector name lives in source_external_id, not source.
          source: "salt_inferred",
          origin: "found",
          source_external_id: "in_123",
        }),
      );
      // The factual path never routes a billing-lane proposal (the work-lane
      // proposal for the counterparty still fires and keeps its gate).
      const billingCalls = mockRouteIntakeProposal.mock.calls.filter(
        ([arg]) => (arg as { entityType: string }).entityType === "billing",
      );
      expect(billingCalls).toHaveLength(0);
    });

    it("closes out proposal-lane evidence when the factual birth succeeds", async () => {
      const result = await produceBillingRecordSignals({
        workspaceId: WS,
        envelope: paymentEnvelope(),
        source: "stripe",
      });

      expect(result.reason).toBe("record-created");
      // A stale "suggested" row for the same invoice would offer to create a
      // duplicate — the birth marks it created with the new record id.
      const closeOut = updates.find((u) => u.table === "pending_evidence");
      expect(closeOut?.payload).toMatchObject({
        status: "created",
        created_record_id: "bill-new",
      });
      expect(closeOut?.filters).toContainEqual([
        "in",
        "identifier",
        ["inv-0042", "stripe:in_123"],
      ]);
      expect(closeOut?.filters).toContainEqual(["eq", "workspace_id", WS]);
    });

    it("births an unpaid invoice as due", async () => {
      const envelope = paymentEnvelope();
      envelope.extracted = {
        ...envelope.extracted,
        status: "open",
        amount_paid: 0,
      };

      await produceBillingRecordSignals({ workspaceId: WS, envelope, source: "stripe" });

      expect(mockExecuteRecordAction).toHaveBeenCalledWith(
        WS,
        "system:create-billing",
        expect.objectContaining({ status: "due", paid_at: undefined }),
      );
    });

    it("keeps the proposal lane when no counterparty is identifiable", async () => {
      const envelope = paymentEnvelope();
      envelope.extracted = {
        ...envelope.extracted,
        customer_email: null,
        customer_name: null,
      };

      await produceBillingRecordSignals({ workspaceId: WS, envelope, source: "stripe" });

      expect(mockExecuteRecordAction).not.toHaveBeenCalled();
      expect(mockRouteIntakeProposal).toHaveBeenCalledWith(
        expect.objectContaining({ entityType: "billing", identifier: "INV-0042" }),
      );
    });

    it("routes email-classified billing signals through the proposal lane (no factual birth)", async () => {
      const envelope = paymentEnvelope({ sourceType: "gmail" });

      await produceBillingRecordSignals({ workspaceId: WS, envelope, source: "gmail" });

      expect(mockExecuteRecordAction).not.toHaveBeenCalled();
      expect(mockRouteIntakeProposal).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: "billing",
          identifier: "INV-0042",
        }),
      );
    });

    it("does not birth when the invoice number is tracked in a non-open status", async () => {
      // A paid record falls through the open-status matcher — creating it
      // again would duplicate the record.
      billingRows = [{ ...openBillingRow(), number: "INV-0042", status: "paid" }];

      await produceBillingRecordSignals({
        workspaceId: WS,
        envelope: paymentEnvelope(),
        source: "stripe",
      });

      expect(mockExecuteRecordAction).not.toHaveBeenCalled();
      const billingCalls = mockRouteIntakeProposal.mock.calls.filter(
        ([arg]) => (arg as { entityType: string }).entityType === "billing",
      );
      expect(billingCalls).toHaveLength(0);
    });

    it("does not birth when this capture already birthed a record", async () => {
      billingRows = [
        { ...openBillingRow(), status: "paid", number: "INV-OTHER", source_external_id: "in_123" },
      ];

      await produceBillingRecordSignals({
        workspaceId: WS,
        envelope: paymentEnvelope(),
        source: "stripe",
      });

      expect(mockExecuteRecordAction).not.toHaveBeenCalled();
      const billingCalls = mockRouteIntakeProposal.mock.calls.filter(
        ([arg]) => (arg as { entityType: string }).entityType === "billing",
      );
      expect(billingCalls).toHaveLength(0);
    });

    it("births and links the counterparty person when the Stripe customer is not in Memory", async () => {
      peopleRows = []; // customer not in Memory yet
      mockExecuteRecordAction.mockImplementation(async (_ws: string, slug: string) =>
        slug === "system:create-person"
          ? { success: true, entity_id: "person-new", entity_type: "person" }
          : { success: true, entity_id: "bill-new", entity_type: "invoice" },
      );

      const result = await produceBillingRecordSignals({
        workspaceId: WS,
        envelope: paymentEnvelope(),
        source: "stripe",
      });

      expect(result.reason).toBe("record-created");
      expect(mockExecuteRecordAction).toHaveBeenCalledWith(
        WS,
        "system:create-person",
        expect.objectContaining({ name: "Jane Doe", email: "jane@northwind.com" }),
      );
      expect(mockExecuteRecordAction).toHaveBeenCalledWith(
        WS,
        "system:create-billing",
        expect.objectContaining({ person_id: "person-new" }),
      );
    });

    it("derives the person name from the email local part when the provider carries no name", async () => {
      peopleRows = [];
      mockExecuteRecordAction.mockImplementation(async (_ws: string, slug: string) =>
        slug === "system:create-person"
          ? { success: true, entity_id: "person-new", entity_type: "person" }
          : { success: true, entity_id: "bill-new", entity_type: "invoice" },
      );
      const envelope = paymentEnvelope();
      envelope.extracted = { ...envelope.extracted, customer_name: null };

      await produceBillingRecordSignals({ workspaceId: WS, envelope, source: "stripe" });

      expect(mockExecuteRecordAction).toHaveBeenCalledWith(
        WS,
        "system:create-person",
        expect.objectContaining({ name: "Jane", email: "jane@northwind.com" }),
      );
    });

    it("still births the billing record when the person birth fails", async () => {
      peopleRows = [];
      mockExecuteRecordAction.mockImplementation(async (_ws: string, slug: string) =>
        slug === "system:create-person"
          ? { success: false, error: "Refusing to create person: operator" }
          : { success: true, entity_id: "bill-new", entity_type: "invoice" },
      );

      const result = await produceBillingRecordSignals({
        workspaceId: WS,
        envelope: paymentEnvelope(),
        source: "stripe",
      });

      expect(result.reason).toBe("record-created");
      expect(mockExecuteRecordAction).toHaveBeenCalledWith(
        WS,
        "system:create-billing",
        expect.objectContaining({ person_id: undefined }),
      );
    });

    it("never births a person on the proposal lane (email-classified billing)", async () => {
      peopleRows = [];
      const envelope = paymentEnvelope({ sourceType: "gmail" });

      await produceBillingRecordSignals({ workspaceId: WS, envelope, source: "gmail" });

      const personCalls = mockExecuteRecordAction.mock.calls.filter(
        ([, slug]) => slug === "system:create-person",
      );
      expect(personCalls).toHaveLength(0);
    });

    it("attests a first-time customer as a client once the birth links them", async () => {
      peopleRows = [];
      mockExecuteRecordAction.mockImplementation(async (_ws: string, slug: string) =>
        slug === "system:create-person"
          ? { success: true, entity_id: "person-new", entity_type: "person" }
          : { success: true, entity_id: "bill-new", entity_type: "invoice" },
      );

      await produceBillingRecordSignals({
        workspaceId: WS,
        envelope: paymentEnvelope(),
        source: "stripe",
      });

      expect(mockRunCareForSignal).toHaveBeenCalledWith(
        expect.objectContaining({
          signalKey: "has_payment_received",
          entityType: "person",
          entityId: "person-new",
        }),
      );
    });
  });
});
