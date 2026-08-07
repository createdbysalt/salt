import { describe, it, expect } from "vitest";
import type { FilterStatus } from "./FilterStatusPill";

/**
 * Pure grouping logic for Memory → Filter pill counts.
 * Mirrors FilterTab's count derivation so the transparency model stays tested.
 */
function filterCounts(input: {
  evidenceCount: number;
  candidateCount: number;
  handledWriteCount: number;
  letInCount: number;
  keptOutCount: number;
}): Record<FilterStatus, number> {
  return {
    watching: input.evidenceCount + input.candidateCount,
    handled: input.handledWriteCount + input.letInCount,
    kept_out: input.keptOutCount,
  };
}

describe("Filter pill counts", () => {
  it("groups watching as evidence + candidates", () => {
    expect(
      filterCounts({
        evidenceCount: 3,
        candidateCount: 2,
        handledWriteCount: 0,
        letInCount: 0,
        keptOutCount: 0,
      }).watching
    ).toBe(5);
  });

  it("groups handled as writes + let-in admissions", () => {
    expect(
      filterCounts({
        evidenceCount: 0,
        candidateCount: 0,
        handledWriteCount: 4,
        letInCount: 1,
        keptOutCount: 0,
      }).handled
    ).toBe(5);
  });

  it("keeps kept_out as the admission kept-out count", () => {
    expect(
      filterCounts({
        evidenceCount: 1,
        candidateCount: 1,
        handledWriteCount: 1,
        letInCount: 1,
        keptOutCount: 12,
      }).kept_out
    ).toBe(12);
  });
});
