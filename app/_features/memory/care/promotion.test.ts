import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

// --- Parked evidence rows returned by the initial sweep query -------------
let parkedRows: Array<{
  entity_type: string;
  entity_id: string;
  field_path: string;
}> = [];

// Entity row returned by the orphan check (maybeSingle). Null = entity gone.
let entityRow: { id: string; archived_at: null; deleted_at: null } | null = {
  id: "entity-1",
  archived_at: null,
  deleted_at: null,
};

vi.mock("@/app/_lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn(() => {
      const chain: Record<string, unknown> = {};
      for (const method of ["select", "eq", "is", "or", "limit"]) {
        chain[method] = vi.fn(() => chain);
      }
      chain.maybeSingle = vi.fn(async () => ({ data: entityRow, error: null }));
      chain.then = (resolve: (value: unknown) => void) =>
        resolve({ data: parkedRows, error: null });
      return chain;
    }),
  })),
}));

const getAggregatedConfidence = vi.fn<
  (...args: unknown[]) => Promise<unknown>
>();
const resolveEvidence = vi.fn<
  (...args: unknown[]) => Promise<void>
>(async () => undefined);

vi.mock("@/app/_lib/learning", () => ({
  fromLearningDbEntityType: (dbType: string) =>
    dbType === "file" ? "resource" : dbType,
  toLearningDbEntityType: (appType: string) => appType,
  getAggregatedConfidence: (...args: unknown[]) =>
    getAggregatedConfidence(...args),
  resolveEvidence: (...args: unknown[]) => resolveEvidence(...args),
  expireOldEvidence: vi.fn(async () => 0),
}));

const memoryUpdateField = vi.fn<
  (input: unknown) => Promise<{ action: "applied"; noop?: boolean }>
>(async () => ({ action: "applied" as const }));

vi.mock("@/app/_lib/memory-tools", () => ({
  memoryUpdateField: (input: unknown) => memoryUpdateField(input),
}));

const getCareFieldBar = vi.fn<
  (...args: unknown[]) => Promise<{ tier: "standard"; bar: number; alwaysAuto: boolean }>
>(async () => ({
  tier: "standard" as const,
  bar: 85,
  alwaysAuto: false,
}));

vi.mock("./decision-pipeline", () => ({
  getCareFieldBar: (...args: unknown[]) => getCareFieldBar(...args),
}));

import { promoteParkedEvidence } from "./promotion";

