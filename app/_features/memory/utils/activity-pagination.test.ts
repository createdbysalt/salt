import { describe, it, expect } from "vitest";
import {
  DEFAULT_MEMORY_ACTIVITY_PAGE_SIZE,
  MEMORY_ACTIVITY_PAGE_SIZES,
  paginateItems,
} from "./activity-pagination";

const items = Array.from({ length: 45 }, (_, i) => i + 1);

describe("paginateItems", () => {
  it("slices the requested page", () => {
    const result = paginateItems(items, 2, 20);
    expect(result.pageItems).toHaveLength(20);
    expect(result.pageItems[0]).toBe(21);
    expect(result.totalCount).toBe(45);
    expect(result.totalPages).toBe(3);
  });

  it("serves a partial last page", () => {
    const result = paginateItems(items, 3, 20);
    expect(result.pageItems).toEqual([41, 42, 43, 44, 45]);
  });

  it("clamps out-of-range pages (filters shrank the set)", () => {
    const result = paginateItems(items, 9, 20);
    expect(result.page).toBe(3);
    expect(result.pageItems[0]).toBe(41);
  });

  it("clamps pages below 1", () => {
    const result = paginateItems(items, 0, 20);
    expect(result.page).toBe(1);
    expect(result.pageItems[0]).toBe(1);
  });

  it("handles the empty set", () => {
    const result = paginateItems([], 1, 20);
    expect(result.pageItems).toEqual([]);
    expect(result.totalPages).toBe(1);
    expect(result.totalCount).toBe(0);
  });

  it("honors a changed page size", () => {
    const result = paginateItems(items, 2, 10);
    expect(result.totalPages).toBe(5);
    expect(result.pageItems[0]).toBe(11);
  });
});

describe("page size constants", () => {
  it("offers ascending sizes including the default", () => {
    expect(MEMORY_ACTIVITY_PAGE_SIZES).toContain(
      DEFAULT_MEMORY_ACTIVITY_PAGE_SIZE,
    );
    const sorted = [...MEMORY_ACTIVITY_PAGE_SIZES].sort((a, b) => a - b);
    expect([...MEMORY_ACTIVITY_PAGE_SIZES]).toEqual(sorted);
  });
});
