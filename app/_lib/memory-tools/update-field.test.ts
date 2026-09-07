import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const updates: Array<{ table: string; payload: Record<string, unknown> }> = [];
const upserts: Array<{
  table: string;
  payload: Record<string, unknown>;
  options?: Record<string, unknown>;
}> = [];
const inserts: Array<{ table: string; payload: unknown }> = [];

/**
 * When set, the profile_field_provenance lookup returns this as the
 * previously applied value — simulating a field the tool already wrote.
 */
let previousProvenanceValue: string | null = null;

/**
 * When set, entity-row reads (the row-level no-op guard) return these
 * columns merged into the row — simulating a value set by a manual edit or
 * seed, where no tool provenance exists.
 */
let currentRowValues: Record<string, unknown> | null = null;

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
  chain.insert = vi.fn(async (payload: unknown) => {
    inserts.push({ table, payload });
    return { error: null };
  });
  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.neq = vi.fn(() => chain);
  chain.order = vi.fn(() => chain);
  chain.limit = vi.fn(() => chain);
  chain.maybeSingle = vi.fn(async () => {
    if (table === "profile_field_provenance" && previousProvenanceValue !== null) {
      return { data: { id: "prov-1", value: previousProvenanceValue } };
    }
    if (currentRowValues) {
      return { data: { id: `${table}-row`, ...currentRowValues } };
    }
    return { data: { id: `${table}-row` } };
  });
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
  toLearningDbEntityType: (type: string) => type,
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

const recordSaltLearning = vi.fn(async (_input: unknown) => ({
  id: "learn-1",
}));

vi.mock("@/app/_lib/learning/salt-learnings", () => ({
  recordSaltLearning: (input: unknown) => recordSaltLearning(input),
  generateEvidenceSummary: (evidenceCount: number) =>
    `Seen ${evidenceCount} times in source`,
}));

const dispatchRecordConditionTrigger = vi.fn(async (_input: unknown) => []);

