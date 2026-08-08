import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { assertInternalSecret } from "./assert-internal-secret";

const SECRET = "test-cron-secret-0123456789abcdef";

function reqWith(auth?: string): Request {
  return new Request("https://app.usesalt.io/api/cron/test", {
    headers: auth ? { Authorization: auth } : {},
  });
}

describe("assertInternalSecret (6.7 / INV-8)", () => {
  beforeEach(() => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("returns null for the exact secret", () => {
    vi.stubEnv("CRON_SECRET", SECRET);
    expect(assertInternalSecret(reqWith(`Bearer ${SECRET}`), "[test]")).toBeNull();
  });

  it("fails closed with 500 when CRON_SECRET is unconfigured", async () => {
    vi.stubEnv("CRON_SECRET", "");
    const res = assertInternalSecret(reqWith(`Bearer ${SECRET}`), "[test]");
    expect(res?.status).toBe(500);
  });

  it("rejects a missing Authorization header with 401", () => {
    vi.stubEnv("CRON_SECRET", SECRET);
    expect(assertInternalSecret(reqWith(), "[test]")?.status).toBe(401);
  });

  it("rejects a non-Bearer scheme with 401", () => {
    vi.stubEnv("CRON_SECRET", SECRET);
    expect(assertInternalSecret(reqWith(`Basic ${SECRET}`), "[test]")?.status).toBe(401);
  });

  it("rejects a wrong token of equal length with 401", () => {
    vi.stubEnv("CRON_SECRET", SECRET);
    const wrong = SECRET.replace(/.$/, SECRET.endsWith("0") ? "1" : "0");
    expect(assertInternalSecret(reqWith(`Bearer ${wrong}`), "[test]")?.status).toBe(401);
  });

  it("rejects a token that only shares a prefix (timing-attack probe)", () => {
    vi.stubEnv("CRON_SECRET", SECRET);
    expect(assertInternalSecret(reqWith(`Bearer ${SECRET.slice(0, 8)}`), "[test]")?.status).toBe(401);
  });

  it("rejects a token longer than the secret", () => {
    vi.stubEnv("CRON_SECRET", SECRET);
    expect(assertInternalSecret(reqWith(`Bearer ${SECRET}x`), "[test]")?.status).toBe(401);
  });
});
