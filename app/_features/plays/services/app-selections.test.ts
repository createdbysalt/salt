import { beforeEach, describe, expect, it, vi } from "vitest";

const maybeSingle = vi.fn();

vi.mock("@/app/_lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            maybeSingle,
          }),
        }),
      }),
    }),
  }),
}));

import {
  exclusionsFromSelections,
  loadPlaybookAppSelections,
} from "./app-selections";

describe("exclusionsFromSelections", () => {
  it("excludes every connected provider when nothing is selected", () => {
    expect(
      exclusionsFromSelections(["stripe", "gmail"], new Set())
    ).toEqual(new Set(["stripe", "gmail"]));
  });

  it("keeps selected providers in the fan-out", () => {
    expect(
      exclusionsFromSelections(["stripe", "gmail", "quickbooks"], new Set(["stripe"]))
    ).toEqual(new Set(["gmail", "quickbooks"]));
  });
});

describe("loadPlaybookAppSelections", () => {
  beforeEach(() => {
    maybeSingle.mockReset();
  });

  it("returns empty when no row exists (true opt-in)", async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null });
    await expect(
      loadPlaybookAppSelections("ws-1", "invoice-reminder")
    ).resolves.toEqual(new Set());
  });

  it("returns the stored providers", async () => {
    maybeSingle.mockResolvedValue({
      data: { app_selections: ["stripe", "gmail"] },
      error: null,
    });
    await expect(
      loadPlaybookAppSelections("ws-1", "invoice-reminder")
    ).resolves.toEqual(new Set(["stripe", "gmail"]));
  });

  it("fails closed on a read error", async () => {
    maybeSingle.mockResolvedValue({ data: null, error: { message: "boom" } });
    await expect(
      loadPlaybookAppSelections("ws-1", "invoice-reminder")
    ).resolves.toEqual(new Set());
  });
});
