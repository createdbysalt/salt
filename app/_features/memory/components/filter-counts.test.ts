import { describe, it, expect } from "vitest";
import type { FilterStatus } from "./FilterStatusPill";

/**
 * Pure grouping logic for Memory → Filter pill counts.
 * Mirrors FilterTab's count derivation so the transparency model stays tested.
 * P11: kept-out review lives in Sources → Customize's area rail — the
 * Filter pill is watching/handled only. Capture-admission lanes (New captures,
 * Let in) were removed from the tab — watching is evidence + record candidates,
 * handled is memory writes only.
 */
function filterCounts(input: {
  evidenceCount: number;
  recordCandidateCount: number;
  handledWriteCount: number;
}): Record<FilterStatus, number> {
  return {
    watching: input.evidenceCount + input.recordCandidateCount,
    handled: input.handledWriteCount,
  };
}

describe("Filter pill counts", () => {
  it("groups watching as evidence + record candidates", () => {
    expect(
      filterCounts({
        evidenceCount: 3,
        recordCandidateCount: 2,
        handledWriteCount: 0,
      }).watching
    ).toBe(5);
  });

  it("groups handled as memory writes only", () => {
    expect(
      filterCounts({
        evidenceCount: 0,
        recordCandidateCount: 0,
        handledWriteCount: 4,
      }).handled
    ).toBe(4);
  });

  it("has no kept_out status — kept-out lives on Sources (P11)", () => {
    const counts = filterCounts({
      evidenceCount: 1,
      recordCandidateCount: 1,
      handledWriteCount: 1,
    });

    expect(Object.keys(counts).sort()).toEqual(["handled", "watching"]);
  });
});