vi.mock("@/app/_features/plays/playbooks/trigger-dispatch", () => ({
  dispatchRecordConditionTrigger: (input: unknown) =>
    dispatchRecordConditionTrigger(input),
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

  it("maps the billing dbColumn spellings the record producer writes by", async () => {
    const paid = await memoryUpdateField({
      ...baseInput,
      entityType: "billing",
      entityId: "bill-1",
      field: "amount_paid_cents",
      value: 125000,
    });
    expect(paid.action).toBe("applied");
    expect(
      updates.find((u) => u.table === "billing_records")?.payload,
    ).toEqual({ amount_paid_cents: 125000 });

    const numbered = await memoryUpdateField({
      ...baseInput,
      entityType: "billing",
      entityId: "bill-1",
      field: "number",
      value: "INV-0042",
    });
    expect(numbered.action).toBe("applied");
    expect(
      updates.filter((u) => u.table === "billing_records")[1]?.payload,
    ).toEqual({ number: "INV-0042" });
  });
});

describe("memoryUpdateField no-op suppression", () => {
  beforeEach(() => {
    updates.length = 0;
    upserts.length = 0;
    inserts.length = 0;
    previousProvenanceValue = null;
    vi.clearAllMocks();
  });

  it("skips the write, provenance, and Handled log when the value is already applied", async () => {
    previousProvenanceValue = "CEO";

    const result = await memoryUpdateField({
      ...baseInput,
      entityType: "person",
      entityId: "person-1",
      field: "title",
      value: "CEO",
      sourceDetails: { playbookSlug: "memory-records" },
    });

    expect(result.action).toBe("applied");
    expect(result.noop).toBe(true);
    expect(result.message).toContain("Already set");
    // No column write, no provenance row, no salt_learnings row.
    expect(updates.find((u) => u.table === "people")).toBeUndefined();
    expect(
      inserts.find((i) => i.table === "profile_field_provenance"),
    ).toBeUndefined();
    expect(recordSaltLearning).not.toHaveBeenCalled();
  });

  it("applies normally when the previous value differs", async () => {
    previousProvenanceValue = "CTO";

    const result = await memoryUpdateField({
      ...baseInput,
      entityType: "person",
      entityId: "person-1",
      field: "title",
      value: "CEO",
    });

    expect(result.action).toBe("applied");
    expect(result.noop).toBeUndefined();
    expect(updates.find((u) => u.table === "people")).toBeDefined();
    expect(recordSaltLearning).toHaveBeenCalledTimes(1);
  });

  it("applies normally when there is no previous provenance", async () => {
    const result = await memoryUpdateField({
      ...baseInput,
      entityType: "person",
      entityId: "person-1",
      field: "title",
      value: "CEO",
    });

    expect(result.action).toBe("applied");
    expect(result.noop).toBeUndefined();
    expect(updates.find((u) => u.table === "people")).toBeDefined();
  });
});

describe("memoryUpdateField row-level no-op guard", () => {
  beforeEach(() => {
    updates.length = 0;
    upserts.length = 0;
    inserts.length = 0;
    previousProvenanceValue = null;
    currentRowValues = null;
    vi.clearAllMocks();
  });

  it("returns applied+noop before accumulating when the row already holds the value", async () => {
    // record_status is already "active" — set by a seed or manual edit, so
    // no tool provenance exists for the apply-path guard to catch. The
    // row-level guard must stop the cycle before evidence accumulates.
    currentRowValues = { record_status: "active" };

    const result = await memoryUpdateField({
      ...baseInput,
      entityType: "person",
      entityId: "person-1",
      field: "record_status",
      value: "active",
      sourceDetails: { playbookSlug: "memory-records" },
    });

    expect(result.action).toBe("applied");
    expect(result.noop).toBe(true);
    expect(result.message).toContain("Already set");
    // Nothing accumulated, nothing written, nothing logged.
    expect(accumulateEvidence).not.toHaveBeenCalled();
    expect(updates.find((u) => u.table === "people")).toBeUndefined();
    expect(recordSaltLearning).not.toHaveBeenCalled();
  });

  it("accumulates normally when the row holds a different value", async () => {
    currentRowValues = { record_status: "inactive" };

    const result = await memoryUpdateField({
      ...baseInput,
      entityType: "person",
      entityId: "person-1",
      field: "record_status",
      value: "active",
    });

    expect(result.noop).toBeUndefined();
    expect(accumulateEvidence).toHaveBeenCalledTimes(1);
  });
});

describe("memoryUpdateField Handled learning logging", () => {
  beforeEach(() => {
    updates.length = 0;
    upserts.length = 0;
    vi.clearAllMocks();
  });

  it("logs a salt_learning when a Salt-driven write applies", async () => {
    const result = await memoryUpdateField({
      ...baseInput,
      entityType: "person",
      entityId: "person-1",
      field: "title",
      value: "CEO",
      sourceDetails: { playbookSlug: "memory-records" },
    });

    expect(result.action).toBe("applied");
    expect(recordSaltLearning).toHaveBeenCalledTimes(1);
    expect(recordSaltLearning).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: "ws-1",
        entityType: "person",
        entityId: "person-1",
        fieldPath: "title",
        newValue: "CEO",
        confidence: 95,
        playbookSlug: "memory-records",
      })
    );
  });

  it("does not log manual writes — the user just made the edit", async () => {
    const result = await memoryUpdateField({
      ...baseInput,
      source: "manual",
      entityType: "person",
      entityId: "person-1",
      field: "title",
      value: "CEO",
    });

    expect(result.action).toBe("applied");
    expect(recordSaltLearning).not.toHaveBeenCalled();
  });

  it("does not log Ask Salt writes — the user asked in chat", async () => {
    const result = await memoryUpdateField({
      ...baseInput,
      source: "ask_salt",
      entityType: "person",
      entityId: "person-1",
      field: "title",
      value: "CEO",
    });

    expect(result.action).toBe("applied");
    expect(recordSaltLearning).not.toHaveBeenCalled();
  });

  it("honors skipLearningLog for callers that logged the learning themselves", async () => {
    const result = await memoryUpdateField({
      ...baseInput,
      skipLearningLog: true,
      entityType: "person",
      entityId: "person-1",
      field: "title",
      value: "CEO",
    });

    expect(result.action).toBe("applied");
    expect(recordSaltLearning).not.toHaveBeenCalled();
  });

  it("still applies the write when learning logging throws", async () => {
    recordSaltLearning.mockRejectedValueOnce(new Error("db down"));

    const result = await memoryUpdateField({
      ...baseInput,
      entityType: "person",
      entityId: "person-1",
      field: "title",
      value: "CEO",
    });

    expect(result.action).toBe("applied");
    expect(updates.find((u) => u.table === "people")).toBeDefined();
  });

  it("does not log below the threshold (accumulated, not applied)", async () => {
    const result = await memoryUpdateField({
      ...baseInput,
      confidence: 60,
      entityType: "person",
      entityId: "person-1",
      field: "phone",
      value: "+1 555 0100",
    });

    expect(result.action).toBe("accumulated");
    expect(recordSaltLearning).not.toHaveBeenCalled();
  });
});

