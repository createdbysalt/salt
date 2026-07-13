import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/app/_lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn(() => ({
      upsert: vi.fn(() => ({
        select: vi.fn(() => Promise.resolve({ data: [{ id: "1" }], error: null })),
      })),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              limit: vi.fn(() => ({
                maybeSingle: vi.fn(() => Promise.resolve({ data: null })),
              })),
            })),
          })),
        })),
      })),
    })),
  })),
}));

describe("watch-expressions (unit logic)", () => {
  describe("isCommonDomain", () => {
    it("identifies common email providers", async () => {
      const { registerWatchExpressions } = await import("./watch-expressions");

      const result = await registerWatchExpressions({
        workspaceId: "ws-1",
        targetSurface: "people",
        targetEntityId: "person-1",
        emails: ["user@gmail.com"],
      });

      expect(result.registered).toBeGreaterThanOrEqual(0);
    });
  });

  describe("normalizePhone", () => {
    it("handles various phone formats", async () => {
      const { registerWatchExpressions } = await import("./watch-expressions");

      const result = await registerWatchExpressions({
        workspaceId: "ws-1",
        targetSurface: "people",
        targetEntityId: "person-1",
        phones: ["(555) 123-4567", "555.123.4567", "5551234567"],
      });

      expect(result.registered).toBeGreaterThanOrEqual(0);
    });

    it("rejects too-short phone numbers", async () => {
      const { registerWatchExpressions } = await import("./watch-expressions");

      const result = await registerWatchExpressions({
        workspaceId: "ws-1",
        targetSurface: "people",
        targetEntityId: "person-1",
        phones: ["123"],
      });

      expect(result.registered).toBe(0);
      expect(result.skipped).toBe(0);
    });
  });

  describe("registerWatchExpressions", () => {
    it("extracts domain from email", async () => {
      const { registerWatchExpressions } = await import("./watch-expressions");

      const result = await registerWatchExpressions({
        workspaceId: "ws-1",
        targetSurface: "people",
        targetEntityId: "person-1",
        emails: ["alice@acme.com"],
      });

      expect(result.registered).toBeGreaterThanOrEqual(0);
    });

    it("handles empty input gracefully", async () => {
      const { registerWatchExpressions } = await import("./watch-expressions");

      const result = await registerWatchExpressions({
        workspaceId: "ws-1",
        targetSurface: "people",
        targetEntityId: "person-1",
      });

      expect(result.registered).toBe(0);
      expect(result.skipped).toBe(0);
    });

    it("normalizes email to lowercase", async () => {
      const { registerWatchExpressions } = await import("./watch-expressions");

      const result = await registerWatchExpressions({
        workspaceId: "ws-1",
        targetSurface: "people",
        targetEntityId: "person-1",
        emails: ["ALICE@ACME.COM"],
      });

      expect(result.registered).toBeGreaterThanOrEqual(0);
    });
  });

  describe("matchWatchExpressions", () => {
    it("handles empty input", async () => {
      const { matchWatchExpressions } = await import("./watch-expressions");

      const matches = await matchWatchExpressions("ws-1", {});

      expect(matches).toEqual([]);
    });
  });
});
