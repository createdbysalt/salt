import { beforeEach, describe, expect, it, vi } from "vitest";

const memoryGetSimilarRecords = vi.fn();
const memoryGetStaleRecords = vi.fn();
const memoryGetIncompleteRecords = vi.fn();
const memoryGetOrphanRecords = vi.fn();
const memoryAccumulateEvidence = vi.fn();

vi.mock("@/app/_lib/memory-tools", () => ({
  memoryGetSimilarRecords: (input: unknown) => memoryGetSimilarRecords(input),
  memoryGetStaleRecords: (input: unknown) => memoryGetStaleRecords(input),
  memoryGetIncompleteRecords: (input: unknown) =>
    memoryGetIncompleteRecords(input),
  memoryGetOrphanRecords: (input: unknown) => memoryGetOrphanRecords(input),
  memoryAccumulateEvidence: (input: unknown) => memoryAccumulateEvidence(input),
}));

import { run } from "./run";

describe("Memory Hygiene script", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    memoryGetSimilarRecords.mockResolvedValue({ matches: [] });
    memoryGetStaleRecords.mockResolvedValue({ records: [] });
    memoryGetIncompleteRecords.mockResolvedValue({ records: [] });
    memoryGetOrphanRecords.mockResolvedValue({ records: [] });
    memoryAccumulateEvidence.mockResolvedValue({ evidenceId: "ev-1" });
  });

  it("emits missing fields as non-null meta evidence", async () => {
    memoryGetIncompleteRecords.mockResolvedValue({
      records: [
        {
          entityType: "person",
          id: "person-1",
          severity: 95,
          missingFields: ["email"],
        },
      ],
    });

    const result = await run({ workspaceId: "ws-1" });

    expect(result.success).toBe(true);
    expect(memoryAccumulateEvidence).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: "ws-1",
        entityType: "person",
        entityId: "person-1",
        field: "_missing_field",
        value: {
          field: "email",
          reason: "missing_required_field",
        },
      })
    );
  });
});
