import { beforeEach, describe, expect, it, vi } from "vitest";

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

  it("records accumulated evidence as Watching activity", async () => {
    const result = await memoryAccumulateEvidence({
      workspaceId: "ws-1",
      entityType: "person",
      entityId: "person-1",
      field: "_missing_field",
      value: { field: "email", reason: "missing_required_field" },
      confidence: 65,
      evidenceType: "behavioral_signal",
      because: "Missing required field: email",
      source: "playbook",
      sourceDetails: { playbookSlug: "memory-hygiene" },
    });

    expect(result.evidenceId).toBe("ev-1");
    expect(activityInserts).toHaveLength(1);
    expect(activityInserts[0]).toMatchObject({
      workspace_id: "ws-1",
      action: "accumulated",
      title: "Memory Hygiene is watching",
      detail: "Missing required field: email",
      metadata: expect.objectContaining({
        player_slug: "memory-care",
        evidence_id: "ev-1",
        entity_type: "person",
        entity_id: "person-1",
        field_path: "_missing_field",
        playbook_slug: "memory-hygiene",
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
      value: { reason: "orphan" },
      confidence: 65,
      evidenceType: "cross_reference",
      because: "Record has no organization connection",
      source: "playbook",
      sourceDetails: { playbookSlug: "memory-hygiene" },
    });

    expect(result.evidenceId).toBe("ev-1");
    expect(activityInserts).toHaveLength(0);
  });
});
