import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const getUser = vi.fn();
vi.mock("@/app/_lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ auth: { getUser } })),
}));

import { getPlatformAdmin } from "./platform-admin";

describe("platform admin gate", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    getUser.mockReset();
  });

  it("fails closed when PLATFORM_ADMIN_EMAILS is unset", async () => {
    vi.stubEnv("PLATFORM_ADMIN_EMAILS", "");
    getUser.mockResolvedValue({
      data: { user: { id: "u1", email: "hello@usesalt.io" } },
    });
    expect(await getPlatformAdmin()).toEqual({ ok: false });
  });

  it("rejects emails outside the allowlist", async () => {
    vi.stubEnv("PLATFORM_ADMIN_EMAILS", "hello@usesalt.io");
    getUser.mockResolvedValue({
      data: { user: { id: "u2", email: "attacker@example.com" } },
    });
    expect(await getPlatformAdmin()).toEqual({ ok: false });
  });

  it("accepts an allowlisted email case-insensitively", async () => {
    vi.stubEnv("PLATFORM_ADMIN_EMAILS", "Hello@UseSalt.io, ops@salt.io");
    getUser.mockResolvedValue({
      data: { user: { id: "u3", email: "hello@usesalt.io" } },
    });
    expect(await getPlatformAdmin()).toEqual({
      ok: true,
      userId: "u3",
      email: "hello@usesalt.io",
    });
  });

  it("rejects anonymous sessions", async () => {
    vi.stubEnv("PLATFORM_ADMIN_EMAILS", "hello@usesalt.io");
    getUser.mockResolvedValue({ data: { user: null } });
    expect(await getPlatformAdmin()).toEqual({ ok: false });
  });
});
