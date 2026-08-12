import { beforeEach, describe, expect, it, vi } from "vitest";

const mockSendLlm = vi.fn();
const mockMemoryUpdateField = vi.fn();
const mockDownload = vi.fn();
const mockUpdate = vi.fn();

type Filter = [string, string, unknown];
let resourceRow: Record<string, unknown> | null = null;

const mockFrom = vi.fn((table: string) => {
  const filters: Filter[] = [];
  const builder = {
    select: () => builder,
    eq: (f: string, v: unknown) => {
      filters.push(["eq", f, v]);
      return builder;
    },
    maybeSingle: async () => ({ data: table === "resources" ? resourceRow : null }),
    update: (values: unknown) => {
      mockUpdate(values);
      return builder;
    },
    then: (resolve: (value: { data: unknown; error: unknown }) => void) =>
      resolve({ data: null, error: null }),
  };
  return builder;
});

vi.mock("@/app/_lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: mockFrom,
    storage: { from: () => ({ download: mockDownload }) },
  }),
}));
vi.mock("@/app/_lib/ai/gpt", () => ({
  sendLlm: (...args: unknown[]) => mockSendLlm(...args),
  backgroundSpend: (workspaceId: string, userId?: string) => ({
    kind: "workspace",
    workspaceId,
    userId,
    origin: "background",
  }),
}));
vi.mock("@/app/_lib/memory-tools", () => ({
  memoryUpdateField: (...args: unknown[]) => mockMemoryUpdateField(...args),
}));

import { analyzeResourceContent } from "./content-analysis";

const WS = "ws-1";
const RESOURCE_ID = "res-1";

function baseRow(overrides: Record<string, unknown> = {}) {
  return {
    id: RESOURCE_ID,
    file_name: "invoice-march.pdf",
    file_type: "upload",
    mime_type: "application/pdf",
    bucket_id: "bridge-files",
    object_path: "studio/ws-1/person/2026-08/f.pdf",
    category: "other",
    document_type: null,
    description: null,
    total_amount_cents: null,
    currency: null,
    due_date: null,
    expiry_date: null,
    follow_up_date: null,
    ai_summary: null,
    extracted_data: null,
    ...overrides,
  };
}

const LLM_JSON = JSON.stringify({
  category: "invoice",
  documentType: "invoice",
  description: "March invoice for design work.",
  totalAmountCents: 150000,
  currency: "usd",
  dueDate: "2026-09-01",
  expiryDate: null,
  followUpDate: "2026-08-20",
});

describe("analyzeResourceContent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resourceRow = null;
    mockDownload.mockResolvedValue({
      data: { arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer },
      error: null,
    });
    mockSendLlm.mockResolvedValue(LLM_JSON);
    mockMemoryUpdateField.mockResolvedValue({ action: "applied" });
  });

  it("reads a PDF and fills empty category, type, amounts, and dates", async () => {
    resourceRow = baseRow();

    const result = await analyzeResourceContent({
      workspaceId: WS,
      resourceId: RESOURCE_ID,
      actorUserId: "user-1",
    });

    expect(result.analyzed).toBe(true);
    expect(mockSendLlm).toHaveBeenCalledTimes(1);
    expect(mockSendLlm).toHaveBeenCalledWith(
      expect.any(Array),
      expect.objectContaining({ kind: "workspace", workspaceId: WS, origin: "background" }),
      expect.objectContaining({ routingKey: "extraction" }),
    );

    const writtenFields = mockMemoryUpdateField.mock.calls.map(
      ([arg]) => (arg as { field: string }).field,
    );
    expect(writtenFields).toEqual(
      expect.arrayContaining([
        "category",
        "document_type",
        "description",
        "total_amount_cents",
        "currency",
        "due_date",
        "follow_up_date",
      ]),
    );
    expect(writtenFields).not.toContain("expiry_date");

    expect(mockMemoryUpdateField).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: "resource",
        entityId: RESOURCE_ID,
        field: "category",
        value: "invoice",
        sourceDetails: expect.objectContaining({
          ruleId: "resource-category-file_category_inferred",
        }),
      }),
    );
    // currency normalized to upper-case ISO
    expect(mockMemoryUpdateField).toHaveBeenCalledWith(
      expect.objectContaining({ field: "currency", value: "USD" }),
    );

    // idempotency marker stamped
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        extracted_data: expect.objectContaining({
          content_analysis: expect.objectContaining({
            analyzed_at: expect.any(String),
          }),
        }),
      }),
    );
  });

  it("skips a resource that was already analyzed", async () => {
    resourceRow = baseRow({
      extracted_data: { content_analysis: { analyzed_at: "2026-08-01T00:00:00.000Z" } },
    });

    const result = await analyzeResourceContent({ workspaceId: WS, resourceId: RESOURCE_ID });

    expect(result).toEqual({ analyzed: false, reason: "already-analyzed", written: [] });
    expect(mockSendLlm).not.toHaveBeenCalled();
  });

  it("skips when there is no readable content", async () => {
    resourceRow = baseRow({ bucket_id: null, object_path: null, file_type: "link" });

    const result = await analyzeResourceContent({ workspaceId: WS, resourceId: RESOURCE_ID });

    expect(result).toEqual({ analyzed: false, reason: "no-content", written: [] });
    expect(mockSendLlm).not.toHaveBeenCalled();
  });

  it("never overwrites fields the user already set", async () => {
    resourceRow = baseRow({
      category: "contract",
      description: "MSA with Northwind.",
      total_amount_cents: 9900,
    });

    await analyzeResourceContent({ workspaceId: WS, resourceId: RESOURCE_ID });

    const writtenFields = mockMemoryUpdateField.mock.calls.map(
      ([arg]) => (arg as { field: string }).field,
    );
    expect(writtenFields).not.toContain("category");
    expect(writtenFields).not.toContain("description");
    expect(writtenFields).not.toContain("total_amount_cents");
    expect(writtenFields).toContain("document_type");
  });

  it("drops values outside the controlled vocabularies", async () => {
    resourceRow = baseRow();
    mockSendLlm.mockResolvedValue(
      JSON.stringify({ category: "banana", documentType: "scroll", description: null }),
    );

    await analyzeResourceContent({ workspaceId: WS, resourceId: RESOURCE_ID });

    const writtenFields = mockMemoryUpdateField.mock.calls.map(
      ([arg]) => (arg as { field: string }).field,
    );
    expect(writtenFields).not.toContain("category");
    expect(writtenFields).not.toContain("document_type");
  });

  it("does not stamp the marker when the LLM call fails", async () => {
    resourceRow = baseRow();
    mockSendLlm.mockResolvedValue(null);

    const result = await analyzeResourceContent({ workspaceId: WS, resourceId: RESOURCE_ID });

    expect(result).toEqual({ analyzed: false, reason: "llm-unavailable", written: [] });
    expect(mockMemoryUpdateField).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});
