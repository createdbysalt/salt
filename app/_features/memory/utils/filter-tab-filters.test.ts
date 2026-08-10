import { describe, it, expect } from "vitest";
import {
  countFilterFilters,
  EMPTY_FILTER_FILTERS,
  matchesEntityTypeFilter,
  matchesFilterQuery,
  matchesKindFilter,
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

describe("matchesKindFilter", () => {
  it("matches everything when no kinds are selected", () => {
    expect(matchesKindFilter([], "new_capture")).toBe(true);
  });

  it("matches only selected kinds otherwise", () => {
    expect(matchesKindFilter(["new_record"], "new_record")).toBe(true);
    expect(matchesKindFilter(["new_record"], "new_capture")).toBe(false);
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

  it("sums kind and record-type selections", () => {
    expect(
      countFilterFilters({
        kinds: ["record_update", "new_record"],
        entityTypes: ["person"],
      }),
    ).toBe(3);
  });
});
