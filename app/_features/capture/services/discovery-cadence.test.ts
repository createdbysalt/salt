import { describe, expect, it } from "vitest";
import {
  DISCOVERY_INTERVALS,
  discoveryIntervalMs,
  isDiscoveryDue,
  nextDiscoveryDueAt,
} from "./discovery-cadence";

const NOW = Date.parse("2026-08-08T12:00:00.000Z");

function hoursAgo(hours: number): string {
  return new Date(NOW - hours * 60 * 60 * 1000).toISOString();
}

describe("discoveryIntervalMs", () => {
  it("gives Starter the daily interval", () => {
    expect(discoveryIntervalMs("starter")).toBe(DISCOVERY_INTERVALS.starterMs);
    expect(DISCOVERY_INTERVALS.starterMs).toBe(24 * 60 * 60 * 1000);
  });

  it("gives paid tiers the 6-hour interval", () => {
    for (const tier of ["pro", "max", "enterprise"]) {
      expect(discoveryIntervalMs(tier)).toBe(DISCOVERY_INTERVALS.paidMs);
    }
    expect(DISCOVERY_INTERVALS.paidMs).toBe(6 * 60 * 60 * 1000);
  });

  it("fails safe to Starter for missing or unknown tiers", () => {
    expect(discoveryIntervalMs(null)).toBe(DISCOVERY_INTERVALS.starterMs);
    expect(discoveryIntervalMs(undefined)).toBe(DISCOVERY_INTERVALS.starterMs);
    expect(discoveryIntervalMs("gold-platinum")).toBe(DISCOVERY_INTERVALS.starterMs);
  });
});

describe("isDiscoveryDue", () => {
  it("is due when the workspace has never run discovery", () => {
    expect(isDiscoveryDue("starter", null, NOW)).toBe(true);
    expect(isDiscoveryDue("pro", undefined, NOW)).toBe(true);
  });

  it("is due when the stamp is unreadable", () => {
    expect(isDiscoveryDue("starter", "not-a-date", NOW)).toBe(true);
  });

  it("gates Starter to once a day", () => {
    expect(isDiscoveryDue("starter", hoursAgo(23), NOW)).toBe(false);
    expect(isDiscoveryDue("starter", hoursAgo(24), NOW)).toBe(true);
    expect(isDiscoveryDue("starter", hoursAgo(25), NOW)).toBe(true);
  });

  it("gates paid tiers to every 6 hours", () => {
    expect(isDiscoveryDue("pro", hoursAgo(5), NOW)).toBe(false);
    expect(isDiscoveryDue("pro", hoursAgo(6), NOW)).toBe(true);
    expect(isDiscoveryDue("max", hoursAgo(6), NOW)).toBe(true);
  });

  it("a missing subscription row reads as Starter", () => {
    expect(isDiscoveryDue(null, hoursAgo(6), NOW)).toBe(false);
    expect(isDiscoveryDue(null, hoursAgo(24), NOW)).toBe(true);
  });
});

describe("nextDiscoveryDueAt", () => {
  it("is now when the workspace has never run", () => {
    expect(nextDiscoveryDueAt("starter", null, NOW)).toBe(NOW);
  });

  it("is now when the interval already elapsed (cron picks it up next tick)", () => {
    expect(nextDiscoveryDueAt("starter", hoursAgo(30), NOW)).toBe(NOW);
    expect(nextDiscoveryDueAt("pro", hoursAgo(7), NOW)).toBe(NOW);
  });

  it("is stamp + interval while still inside the cadence window", () => {
    expect(nextDiscoveryDueAt("starter", hoursAgo(20), NOW)).toBe(
      NOW + 4 * 60 * 60 * 1000,
    );
    expect(nextDiscoveryDueAt("pro", hoursAgo(2), NOW)).toBe(
      NOW + 4 * 60 * 60 * 1000,
    );
  });
});
