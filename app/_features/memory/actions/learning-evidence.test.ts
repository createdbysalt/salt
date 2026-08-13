import { beforeEach, describe, expect, it, vi } from "vitest";

const updateCalls: Array<{ table: string; payload: Record<string, unknown> }> = [];
const insertCalls: Array<{ table: string; payload: unknown }> = [];
const evidenceUpdates: Array<Record<string, unknown>> = [];

function buildChain(table: string, log: typeof updateCalls | null) {
  const chain: Record<string, unknown> = {};
  for (const method of ["select", "eq", "in", "is", "not"]) {
    chain[method] = vi.fn(() => chain);
  }
  chain.maybeSingle = vi.fn(async () => ({ data: null }));
  chain.update = vi.fn((payload: Record<string, unknown>) => {
    log?.push({ table, payload });
    return chain;
  });
  chain.insert = vi.fn((payload: unknown) => {
    insertCalls.push({ table, payload });
    return chain;
  });
  chain.then = (resolve: (_value: unknown) => void) =>
    resolve({ data: [], error: null });
  return chain;
}

vi.mock("@/app/_lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: (table: string) => buildChain(table, updateCalls) }),
}));

vi.mock("@/app/_lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    from: (table: string) => {
      if (table === "entity_evidence") {
        const chain = buildChain(table, null);
        chain.update = vi.fn((payload: Record<string, unknown>) => {
          evidenceUpdates.push(payload);
          return chain;
        });
        return chain;
      }
      return buildChain(table, null);
    },
  })),
}));

vi.mock("@/app/_lib/tenancy", () => ({
  getTenantContext: vi.fn(async () => ({
    context: { userId: "user-1", workspaceId: "ws-1" },
  })),
}));

vi.mock("@/app/_lib/tenancy/guards", () => ({
  requireWorkspaceMember: vi.fn((context: { workspaceId: string }) => ({
    id: context.workspaceId,
  })),
}));

interface MergeResult {
  success: boolean;
  winnerId: string;
  loserId: string;
  mergedFields: string[];
  migratedBillingCount: number;
  migratedLinksCount: number;
  archivedAt: string;
  error?: string;
}

const memoryMergeRecords = vi.fn(
  async (_input?: unknown): Promise<MergeResult> => ({
    success: true,
    winnerId: "w1",
    loserId: "w2",
    mergedFields: [],
    migratedBillingCount: 0,
    migratedLinksCount: 0,
    archivedAt: "2026-08-13T00:00:00Z",
  }),
);
const memoryUpdateField = vi.fn(async (_input?: unknown) => ({ action: "applied" }));

vi.mock("@/app/_lib/memory-tools", () => ({
  memoryMergeRecords: (input: unknown) => memoryMergeRecords(input),
  memoryUpdateField: (input: unknown) => memoryUpdateField(input),
}));

vi.mock("@/app/_features/me/actions/corrections", () => ({
  recordCorrection: vi.fn(async () => ({ success: true })),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { confirmWatchingEvidence } from "./learning-evidence";

describe("confirmWatchingEvidence — meta candidate operations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    updateCalls.length = 0;
    insertCalls.length = 0;
    evidenceUpdates.length = 0;
  });

  it('"Merge them" actually merges winner and loser', async () => {
    const result = await confirmWatchingEvidence({
      workspaceId: "ws-1",
      entityType: "work",
      entityId: "w1",
      fieldPath: "_merge_candidate",
      proposedValue: JSON.stringify({ targetId: "w2", targetName: "Dupe" }),
      evidenceIds: ["ev-1"],
    });

    expect(result.success).toBe(true);
    expect(memoryMergeRecords).toHaveBeenCalledWith({
      workspaceId: "ws-1",
      entityType: "work",
      winnerId: "w1",
      loserId: "w2",
    });
    expect(memoryUpdateField).not.toHaveBeenCalled();
    expect(evidenceUpdates.length).toBeGreaterThan(0);
  });

  it('"Archive" sets archived_at on the record', async () => {
    const result = await confirmWatchingEvidence({
      workspaceId: "ws-1",
      entityType: "work",
      entityId: "w1",
      fieldPath: "_archive_candidate",
      proposedValue: JSON.stringify({ reason: "stale" }),
      evidenceIds: ["ev-1"],
    });

    expect(result.success).toBe(true);
    const archive = updateCalls.find((call) => call.table === "work");
    expect(archive?.payload.archived_at).toBeTruthy();
    expect(evidenceUpdates.length).toBeGreaterThan(0);
  });

  it('"Link it" joins a person to the organization', async () => {
    const result = await confirmWatchingEvidence({
      workspaceId: "ws-1",
      entityType: "person",
      entityId: "p1",
      fieldPath: "_link_candidate",
      proposedValue: JSON.stringify({
        targetId: "org-1",
        targetName: "Meridian Corp",
        targetType: "organization",
        linkField: "organization_people",
      }),
      evidenceIds: ["ev-1"],
    });

    expect(result.success).toBe(true);
    expect(insertCalls).toContainEqual({
      table: "organization_people",
      payload: { organization_id: "org-1", person_id: "p1" },
    });
  });

  it('"Link it" sets organization_id on a work record', async () => {
    const result = await confirmWatchingEvidence({
      workspaceId: "ws-1",
      entityType: "work",
      entityId: "w1",
      fieldPath: "_link_candidate",
      proposedValue: JSON.stringify({
        targetId: "org-1",
        targetType: "organization",
        linkField: "organization_id",
      }),
      evidenceIds: ["ev-1"],
    });

    expect(result.success).toBe(true);
    const link = updateCalls.find((call) => call.table === "work");
    expect(link?.payload).toEqual({ organization_id: "org-1" });
  });

  it("refuses unsupported link combinations and leaves the evidence open", async () => {
    const result = await confirmWatchingEvidence({
      workspaceId: "ws-1",
      entityType: "person",
      entityId: "p1",
      fieldPath: "_link_candidate",
      proposedValue: JSON.stringify({
        targetId: "p2",
        targetType: "person",
        linkField: "person_id",
      }),
      evidenceIds: ["ev-1"],
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Unsupported link");
    expect(updateCalls).toHaveLength(0);
    expect(evidenceUpdates).toHaveLength(0);
  });

  it("merge failure surfaces the error and leaves the evidence open", async () => {
    memoryMergeRecords.mockResolvedValueOnce({
      success: false,
      winnerId: "w1",
      loserId: "w2",
      mergedFields: [],
      migratedBillingCount: 0,
      migratedLinksCount: 0,
      archivedAt: "",
      error: "Could not compare records",
    });

    const result = await confirmWatchingEvidence({
      workspaceId: "ws-1",
      entityType: "work",
      entityId: "w1",
      fieldPath: "_merge_candidate",
      proposedValue: JSON.stringify({ targetId: "w2" }),
      evidenceIds: ["ev-1"],
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Could not compare records");
    expect(evidenceUpdates).toHaveLength(0);
  });
});
