import { describe, expect, it } from "vitest";
import { hasContactDate, relativeDays } from "./people-demo-data";

describe("hasContactDate", () => {
  it("is false for null and undefined", () => {
    expect(hasContactDate(null)).toBe(false);
    expect(hasContactDate(undefined)).toBe(false);
  });

  it("is false for epoch-0 (the old blank-record fallback)", () => {
    expect(hasContactDate(new Date(0).toISOString())).toBe(false);
  });

  it("is false for unparseable strings", () => {
    expect(hasContactDate("not-a-date")).toBe(false);
  });

  it("is true for real timestamps", () => {
    expect(hasContactDate(new Date().toISOString())).toBe(true);
  });
});

describe("relativeDays", () => {
  it("returns an em dash for null / epoch-0 / invalid inputs", () => {
    expect(relativeDays(null)).toBe("—");
    expect(relativeDays(undefined)).toBe("—");
    expect(relativeDays(new Date(0).toISOString())).toBe("—");
    expect(relativeDays("not-a-date")).toBe("—");
  });

  it("returns 'today' for the current moment", () => {
    expect(relativeDays(new Date().toISOString())).toBe("today");
  });

  it("formats day, month, and year buckets", () => {
    const daysAgo = (n: number) =>
      new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();
    expect(relativeDays(daysAgo(1))).toBe("1d ago");
    expect(relativeDays(daysAgo(10))).toBe("10d ago");
    expect(relativeDays(daysAgo(60))).toBe("2mo ago");
    expect(relativeDays(daysAgo(730))).toBe("2y ago");
  });
});
