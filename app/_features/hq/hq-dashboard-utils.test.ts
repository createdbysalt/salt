import { describe, expect, it } from "vitest";
import {
  buildWeeklyActivityBars,
  computeWeekOverWeekPct,
  formatMinutesSaved,
  normalizeShare,
  toDateKey,
  weekStartForDay,
} from "./hq-dashboard-utils";

describe("formatMinutesSaved", () => {
  it("formats minutes under an hour", () => {
    expect(formatMinutesSaved(0)).toBe("0m");
    expect(formatMinutesSaved(45)).toBe("45m");
  });

  it("formats hours with and without a remainder", () => {
    expect(formatMinutesSaved(60)).toBe("1h");
    expect(formatMinutesSaved(160)).toBe("2h 40m");
  });
});

describe("computeWeekOverWeekPct", () => {
  it("returns null when both weeks are empty", () => {
    expect(computeWeekOverWeekPct(0, 0)).toBeNull();
  });

  it("computes positive growth", () => {
    expect(computeWeekOverWeekPct(10, 5)).toBe(100);
  });

  it("returns 100% when last week had no activity", () => {
    expect(computeWeekOverWeekPct(3, 0)).toBe(100);
  });
});

describe("buildWeeklyActivityBars", () => {
  it("normalizes counts into bar heights", () => {
    expect(buildWeeklyActivityBars([0, 2, 4])).toEqual([0.15, 0.5, 1]);
  });
});

describe("normalizeShare", () => {
  it("returns percentage shares that sum to 100", () => {
    expect(normalizeShare([50, 50])).toEqual([50, 50]);
    expect(normalizeShare([300, 100])).toEqual([75, 25]);
  });
});

describe("calendar helpers", () => {
  it("finds week start for a day in June 2026", () => {
    expect(weekStartForDay(2026, 5, 26)).toBe(21);
  });

  it("formats stable date keys", () => {
    expect(toDateKey(new Date("2026-06-25T15:00:00"))).toBe("2026-06-25");
  });
});