describe("promoteParkedEvidence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    parkedRows = [];
    entityRow = { id: "entity-1", archived_at: null, deleted_at: null };
    getCareFieldBar.mockResolvedValue({
      tier: "standard",
      bar: 85,
      alwaysAuto: false,
    });
  });

  it("promotes a parked group whose aggregated confidence clears the bar", async () => {
    parkedRows = [
      { entity_type: "person", entity_id: "p1", field_path: "title" },
    ];
    getAggregatedConfidence.mockResolvedValue({
      proposedValue: "CEO",
      aggregatedConfidence: 90,
      hasConflict: false,
      evidenceIds: ["e1"],
    });

    const result = await promoteParkedEvidence("ws-1");

    expect(result.groupsEvaluated).toBe(1);
    expect(result.promoted).toBe(1);
    expect(memoryUpdateField).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: "person",
        entityId: "p1",
        field: "title",
        value: "CEO",
        confidence: 90,
        minThreshold: 85,
      })
    );
  });

  it("skips groups below the bar", async () => {
    parkedRows = [
      { entity_type: "person", entity_id: "p1", field_path: "title" },
    ];
    getAggregatedConfidence.mockResolvedValue({
      proposedValue: "CEO",
      aggregatedConfidence: 50,
      hasConflict: false,
      evidenceIds: ["e1"],
    });

    const result = await promoteParkedEvidence("ws-1");

    expect(result.promoted).toBe(0);
    expect(memoryUpdateField).not.toHaveBeenCalled();
  });

  it("skips conflicted groups without writing", async () => {
    parkedRows = [
      { entity_type: "person", entity_id: "p1", field_path: "phone" },
    ];
    getAggregatedConfidence.mockResolvedValue({
      proposedValue: null,
      aggregatedConfidence: 0,
      hasConflict: true,
      evidenceIds: ["e1", "e2"],
    });

    const result = await promoteParkedEvidence("ws-1");

    expect(result.conflicts).toBe(1);
    expect(result.promoted).toBe(0);
    expect(memoryUpdateField).not.toHaveBeenCalled();
  });

  it("resolves invalid parked values out of Watching instead of promoting them", async () => {
    // Regression: the pre-transform country fill rule parked raw IANA zone
    // strings on the country field. The sweep must never promote those —
    // it resolves them so they leave Watching.
    parkedRows = [
      { entity_type: "person", entity_id: "p1", field_path: "country" },
    ];
    getAggregatedConfidence.mockResolvedValue({
      proposedValue: "America/Chicago",
      aggregatedConfidence: 92,
      hasConflict: false,
      evidenceIds: ["e1"],
    });

    const result = await promoteParkedEvidence("ws-1");

    expect(result.invalidated).toBe(1);
    expect(result.promoted).toBe(0);
    expect(memoryUpdateField).not.toHaveBeenCalled();
    expect(resolveEvidence).toHaveBeenCalledWith(
      "ws-1",
      ["e1"],
      "expired",
      expect.objectContaining({ reason: "invalid_value" })
    );
  });

  it("promotes a valid ISO country value normally", async () => {
    parkedRows = [
      { entity_type: "person", entity_id: "p1", field_path: "country" },
    ];
    getAggregatedConfidence.mockResolvedValue({
      proposedValue: "US",
      aggregatedConfidence: 92,
      hasConflict: false,
      evidenceIds: ["e1"],
    });

    const result = await promoteParkedEvidence("ws-1");

    expect(result.promoted).toBe(1);
    expect(result.invalidated).toBe(0);
    expect(memoryUpdateField).toHaveBeenCalledWith(
      expect.objectContaining({ field: "country", value: "US" })
    );
  });

  it("never acts on underscore-prefixed meta fields", async () => {
    parkedRows = [
      { entity_type: "person", entity_id: "p1", field_path: "_merge_candidate" },
    ];

    const result = await promoteParkedEvidence("ws-1");

    expect(result.groupsEvaluated).toBe(0);
    expect(getAggregatedConfidence).not.toHaveBeenCalled();
  });

  it("applies the workspace threshold to first-time-classification fields", async () => {
    // One user-controlled bar: record_status (first-time classification) is
    // held to the workspace threshold like everything else — no elevated
    // floor, no current-value lookup.
    parkedRows = [
      { entity_type: "person", entity_id: "p1", field_path: "record_status" },
    ];
    getAggregatedConfidence.mockResolvedValue({
      proposedValue: "client",
      aggregatedConfidence: 92,
      hasConflict: false,
      evidenceIds: ["e1"],
    });

    const result = await promoteParkedEvidence("ws-1");

    expect(getCareFieldBar).toHaveBeenCalledWith(
      "ws-1",
      "person",
      "record_status",
      "client"
    );
    // Bar comes back 85 from the mock, so 92 clears it and promotes.
    expect(result.promoted).toBe(1);
  });

  it("resolves the parked group when the tool no-ops (value already set)", async () => {
    // The tool's row-level no-op guard skips the apply path — and its
    // evidence resolution — when the field already holds the value. The
    // sweep must resolve the group itself or it lingers in Watching.
    parkedRows = [
      { entity_type: "person", entity_id: "p1", field_path: "record_status" },
    ];
    getAggregatedConfidence.mockResolvedValue({
      proposedValue: "active",
      aggregatedConfidence: 90,
      hasConflict: false,
      evidenceIds: ["e1", "e2"],
    });
    memoryUpdateField.mockResolvedValue({
      action: "applied",
      noop: true,
    });

    const result = await promoteParkedEvidence("ws-1");

    expect(result.promoted).toBe(1);
    expect(resolveEvidence).toHaveBeenCalledWith(
      "ws-1",
      ["e1", "e2"],
      "applied",
      expect.objectContaining({ reason: "already_set" })
    );
  });

  it("keeps sweeping when one group's apply throws", async () => {
    parkedRows = [
      { entity_type: "person", entity_id: "p1", field_path: "title" },
      { entity_type: "person", entity_id: "p2", field_path: "title" },
    ];
    getAggregatedConfidence.mockResolvedValue({
      proposedValue: "CEO",
      aggregatedConfidence: 90,
      hasConflict: false,
      evidenceIds: ["e1"],
    });
    memoryUpdateField
      .mockRejectedValueOnce(new Error("Unknown person field"))
      .mockResolvedValueOnce({ action: "applied" as const });

    const result = await promoteParkedEvidence("ws-1");

    expect(result.failures).toBe(1);
    expect(result.promoted).toBe(1);
  });

  it("resolves evidence whose entity is deleted or archived instead of re-evaluating it forever", async () => {
    // Watching hides groups on inactive entities — without orphan cleanup
    // the sweep re-evaluates invisible litter on every run.
    entityRow = null; // entity gone
    parkedRows = [
      { entity_type: "resource", entity_id: "r1", field_path: "description" },
    ];

    const result = await promoteParkedEvidence("ws-1");

    expect(result.orphaned).toBe(1);
    expect(result.promoted).toBe(0);
    expect(getAggregatedConfidence).not.toHaveBeenCalled();
    expect(memoryUpdateField).not.toHaveBeenCalled();
    expect(resolveEvidence).toHaveBeenCalledWith(
      "ws-1",
      expect.any(Array),
      "expired",
      expect.objectContaining({ reason: "entity_inactive" })
    );
  });
});
