import { describe, expect, it } from "vitest";
import { daysSince, isConnectionStale, STALE_AFTER_DAYS } from "./staleness";

const NOW = Date.parse("2026-08-03T12:00:00Z");
const DAY = 24 * 60 * 60 * 1000;

function iso(daysAgo: number): string {
  return new Date(NOW - daysAgo * DAY).toISOString();
}

const base = {
  connected: true,
  captureEnabled: true,
  hasRealtimeTriggers: true,
  connectedAt: iso(30),
  now: NOW,
};

describe("isConnectionStale", () => {
  it("flags a connection with no captures for over the threshold", () => {
    expect(isConnectionStale({ ...base, lastCaptureAt: iso(20) })).toBe(true);
  });

  it("does not flag recent activity", () => {
    expect(isConnectionStale({ ...base, lastCaptureAt: iso(2) })).toBe(false);
  });

  it("treats exactly-at-threshold as not yet stale", () => {
    expect(
      isConnectionStale({ ...base, lastCaptureAt: iso(STALE_AFTER_DAYS) })
    ).toBe(false);
  });

  it("flags never-captured connections once the connection itself is old", () => {
    expect(isConnectionStale({ ...base, lastCaptureAt: null })).toBe(true);
    expect(
      isConnectionStale({ ...base, lastCaptureAt: null, connectedAt: iso(2) })
    ).toBe(false);
  });

  it("never flags disconnected, capture-off, or backfill-only connectors", () => {
    expect(
      isConnectionStale({ ...base, connected: false, lastCaptureAt: iso(20) })
    ).toBe(false);
    expect(
      isConnectionStale({ ...base, captureEnabled: false, lastCaptureAt: iso(20) })
    ).toBe(false);
    expect(
      isConnectionStale({
        ...base,
        hasRealtimeTriggers: false,
        lastCaptureAt: iso(20),
      })
    ).toBe(false);
  });

  it("stays quiet without any evidence timestamps", () => {
    expect(
      isConnectionStale({ ...base, lastCaptureAt: null, connectedAt: null })
    ).toBe(false);
  });
});

describe("daysSince", () => {
  it("floors to whole days and clamps at zero", () => {
    expect(daysSince(iso(20), NOW)).toBe(20);
    expect(daysSince(iso(0.4), NOW)).toBe(0);
    expect(daysSince(new Date(NOW + DAY).toISOString(), NOW)).toBe(0);
  });

  it("returns null for missing or invalid input", () => {
    expect(daysSince(null, NOW)).toBeNull();
    expect(daysSince("not-a-date", NOW)).toBeNull();
  });
});
