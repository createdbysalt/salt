import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * createBillingRecordAction — artifact-first document attach (Phase 7).
 *
 * When the draft came from an uploaded document (extraction.sourceDocId is
 * a real billing-documents object path), saving the record also creates a
 * file Resource for the PDF and an attachment edge to the record — the
 * bucket write stops being invisible to the graph.
 */

type Row = Record<string, unknown>;

const h = vi.hoisted(() => {
  const db = {
    billing: [] as Row[],
    resources: [] as Row[],
    links: [] as Row[],
  };
  let seq = 0;

  type Filter = (row: Row) => boolean;

  function filteredQuery(rows: Row[]) {
    const filters: Filter[] = [];
    const builder = {
      select: () => builder,
      eq: (column: string, value: unknown) => {
        filters.push((row) => row[column] === value);
        return builder;
      },
      is: (column: string, value: unknown) => {
        filters.push((row) => (row[column] ?? null) === value);
        return builder;
      },
      maybeSingle: async () => ({
        data: rows.find((row) => filters.every((f) => f(row))) ?? null,
        error: null,
      }),
      insert: (row: Row) => {
        const inserted = { id: `id-${++seq}`, ...row };
        rows.push(inserted);
        return {
          select: () => ({
            single: async () => ({ data: { id: inserted.id }, error: null }),
          }),
        };
      },
    };
    return builder;
  }

  const supabase = {
    from: (table: string) => {
      if (table === "billing_records") return filteredQuery(db.billing);
      if (table === "resources") return filteredQuery(db.resources);
      if (table === "entity_links") return filteredQuery(db.links);
      throw new Error(`unexpected table ${table}`);
    },
  };

  function reset() {
    db.billing.length = 0;
    db.resources.length = 0;
    db.links.length = 0;
    seq = 0;
  }

  return { db, supabase, reset };
});

vi.mock("@/app/_lib/utils/user-dashboard", () => ({
  getWorkspaceContext: async () => ({
    workspace: { id: "ws-1" },
    supabase: h.supabase,
    userId: "user-1",
  }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/app/_lib/learning", () => ({
  emitEntitySignal: vi.fn(),
}));

import { createBillingRecordAction } from "./create-billing-record";
import type { BillingRecordDraft } from "./billing-record-draft";

function draft(overrides: Partial<BillingRecordDraft> = {}): BillingRecordDraft {
  return {
    direction: "payable",
    number: "INV-0042",
    amountCents: 175000,
    currency: "USD",
    status: "draft",
    dueAt: "2026-09-01T12:00:00.000Z",
    lineItems: [{ description: "Brand work", amountCents: 175000 }],
    tags: [],
    ...overrides,
  };
}

beforeEach(() => {
  h.reset();
});

describe("createBillingRecordAction — artifact-first document attach", () => {
  it("attaches the uploaded document as a file resource", async () => {
    const result = await createBillingRecordAction(
      draft({
        extraction: {
          confidence: 95,
          needsReview: [],
          sourceDocId: "workspace/ws-1/abc-invoice.pdf",
        },
      }),
    );

    expect(result.ok).toBe(true);
    expect(h.db.resources).toHaveLength(1);
    expect(h.db.resources[0]).toMatchObject({
      workspace_id: "ws-1",
      bucket_id: "billing-documents",
      object_path: "workspace/ws-1/abc-invoice.pdf",
      file_type: "application/pdf",
      uploaded_by: "user-1",
      created_by_system: false,
      category: "invoice",
    });
    expect(h.db.links[0]).toMatchObject({
      workspace_id: "ws-1",
      source_type: "resource",
      source_id: h.db.resources[0].id,
      target_type: "billing",
      target_id: h.db.billing[0].id,
      relation_type: "attachment",
    });
  });

  it("creates no artifact for manual drafts (no source document)", async () => {
    const result = await createBillingRecordAction(draft());

    expect(result.ok).toBe(true);
    expect(h.db.resources).toHaveLength(0);
    expect(h.db.links).toHaveLength(0);
  });

  it("creates no artifact for sentinel sourceDocIds (manual, ask-salt)", async () => {
    const result = await createBillingRecordAction(
      draft({
        extraction: { confidence: 90, needsReview: [], sourceDocId: "manual" },
      }),
    );

    expect(result.ok).toBe(true);
    expect(h.db.resources).toHaveLength(0);
  });
});
