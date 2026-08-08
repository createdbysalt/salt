import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/app/_lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn(() => {
      const chain: Record<string, unknown> = {};
      for (const method of ["select", "eq", "in", "is"]) {
        chain[method] = vi.fn(() => chain);
      }
      chain.maybeSingle = vi.fn(async () => ({ data: null }));
      chain.then = (resolve: (value: unknown) => void) =>
        resolve({ data: [] });
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
import { runHygieneCapability } from "./hygiene";

describe("runHygieneCapability — corrections feed forward", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
