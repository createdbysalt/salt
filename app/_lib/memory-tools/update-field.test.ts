import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const updates: Array<{ table: string; payload: Record<string, unknown> }> = [];
const upserts: Array<{
  table: string;
  payload: Record<string, unknown>;
  options?: Record<string, unknown>;
}> = [];

/**
 * Minimal chainable supabase mock. Chains are awaitable-by-default (plain
 * objects), maybeSingle resolves with an id row so workspace ownership
 * checks pass.
 */
function makeChain(table: string) {
  const chain: Record<string, unknown> = {};
  chain.update = vi.fn((payload: Record<string, unknown>) => {
    updates.push({ table, payload });
    return chain;
  });
  chain.upsert = vi.fn(
    async (payload: Record<string, unknown>, options?: Record<string, unknown>) => {
      upserts.push({ table, payload, options });
      return { error: null };
    }
  );
  chain.insert = vi.fn(async () => ({ error: null }));
  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.neq = vi.fn(() => chain);
  chain.order = vi.fn(() => chain);
  chain.limit = vi.fn(() => chain);
  chain.maybeSingle = vi.fn(async () => ({ data: { id: `${table}-row` } }));
  return chain;
}

vi.mock("@/app/_lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn((table: string) => makeChain(table)),
  })),
}));

const accumulateEvidence = vi.fn(async (_input: unknown) => ({
  evidenceId: "ev-1",
}));
const getAggregatedConfidence = vi.fn(
  async (
    _workspaceId: unknown,
    _entityType: unknown,
    _entityId: unknown,
    _field: unknown
  ) => null
);
const resolveEvidence = vi.fn(
  async (
    _workspaceId: unknown,
    _evidenceIds: unknown,
    _status: unknown,
    _details: unknown
  ) => undefined
);

vi.mock("@/app/_lib/learning", () => ({
  accumulateEvidence: (input: unknown) => accumulateEvidence(input),
  getAggregatedConfidence: (
    workspaceId: unknown,
    entityType: unknown,
    entityId: unknown,
    field: unknown
  ) => getAggregatedConfidence(workspaceId, entityType, entityId, field),
  resolveEvidence: (
    workspaceId: unknown,
    evidenceIds: unknown,
    status: unknown,
    details: unknown
  ) => resolveEvidence(workspaceId, evidenceIds, status, details),
  toLearningDbEntityType: (type: string) => (type === "resource" ? "file" : type),
  fromLearningDbEntityType: (value: string | null | undefined) =>
    value === "file" || value === "resource" ? "resource" : value ?? null,
}));

vi.mock("./get-threshold", () => ({
  getWorkspaceThreshold: vi.fn(async () => ({ threshold: 85 })),
}));

vi.mock("@/app/_lib/learning/correction-blocklist", () => ({
  getCorrectionBlocklist: vi.fn(async () => []),
  findBlockingCorrection: vi.fn(() => null),
}));

import {
  findBlockingCorrection,
  getCorrectionBlocklist,
} from "@/app/_lib/learning/correction-blocklist";
import { memoryUpdateField } from "./update-field";

const baseInput = {
  workspaceId: "ws-1",
  confidence: 95,
  because: "test",
  source: "enrichment" as const,
};

describe("memoryUpdateField field mappings", () => {
  beforeEach(() => {
    updates.length = 0;
    upserts.length = 0;
    vi.clearAllMocks();
  });

  it("rejects previously corrected values from automated sources", async () => {
    vi.mocked(findBlockingCorrection).mockReturnValueOnce({
      id: "corr-1",
      fieldPath: "title",
      wrongValue: "CEO",
      reason: "never_true",
      createdAt: "2026-08-01T00:00:00Z",
    });

    const result = await memoryUpdateField({
      ...baseInput,
      entityType: "person",
      entityId: "person-1",
      field: "title",
      value: "CEO",
    });

    expect(result.action).toBe("rejected");
    expect(result.message).toContain("previously corrected");
    expect(updates).toHaveLength(0);
  });

  it("lets manual writes bypass the correction blocklist", async () => {
    const result = await memoryUpdateField({
      ...baseInput,
      source: "manual",
      entityType: "person",
      entityId: "person-1",
      field: "title",
      value: "CEO",
    });

    expect(result.action).toBe("applied");
    expect(getCorrectionBlocklist).not.toHaveBeenCalled();
  });

  it("maps person address_line1 aliases to the address_line_1 column", async () => {
    const result = await memoryUpdateField({
      ...baseInput,
      entityType: "person",
      entityId: "person-1",
      field: "address_line1",
      value: "123 Main St",
    });

    expect(result.action).toBe("applied");
    const peopleUpdate = updates.find((u) => u.table === "people");
    expect(peopleUpdate?.payload).toEqual({ address_line_1: "123 Main St" });
  });

  it("routes person org_link through the organization_people junction", async () => {
    const result = await memoryUpdateField({
      ...baseInput,
      entityType: "person",
      entityId: "person-1",
      field: "org_link",
      value: "org-1",
    });

    expect(result.action).toBe("applied");
    // No direct people-table column write for org_link
    expect(updates.filter((u) => u.table === "people")).toHaveLength(0);
    const junction = upserts.find((u) => u.table === "organization_people");
    expect(junction?.payload).toMatchObject({
      organization_id: "org-1",
      person_id: "person-1",
    });
    expect(junction?.options).toEqual({
      onConflict: "organization_id,person_id",
    });
  });

  it("routes org key_contact through the junction and demotes other primaries", async () => {
    const result = await memoryUpdateField({
      ...baseInput,
      entityType: "organization",
      entityId: "org-1",
      field: "key_contact",
      value: "person-1",
    });

    expect(result.action).toBe("applied");
    const junction = upserts.find((u) => u.table === "organization_people");
    expect(junction?.payload).toMatchObject({
      organization_id: "org-1",
      person_id: "person-1",
      role: "Primary Contact",
      is_primary: true,
    });
    // Demotion pass on other rows
    const demote = updates.find(
      (u) =>
        u.table === "organization_people" &&
        (u.payload as { is_primary?: boolean }).is_primary === false
    );
    expect(demote).toBeDefined();
  });

  it("maps org address fields to snake_case DB columns", async () => {
    await memoryUpdateField({
      ...baseInput,
      entityType: "organization",
      entityId: "org-1",
      field: "postal_code",
      value: "M5V 2T6",
    });

    const orgUpdate = updates.find((u) => u.table === "organizations");
    expect(orgUpdate?.payload).toEqual({ postal_code: "M5V 2T6" });
  });

  it("accumulates instead of applying below the threshold", async () => {
    const result = await memoryUpdateField({
      ...baseInput,
      confidence: 60,
      entityType: "person",
      entityId: "person-1",
      field: "phone",
      value: "+1 555 0100",
    });

    expect(result.action).toBe("accumulated");
    expect(result.evidenceId).toBe("ev-1");
    expect(updates).toHaveLength(0);
    expect(accumulateEvidence).toHaveBeenCalledTimes(1);
  });

  it("rejects unknown person fields", async () => {
    await expect(
      memoryUpdateField({
        ...baseInput,
        entityType: "person",
        entityId: "person-1",
        field: "not_a_field",
        value: "x",
      })
    ).rejects.toThrow("Unknown person field");
  });
});
