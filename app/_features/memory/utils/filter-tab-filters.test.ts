import { describe, it, expect } from "vitest";
import {
  countFilterFilters,
  EMPTY_FILTER_FILTERS,
  matchesDateRange,
  matchesEntityTypeFilter,
  matchesFilterQuery,
} from "./filter-tab-filters";

describe("matchesFilterQuery", () => {
  it("matches everything when the query is blank", () => {
    expect(matchesFilterQuery("", ["anything"])).toBe(true);
    expect(matchesFilterQuery("   ", [null])).toBe(true);
  });

  it("matches case-insensitive substrings across any text", () => {
    expect(matchesFilterQuery("sarah", ["Sarah Chen", "sarah@acme.com"])).toBe(
      true,
    );
    expect(matchesFilterQuery("ACME", ["sarah@acme.com"])).toBe(true);
  });

  it("does not match when no text contains the query", () => {
    expect(matchesFilterQuery("invoice", ["Sarah Chen", null])).toBe(false);
  });
});

describe("matchesEntityTypeFilter", () => {
  it("matches everything when no record types are selected", () => {
    expect(matchesEntityTypeFilter([], null)).toBe(true);
  });

  it("matches only selected record types otherwise", () => {
    expect(matchesEntityTypeFilter(["person"], "person")).toBe(true);
    expect(matchesEntityTypeFilter(["person"], "work")).toBe(false);
  });

  it("excludes typeless items (captures) when a record type is selected", () => {
    expect(matchesEntityTypeFilter(["person"], null)).toBe(false);
  });
});

describe("countFilterFilters", () => {
  it("is zero for the empty state", () => {
    expect(countFilterFilters(EMPTY_FILTER_FILTERS)).toBe(0);
  });

  it("sums record-type selections", () => {
    expect(
      countFilterFilters({
        entityTypes: ["person", "work"],
      }),
    ).toBe(2);
  });
});

describe("matchesDateRange", () => {
  const range = {
    from: new Date(2026, 7, 1), // Aug 1 2026 (local)
    to: new Date(2026, 7, 10), // Aug 10 2026 (local)
  };

  it("matches everything when no range is selected", () => {
    expect(matchesDateRange(null, "2020-01-01T00:00:00Z")).toBe(true);
    expect(matchesDateRange(null, null)).toBe(true);
  });

  it("includes timestamps on the boundary days", () => {
    expect(matchesDateRange(range, new Date(2026, 7, 1, 0, 1).toISOString())).toBe(true);
    expect(matchesDateRange(range, new Date(2026, 7, 10, 23, 59).toISOString())).toBe(true);
  });

  it("excludes timestamps outside the range", () => {
    expect(matchesDateRange(range, new Date(2026, 6, 31, 23, 59).toISOString())).toBe(false);
    expect(matchesDateRange(range, new Date(2026, 7, 11, 0, 1).toISOString())).toBe(false);
  });

  it("covers a single-day range end to end", () => {
    const single = { from: new Date(2026, 7, 5), to: new Date(2026, 7, 5) };
    expect(matchesDateRange(single, new Date(2026, 7, 5, 9, 30).toISOString())).toBe(true);
    expect(matchesDateRange(single, new Date(2026, 7, 6, 9, 30).toISOString())).toBe(false);
  });

  it("excludes items without a timestamp while a range is active", () => {
    expect(matchesDateRange(range, null)).toBe(false);
    expect(matchesDateRange(range, "not-a-date")).toBe(false);
  });
});
