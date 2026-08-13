import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mockTables: Record<string, unknown[]> = {};

vi.mock("@/app/_lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn((table: string) => {
      const chain: Record<string, unknown> = {};
      let limitCount: number | null = null;
      const rows = () => {
        const data = mockTables[table] ?? [];
        return limitCount != null ? data.slice(0, limitCount) : data;
      };
      for (const method of ["select", "eq", "in", "is", "not", "or", "ilike", "order"]) {
        chain[method] = vi.fn(() => chain);
      }
      chain.limit = vi.fn((count: number) => {
        limitCount = count;
        return chain;
      });
      chain.maybeSingle = vi.fn(async () => ({ data: rows()[0] ?? null }));
      chain.then = (resolve: (_value: unknown) => void) =>
        resolve({ data: rows() });
      return chain;
    }),
  })),
}));

const memoryAccumulateEvidence = vi.fn(async (_input: unknown) => ({
  evidenceId: "ev-1",
}));

vi.mock("@/app/_lib/memory-tools", () => ({
  memoryAccumulateEvidence: (input: unknown) => memoryAccumulateEvidence(input),
  memoryGetIncompleteRecords: vi.fn(async () => ({ records: [] })),
  memoryGetOrphanRecords: vi.fn(async () => ({ records: [] })),
  memoryGetSimilarRecords: vi.fn(async () => ({
    matches: [
      {
        entityType: "person",
        recordA: { id: "p1", name: "Jane Example" },
        recordB: { id: "p2", name: "Lisa T." },
        confidence: 92,
        signal: "same_email",
        because: "Same email address: lisa@acme.com",
      },
    ],
  })),
  memoryGetStaleRecords: vi.fn(async () => ({
    records: [
      {
        id: "p3",
        entityType: "person",
        severity: 80,
        daysSinceActivity: 200,
        lastActivityAt: "2026-01-01T00:00:00Z",
      },
    ],
  })),
}));

vi.mock("@/app/_lib/learning/correction-blocklist", () => ({
  getCorrectionBlocklist: vi.fn(async () => []),
  findBlockingCorrection: vi.fn(() => null),
}));

import {
  findBlockingCorrection,
} from "@/app/_lib/learning/correction-blocklist";
import { memoryGetOrphanRecords } from "@/app/_lib/memory-tools";
import { runHygieneCapability } from "./hygiene";

describe("runHygieneCapability — corrections feed forward", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const key of Object.keys(mockTables)) delete mockTables[key];
  });

  it("emits merge and archive candidates when nothing is blocked", async () => {
    const result = await runHygieneCapability({ workspaceId: "ws-1" });

    expect(result.success).toBe(true);
    const fields = memoryAccumulateEvidence.mock.calls.map(
      (call) => (call[0] as { field: string }).field
    );
    expect(fields).toContain("_merge_candidate");
    expect(fields).toContain("_archive_candidate");
  });

  it("does not re-emit a dismissed candidate (4.4 regression)", async () => {
    // Every candidate is blocked by a prior "Not this" correction.
    vi.mocked(findBlockingCorrection).mockReturnValue({
      id: "corr-1",
      fieldPath: "_merge_candidate",
      wrongValue: { targetId: "p2" },
      reason: "never_true",
      createdAt: "2026-08-01T00:00:00Z",
    });

    const result = await runHygieneCapability({ workspaceId: "ws-1" });

    expect(result.success).toBe(true);
    expect(memoryAccumulateEvidence).not.toHaveBeenCalled();
  });
});

