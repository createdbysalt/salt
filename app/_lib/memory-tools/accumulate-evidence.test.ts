import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const activityInserts: Record<string, unknown>[] = [];
let shouldActivityInsertFail = false;

vi.mock("@/app/_lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn((table: string) => ({
      insert: vi.fn(async (row: Record<string, unknown>) => {
        if (table === "activity_entries") {
          if (shouldActivityInsertFail) {
            throw new Error("activity unavailable");
          }
          activityInserts.push(row);
        }
        return { error: null };
      }),
    })),
  })),
}));

const coreAccumulate = vi.fn(async (_input: unknown) => ({
  evidenceId: "ev-1",
  aggregatedConfidence: 65,
}));
const getAggregatedConfidence = vi.fn(
  async (
    _workspaceId: unknown,
    _entityType: unknown,
    _entityId: unknown,
    _field: unknown
  ) => ({
    evidenceCount: 1,
    sourceTypeCount: 1,
  })
);

vi.mock("@/app/_lib/learning", () => ({
  accumulateEvidence: (input: unknown) => coreAccumulate(input),
  getAggregatedConfidence: (
    workspaceId: unknown,
    entityType: unknown,
    entityId: unknown,
    field: unknown
  ) => getAggregatedConfidence(workspaceId, entityType, entityId, field),
}));

vi.mock("./get-threshold", () => ({
  getWorkspaceThreshold: vi.fn(async () => ({ threshold: 85 })),
}));

import { memoryAccumulateEvidence } from "./accumulate-evidence";

describe("memoryAccumulateEvidence", () => {
  beforeEach(() => {
    activityInserts.length = 0;
    shouldActivityInsertFail = false;
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("records accumulated evidence as Watching activity", async () => {
    const result = await memoryAccumulateEvidence({
      workspaceId: "ws-1",
      entityType: "person",
      entityId: "person-1",
      field: "company",
      value: "Acme Inc",
      confidence: 65,
      evidenceType: "email_match",
      because: "Email signature says Acme Inc",
      source: "care",
      sourceDetails: { playbookSlug: "memory-records" },
    });

    expect(result.evidenceId).toBe("ev-1");
    expect(activityInserts).toHaveLength(1);
    expect(activityInserts[0]).toMatchObject({
      workspace_id: "ws-1",
      action: "accumulated",
      title: "Memory Records is watching",
      detail: "Email signature says Acme Inc",
      metadata: expect.objectContaining({
        player_slug: "memory-care",
        evidence_id: "ev-1",
        entity_type: "person",
        entity_id: "person-1",
        field_path: "company",
        playbook_slug: "memory-records",
      }),
    });
  });

  it("does not fail evidence accumulation when activity logging fails", async () => {
    shouldActivityInsertFail = true;

    const result = await memoryAccumulateEvidence({
      workspaceId: "ws-1",
      entityType: "person",
      entityId: "person-1",
      field: "_link_candidate",
      value: { targetId: "org-1", targetName: "Acme Inc", reason: "domain_match" },
      confidence: 65,
      evidenceType: "cross_reference",
      because: "Email domain acme.com matches Acme Inc",
      source: "care",
      sourceDetails: { playbookSlug: "memory-hygiene" },
    });

    expect(result.evidenceId).toBe("ev-1");
    expect(activityInserts).toHaveLength(0);
  });

  describe("concrete-value validation gate", () => {
    const base = {
      workspaceId: "ws-1",
      entityType: "person" as const,
      entityId: "person-1",
      field: "company",
      confidence: 65,
      evidenceType: "email_match" as const,
      because: "Email signature says Acme Inc",
      source: "care" as const,
    };

    it("throws in dev when value is null", async () => {
      await expect(
        memoryAccumulateEvidence({ ...base, value: null })
      ).rejects.toThrow(/concrete value/);
      expect(coreAccumulate).not.toHaveBeenCalled();
    });

    it("throws in dev when value is an empty string", async () => {
      await expect(
        memoryAccumulateEvidence({ ...base, value: "   " })
      ).rejects.toThrow(/concrete value/);
      expect(coreAccumulate).not.toHaveBeenCalled();
    });

    it("throws in dev when value is an empty object", async () => {
      await expect(
        memoryAccumulateEvidence({ ...base, value: {} })
      ).rejects.toThrow(/concrete value/);
      expect(coreAccumulate).not.toHaveBeenCalled();
    });

    it("throws in dev when because is missing", async () => {
      await expect(
        memoryAccumulateEvidence({ ...base, value: "Acme Inc", because: "" })
      ).rejects.toThrow(/because/);
      expect(coreAccumulate).not.toHaveBeenCalled();
    });

    it("logs and skips in production instead of throwing", async () => {
      vi.stubEnv("NODE_ENV", "production");
      const consoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const result = await memoryAccumulateEvidence({ ...base, value: null });

      expect(result.evidenceId).toBe("");
      expect(result.meetsThreshold).toBe(false);
      expect(coreAccumulate).not.toHaveBeenCalled();
      expect(activityInserts).toHaveLength(0);
      expect(consoleError).toHaveBeenCalled();

      consoleError.mockRestore();
    });
  });
});
