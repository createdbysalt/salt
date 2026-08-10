import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  getCachedConnectionHealth,
  setCachedConnectionHealth,
  invalidateConnectionHealth,
  type ConnectionHealthVerdict,
} from "./health-check-cache";

function verdict(healthy: boolean): ConnectionHealthVerdict {
  return {
    healthy,
    localStatus: healthy ? "connected" : "expired",
    remoteStatus: healthy ? "connected" : "expired",
    composioConnectionId: "conn-1",
    diagnostics: {},
  };
}

describe("health-check-cache (3.6)", () => {
  beforeEach(() => {
    invalidateConnectionHealth("ws-1");
    invalidateConnectionHealth("ws-2");
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns null on a miss and the verdict after a set", () => {
    expect(getCachedConnectionHealth("ws-1", "gmail")).toBeNull();
    setCachedConnectionHealth("ws-1", "gmail", verdict(true));
    expect(getCachedConnectionHealth("ws-1", "gmail")?.healthy).toBe(true);
  });

  it("expires entries after the 10-minute TTL", () => {
    setCachedConnectionHealth("ws-1", "gmail", verdict(true));
    vi.advanceTimersByTime(10 * 60 * 1000 + 1);
    expect(getCachedConnectionHealth("ws-1", "gmail")).toBeNull();
  });

  it("keeps entries inside the TTL", () => {
    setCachedConnectionHealth("ws-1", "gmail", verdict(false));
    vi.advanceTimersByTime(9 * 60 * 1000);
    expect(getCachedConnectionHealth("ws-1", "gmail")?.healthy).toBe(false);
  });

  it("invalidates a single provider without touching others", () => {
    setCachedConnectionHealth("ws-1", "gmail", verdict(true));
    setCachedConnectionHealth("ws-1", "slack", verdict(true));
    invalidateConnectionHealth("ws-1", "gmail");
    expect(getCachedConnectionHealth("ws-1", "gmail")).toBeNull();
    expect(getCachedConnectionHealth("ws-1", "slack")).not.toBeNull();
  });

  it("invalidates all providers for a workspace, not other workspaces", () => {
    setCachedConnectionHealth("ws-1", "gmail", verdict(true));
    setCachedConnectionHealth("ws-1", "slack", verdict(true));
    setCachedConnectionHealth("ws-2", "gmail", verdict(true));
    invalidateConnectionHealth("ws-1");
    expect(getCachedConnectionHealth("ws-1", "gmail")).toBeNull();
    expect(getCachedConnectionHealth("ws-1", "slack")).toBeNull();
    expect(getCachedConnectionHealth("ws-2", "gmail")).not.toBeNull();
  });
});