describe("memoryUpdateField Me (operator) field mappings", () => {
  beforeEach(() => {
    updates.length = 0;
    upserts.length = 0;
    vi.clearAllMocks();
  });

  const meBase = { ...baseInput, entityType: "me" as const, entityId: "me-1" };

  it.each([
    ["preferredName", "preferred_name"],
    ["preferred_name", "preferred_name"],
    ["fullName", "display_name"],
    ["roleTitle", "role_title"],
    ["phone", "phone"],
    ["timezone", "timezone"],
    ["location", "location"],
    ["addressLine1", "address_line_1"],
    ["address_line_2", "address_line_2"],
    ["city", "city"],
    ["state", "state"],
    ["postalCode", "postal_code"],
    ["country", "country"],
    ["professionalCredentials", "professional_credentials"],
  ])("maps profile field %s to profiles.%s", async (field, column) => {
    const result = await memoryUpdateField({ ...meBase, field, value: "x" });

    expect(result.action).toBe("applied");
    const profileUpdate = updates.find((u) => u.table === "profiles");
    expect(profileUpdate?.payload).toEqual({ [column]: "x" });
  });

  it.each([
    ["websiteUrl", "website_url"],
    ["industry", "industry"],
    ["businessPhone", "business_phone"],
    ["business_location", "location"],
  ])("maps business field %s to workspaces.%s", async (field, column) => {
    const result = await memoryUpdateField({ ...meBase, field, value: "x" });

    expect(result.action).toBe("applied");
    const workspaceUpdate = updates.find((u) => u.table === "workspaces");
    expect(workspaceUpdate?.payload).toEqual({ [column]: "x" });
  });

  it.each([
    "tax_id_type",
    "taxIdLast4",
    "default_currency",
    "paymentTerms",
    "legal_business_name",
    "legalBusinessName",
  ])("refuses never-touch Me field %s at any confidence", async (field) => {
    const result = await memoryUpdateField({
      ...meBase,
      confidence: 100,
      field,
      value: "x",
    });

    expect(result.action).toBe("rejected");
    expect(result.message).toContain("never-touch");
    expect(updates).toHaveLength(0);
  });
});

describe("memoryUpdateField record-condition dispatch (Phase 5)", () => {
  beforeEach(() => {
    updates.length = 0;
    upserts.length = 0;
    inserts.length = 0;
    previousProvenanceValue = null;
    vi.clearAllMocks();
  });

  it("dispatches record-condition evaluation after an applied write", async () => {
    const result = await memoryUpdateField({
      ...baseInput,
      entityType: "person",
      entityId: "person-1",
      field: "relationship_type",
      value: "client",
    });

    expect(result.action).toBe("applied");
    expect(dispatchRecordConditionTrigger).toHaveBeenCalledWith({
      workspaceId: "ws-1",
      entity: "person",
      field: "relationship_type",
      newValue: "client",
      entityId: "person-1",
    });
  });

  it("maps organization writes to the org trigger entity", async () => {
    const result = await memoryUpdateField({
      ...baseInput,
      entityType: "organization",
      entityId: "org-1",
      field: "relationship_status",
      value: "active",
    });

    expect(result.action).toBe("applied");
    expect(dispatchRecordConditionTrigger).toHaveBeenCalledWith(
      expect.objectContaining({ entity: "org", entityId: "org-1" })
    );
  });

  it("does not dispatch for entities outside the record-condition vocabulary", async () => {
    const result = await memoryUpdateField({
      ...baseInput,
      entityType: "meeting",
      entityId: "meeting-1",
      field: "status",
      value: "completed",
    });

    expect(result.action).toBe("applied");
    expect(dispatchRecordConditionTrigger).not.toHaveBeenCalled();
  });

  it("does not dispatch on no-op writes (value already set)", async () => {
    previousProvenanceValue = "client";

    const result = await memoryUpdateField({
      ...baseInput,
      entityType: "person",
      entityId: "person-1",
      field: "relationship_type",
      value: "client",
    });

    expect(result.action).toBe("applied");
    expect(result.noop).toBe(true);
    expect(dispatchRecordConditionTrigger).not.toHaveBeenCalled();
  });

  it("never lets a dispatch failure break the write", async () => {
    dispatchRecordConditionTrigger.mockRejectedValueOnce(
      new Error("dispatch exploded")
    );

    const result = await memoryUpdateField({
      ...baseInput,
      entityType: "person",
      entityId: "person-1",
      field: "relationship_type",
      value: "client",
    });

    expect(result.action).toBe("applied");
  });
});
