import { describe, it, expect } from "vitest";
import type { FilterStatus } from "./FilterStatusPill";

/**
 * Pure grouping logic for Memory → Filter pill counts.
 * Mirrors FilterTab's count derivation so the transparency model stays tested.
 * P11: kept-out counts moved to Sources → Activity (KeptOutSection) — the
 * Filter pill is watching/handled only.
 */
function filterCounts(input: {
  evidenceCount: number;
  candidateCount: number;
  handledWriteCount: number;
  letInCount: number;
}): Record<FilterStatus, number> {
  return {
    watching: input.evidenceCount + input.candidateCount,
    handled: input.handledWriteCount + input.letInCount,
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
      }).handled
    ).toBe(5);
  });

  it("has no kept_out status — kept-out lives on Sources (P11)", () => {
    const counts = filterCounts({
      evidenceCount: 1,
      candidateCount: 1,
      handledWriteCount: 1,
      letInCount: 1,
    });

    expect(Object.keys(counts).sort()).toEqual(["handled", "watching"]);
  });
});
