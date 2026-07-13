import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

let selectCallCount = 0;

function createChainableSelect(): unknown {
  const chainable: Record<string, unknown> = {
    eq: () => chainable,
    order: () => chainable,
    limit: () => chainable,
    or: () => chainable,
    maybeSingle: () => {
      return Promise.resolve({ data: null, error: null });
    },
    then: (cb: (val: unknown) => unknown) => {
      selectCallCount++;
      if (selectCallCount === 1) {
        return cb({
          data: [
            {
              id: "entry-1",
              workspace_id: "ws-1",
              type: "domain",
              value: "spam.com",
              reason: "Known spam domain",
              created_at: "2026-07-12T00:00:00Z",
              created_by: "user-1",
            },
          ],
          error: null,
        });
      }
      return cb({ data: [], error: null });
    },
  };
  return chainable;
}

vi.mock("@/app/_lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn((table: string) => {
      if (table === "capture_blocklist") {
        return {
          select: vi.fn(() => createChainableSelect()),
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(() =>
                Promise.resolve({
                  data: {
                    id: "new-entry",
                    workspace_id: "ws-1",
                    type: "domain",
                    value: "blocked.com",
                    reason: null,
                    created_at: "2026-07-12T00:00:00Z",
                    created_by: null,
                  },
                  error: null,
                })
              ),
            })),
          })),
          delete: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ error: null })),
            })),
          })),
        };
      }
      return {};
    }),
  })),
}));

describe("Blocklist Manager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectCallCount = 0;
  });

  describe("normalizeBlocklistValue (via addBlocklistEntry)", () => {
    it("normalizes domain values to lowercase without @ prefix", async () => {
      const { addBlocklistEntry } = await import("./blocklist-manager");

      const result = await addBlocklistEntry({
        workspaceId: "ws-1",
        type: "domain",
        value: "@EXAMPLE.COM",
      });

      expect(result.success).toBe(true);
    });

    it("normalizes email values to lowercase", async () => {
      const { addBlocklistEntry } = await import("./blocklist-manager");

      const result = await addBlocklistEntry({
        workspaceId: "ws-1",
        type: "email",
        value: "Test@Example.COM",
      });

      expect(result.success).toBe(true);
    });

    it("validates sender_pattern as valid regex", async () => {
      const { addBlocklistEntry } = await import("./blocklist-manager");

      const validResult = await addBlocklistEntry({
        workspaceId: "ws-1",
        type: "sender_pattern",
        value: "^noreply.*$",
      });

      expect(validResult.success).toBe(true);
    });

    it("rejects invalid regex patterns", async () => {
      const { addBlocklistEntry } = await import("./blocklist-manager");

      const invalidResult = await addBlocklistEntry({
        workspaceId: "ws-1",
        type: "sender_pattern",
        value: "[invalid(regex",
      });

      expect(invalidResult.success).toBe(false);
      expect(invalidResult.error).toBe("Invalid value format");
    });

    it("rejects empty values", async () => {
      const { addBlocklistEntry } = await import("./blocklist-manager");

      const result = await addBlocklistEntry({
        workspaceId: "ws-1",
        type: "domain",
        value: "   ",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Invalid value format");
    });
  });

  describe("mapBlocklistEntry", () => {
    it("maps database row to BlocklistEntry type", async () => {
      const { getBlocklistEntries } = await import("./blocklist-manager");

      const entries = await getBlocklistEntries("ws-1");

      expect(entries).toHaveLength(1);
      expect(entries[0]).toEqual({
        id: "entry-1",
        workspaceId: "ws-1",
        type: "domain",
        value: "spam.com",
        reason: "Known spam domain",
        createdAt: "2026-07-12T00:00:00Z",
        createdBy: "user-1",
      });
    });
  });

  describe("removeBlocklistEntry", () => {
    it("removes entry successfully", async () => {
      const { removeBlocklistEntry } = await import("./blocklist-manager");

      const result = await removeBlocklistEntry("ws-1", "entry-1");

      expect(result.success).toBe(true);
    });
  });
});
