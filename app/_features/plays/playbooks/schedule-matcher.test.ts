import { describe, expect, it } from "vitest";

import { parseCronExpression, cronMatchesHour } from "./schedule-matcher";

/** UTC date helper: 2026-08-06 is a Thursday. */
function utc(iso: string): Date {
  return new Date(iso);
}

describe("parseCronExpression", () => {
  it("parses a simple weekly expression", () => {
    const parsed = parseCronExpression("0 3 * * 0");
    expect(parsed).not.toBeNull();
    expect([...parsed!.hours]).toEqual([3]);
    expect([...parsed!.daysOfWeek]).toEqual([0]);
  });

  it("parses ranges, lists, and steps", () => {
    const parsed = parseCronExpression("0 6,18 * * 1-5");
    expect([...parsed!.hours]).toEqual([6, 18]);
    expect([...parsed!.daysOfWeek]).toEqual([1, 2, 3, 4, 5]);

    const stepped = parseCronExpression("0 */6 * * *");
    expect([...stepped!.hours]).toEqual([0, 6, 12, 18]);
  });

  it("normalizes day-of-week 7 to Sunday", () => {
    const parsed = parseCronExpression("0 2 * * 7");
    expect(parsed!.daysOfWeek.has(0)).toBe(true);
  });

  it("returns null for malformed expressions", () => {
    expect(parseCronExpression("not a cron")).toBeNull();
    expect(parseCronExpression("0 3 * *")).toBeNull();
    expect(parseCronExpression("0 25 * * *")).toBeNull();
    expect(parseCronExpression("0 3 * * 9")).toBeNull();
  });
});

describe("cronMatchesHour", () => {
  it("matches on the scheduled UTC hour and day", () => {
    // Sunday 2026-08-09 03:xx UTC
    expect(cronMatchesHour("0 3 * * 0", utc("2026-08-09T03:15:00Z"))).toBe(true);
    // Same hour on Thursday must not match
    expect(cronMatchesHour("0 3 * * 0", utc("2026-08-06T03:15:00Z"))).toBe(false);
    // Sunday but wrong hour
    expect(cronMatchesHour("0 3 * * 0", utc("2026-08-09T04:15:00Z"))).toBe(false);
  });

  it("ignores the minute field (hourly execution granularity)", () => {
    expect(cronMatchesHour("30 9 * * *", utc("2026-08-06T09:00:00Z"))).toBe(true);
    expect(cronMatchesHour("30 9 * * *", utc("2026-08-06T09:59:00Z"))).toBe(true);
  });

  it("matches weekday ranges", () => {
    // Thursday
    expect(cronMatchesHour("0 9 * * 1-5", utc("2026-08-06T09:00:00Z"))).toBe(true);
    // Saturday
    expect(cronMatchesHour("0 9 * * 1-5", utc("2026-08-08T09:00:00Z"))).toBe(false);
  });

  it("returns false for malformed expressions instead of throwing", () => {
    expect(cronMatchesHour("garbage", utc("2026-08-06T09:00:00Z"))).toBe(false);
  });

  it("evaluates in the provided IANA timezone", () => {
    // Weekday 9am in America/Toronto (HQ daily briefing window).
    // In August (EDT, UTC-4), 9am Toronto = 13:00 UTC.
    const thursday13Utc = utc("2026-08-06T13:00:00Z");
    expect(cronMatchesHour("0 9 * * 1-5", thursday13Utc, "America/Toronto")).toBe(
      true
    );
    // Without the timezone the same instant is 13:00 UTC — no match.
    expect(cronMatchesHour("0 9 * * 1-5", thursday13Utc)).toBe(false);
    // 9:00 UTC is 5am Toronto — no match with the timezone.
    expect(
      cronMatchesHour("0 9 * * 1-5", utc("2026-08-06T09:00:00Z"), "America/Toronto")
    ).toBe(false);
  });

  it("handles timezone day boundaries", () => {
    // Friday 2026-08-07 02:00 UTC is still Thursday 22:00 in Toronto.
    const fri2Utc = utc("2026-08-07T02:00:00Z");
    expect(cronMatchesHour("0 22 * * 4", fri2Utc, "America/Toronto")).toBe(true);
    expect(cronMatchesHour("0 22 * * 5", fri2Utc, "America/Toronto")).toBe(false);
  });

  it("falls back to UTC for unknown timezones", () => {
    expect(
      cronMatchesHour("0 9 * * *", utc("2026-08-06T09:00:00Z"), "Not/AZone")
    ).toBe(true);
  });
});
