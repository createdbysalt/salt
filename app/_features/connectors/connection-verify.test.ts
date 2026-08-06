import { describe, expect, it } from "vitest";
import { readConnectionCheckCache } from "./connection-verify";

const NOW = Date.parse("2026-08-03T12:00:00Z");
const HOUR = 60 * 60 * 1000;

describe("readConnectionCheckCache", () => {
  it("returns a fresh cached verdict", () => {
    const config = {
      connectionCheck: {
        verdict: "working",
        checkedAt: new Date(NOW - 10 * 60 * 1000).toISOString(),
      },
    };
    expect(readConnectionCheckCache(config, NOW)).toBe("working");
  });

  it("expires verdicts past the TTL", () => {
    const config = {
      connectionCheck: {
        verdict: "broken",
        checkedAt: new Date(NOW - 2 * HOUR).toISOString(),
      },
    };
    expect(readConnectionCheckCache(config, NOW)).toBeNull();
  });

  it("rejects malformed or missing cache entries", () => {
    expect(readConnectionCheckCache(null, NOW)).toBeNull();
    expect(readConnectionCheckCache({}, NOW)).toBeNull();
    expect(
      readConnectionCheckCache(
        { connectionCheck: { verdict: "nonsense", checkedAt: new Date(NOW).toISOString() } },
        NOW,
      ),
    ).toBeNull();
    expect(
      readConnectionCheckCache(
        { connectionCheck: { verdict: "working", checkedAt: "not-a-date" } },
        NOW,
      ),
    ).toBeNull();
  });
});