describe("runHygieneCapability — orphan link resolution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // clearAllMocks clears call history, not implementations — restore the
    // default "nothing blocked" behavior the 4.4 regression test overrode.
    vi.mocked(findBlockingCorrection).mockReturnValue(null);
    for (const key of Object.keys(mockTables)) delete mockTables[key];
  });

  it("resolves a work orphan through its billing contact's organization", async () => {
    vi.mocked(memoryGetOrphanRecords).mockResolvedValueOnce({
      records: [
        {
          id: "w1",
          entityType: "work",
          name: "Brand Refresh",
          signal: "work_orphan",
          severity: 85,
          suggestedAction: "Link to client",
        },
      ],
      totalCount: 1,
    });
    mockTables.work = [{ id: "w1", billing_contact_id: "p1" }];
    mockTables.organization_people = [{ organization_id: "org-1" }];
    mockTables.organizations = [{ id: "org-1", name: "Meridian Corp" }];

    const result = await runHygieneCapability({ workspaceId: "ws-1" });

    expect(result.success).toBe(true);
    const linkCall = memoryAccumulateEvidence.mock.calls
      .map((call) => call[0] as Record<string, unknown>)
      .find((input) => input.field === "_link_candidate");
    expect(linkCall).toBeDefined();
    expect(linkCall?.entityType).toBe("work");
    expect(linkCall?.entityId).toBe("w1");
    expect(linkCall?.value).toMatchObject({
      targetId: "org-1",
      targetType: "organization",
      linkField: "organization_id",
    });
  });

  it("resolves a billing orphan through the pending org name on the record", async () => {
    vi.mocked(memoryGetOrphanRecords).mockResolvedValueOnce({
      records: [
        {
          id: "b1",
          entityType: "billing",
          name: "INV-001",
          signal: "billing_orphan",
          severity: 85,
          suggestedAction: "Link to work or party",
        },
      ],
      totalCount: 1,
    });
    mockTables.billing_records = [
      { id: "b1", metadata: { pending_org_name: "Meridian Corp" } },
    ];
    mockTables.organizations = [{ id: "org-1", name: "Meridian Corp" }];

    const result = await runHygieneCapability({ workspaceId: "ws-1" });

    expect(result.success).toBe(true);
    const linkCall = memoryAccumulateEvidence.mock.calls
      .map((call) => call[0] as Record<string, unknown>)
      .find((input) => input.field === "_link_candidate");
    expect(linkCall).toBeDefined();
    expect(linkCall?.entityType).toBe("billing");
    expect(linkCall?.value).toMatchObject({
      targetId: "org-1",
      targetType: "organization",
      linkField: "organization_id",
    });
  });

  it("resolves a billing orphan through a unique pending person name", async () => {
    vi.mocked(memoryGetOrphanRecords).mockResolvedValueOnce({
      records: [
        {
          id: "b2",
          entityType: "billing",
          name: "INV-002",
          signal: "billing_orphan",
          severity: 85,
          suggestedAction: "Link to work or party",
        },
      ],
      totalCount: 1,
    });
    mockTables.billing_records = [
      { id: "b2", metadata: { pending_person_name: "Jane Doe" } },
    ];
    mockTables.organizations = [];
    mockTables.people = [{ id: "p9", name: "Jane Doe" }];

    const result = await runHygieneCapability({ workspaceId: "ws-1" });

    expect(result.success).toBe(true);
    const linkCall = memoryAccumulateEvidence.mock.calls
      .map((call) => call[0] as Record<string, unknown>)
      .find((input) => input.field === "_link_candidate");
    expect(linkCall?.value).toMatchObject({
      targetId: "p9",
      targetType: "person",
      linkField: "person_id",
    });
  });

  it("keeps ambiguous name matches internal — no candidate, no evidence (P5)", async () => {
    vi.mocked(memoryGetOrphanRecords).mockResolvedValueOnce({
      records: [
        {
          id: "b3",
          entityType: "billing",
          name: "INV-003",
          signal: "billing_orphan",
          severity: 85,
          suggestedAction: "Link to work or party",
        },
      ],
      totalCount: 1,
    });
    mockTables.billing_records = [
      { id: "b3", metadata: { pending_org_name: "Acme" } },
    ];
    mockTables.organizations = [
      { id: "org-1", name: "Acme" },
      { id: "org-2", name: "Acme Studio" },
    ];

    const result = await runHygieneCapability({ workspaceId: "ws-1" });

    expect(result.success).toBe(true);
    const linkCalls = memoryAccumulateEvidence.mock.calls
      .map((call) => call[0] as Record<string, unknown>)
      .filter((input) => input.field === "_link_candidate");
    expect(linkCalls).toHaveLength(0);
  });

  it("keeps unresolvable work orphans internal — no candidate, no evidence", async () => {
    vi.mocked(memoryGetOrphanRecords).mockResolvedValueOnce({
      records: [
        {
          id: "w2",
          entityType: "work",
          name: "Mystery Project",
          signal: "work_orphan",
          severity: 85,
          suggestedAction: "Link to client",
        },
      ],
      totalCount: 1,
    });
    mockTables.work = [{ id: "w2", billing_contact_id: null }];

    const result = await runHygieneCapability({ workspaceId: "ws-1" });

    expect(result.success).toBe(true);
    const linkCalls = memoryAccumulateEvidence.mock.calls
      .map((call) => call[0] as Record<string, unknown>)
      .filter((input) => input.field === "_link_candidate");
    expect(linkCalls).toHaveLength(0);
  });
});
