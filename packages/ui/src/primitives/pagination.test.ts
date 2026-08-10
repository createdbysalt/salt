import { describe, expect, it } from "vitest"

import { getPaginationRange } from "./pagination"

describe("getPaginationRange", () => {
  it("returns every page when the total fits without ellipses", () => {
    expect(getPaginationRange(1, 1)).toEqual([1])
    expect(getPaginationRange(3, 5)).toEqual([1, 2, 3, 4, 5])
    expect(getPaginationRange(7, 7)).toEqual([1, 2, 3, 4, 5, 6, 7])
  })

  it("collapses the tail when near the start", () => {
    expect(getPaginationRange(1, 10)).toEqual([1, 2, 3, 4, 5, "ellipsis-end", 10])
    expect(getPaginationRange(3, 10)).toEqual([1, 2, 3, 4, 5, "ellipsis-end", 10])
  })

  it("collapses the head when near the end", () => {
    expect(getPaginationRange(10, 10)).toEqual([
      1,
      "ellipsis-start",
      6,
      7,
      8,
      9,
      10,
    ])
    expect(getPaginationRange(8, 10)).toEqual([
      1,
      "ellipsis-start",
      6,
      7,
      8,
      9,
      10,
    ])
  })

  it("collapses both sides when in the middle", () => {
    expect(getPaginationRange(5, 10)).toEqual([
      1,
      "ellipsis-start",
      4,
      5,
      6,
      "ellipsis-end",
      10,
    ])
  })

  it("clamps out-of-range pages", () => {
    expect(getPaginationRange(0, 10)).toEqual([1, 2, 3, 4, 5, "ellipsis-end", 10])
    expect(getPaginationRange(99, 10)).toEqual([
      1,
      "ellipsis-start",
      6,
      7,
      8,
      9,
      10,
    ])
  })

  it("never emits duplicate page numbers", () => {
    for (let total = 1; total <= 20; total++) {
      for (let page = 1; page <= total; page++) {
        const range = getPaginationRange(page, total)
        const numbers = range.filter((item) => typeof item === "number")
        expect(new Set(numbers).size).toBe(numbers.length)
        expect(range[0]).toBe(1)
        expect(range[range.length - 1]).toBe(total)
      }
    }
  })
})
