import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const mockConnectionStatus = vi.fn();
const mockSupabaseFrom = vi.fn();

vi.mock("@/app/_lib/composio/connections", () => ({
  getConnectionStatus: (...args: unknown[]) => mockConnectionStatus(...args),
}));

vi.mock("@/app/_lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: (...args: unknown[]) => mockSupabaseFrom(...args),
  })),
}));

vi.mock("../adapters/registry", () => ({
  adapterForToolkit: vi.fn((provider: string) => {
    if (provider === "gmail") {
      return {
        sourceType: "email",
        triggerSlugs: ["GMAIL_NEW_GMAIL_MESSAGE"],
      };
    }
    if (provider === "unknown") {
      return null;
    }
    return {
      sourceType: provider,
      triggerSlugs: [],
    };
  }),
}));

describe("Connector Health", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConnectionStatus.mockResolvedValue({
      connected: true,
      composioConnectionId: "conn-123",
    });
    mockSupabaseFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: "int-1",
                is_active: true,
                capture_enabled: true,
                config: { captureTriggerIds: ["trigger-1"] },
              },
              error: null,
            }),
            gte: vi.fn().mockReturnValue({
              then: vi.fn((cb) => cb({ count: 5, error: null })),
            }),
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { created_at: "2026-07-12T00:00:00Z" },
                  error: null,
                }),
              }),
            }),
          }),
        }),
      }),
    });
  });

  describe("checkConnectorHealth", () => {
    it("returns no adapter diagnosis for unknown providers", async () => {
      const { checkConnectorHealth } = await import("./connector-health");

      const result = await checkConnectorHealth("ws-1", "unknown");

      expect(result.hasAdapter).toBe(false);
      expect(result.diagnosis).toContain(
        "No capture adapter defined for this provider"
      );
    });

    it("returns not connected diagnosis when disconnected", async () => {
      mockConnectionStatus.mockResolvedValue({
        connected: false,
        composioConnectionId: null,
      });

      const { checkConnectorHealth } = await import("./connector-health");

      const result = await checkConnectorHealth("ws-1", "gmail");

      expect(result.connectionStatus.connected).toBe(false);
      expect(result.diagnosis).toContain(
        "Not connected - user needs to connect this account"
      );
    });

    it("returns capture disabled diagnosis when capture not enabled", async () => {
      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: "int-1",
                  is_active: true,
                  capture_enabled: false,
                  config: {},
                },
                error: null,
              }),
              gte: vi.fn().mockReturnValue({
                then: vi.fn((cb) => cb({ count: 0, error: null })),
              }),
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: null,
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        }),
      });

      const { checkConnectorHealth } = await import("./connector-health");

      const result = await checkConnectorHealth("ws-1", "gmail");

      expect(result.connectionStatus.captureEnabled).toBe(false);
      expect(result.diagnosis).toContain(
        "Capture disabled - user needs to enable capture toggle"
      );
    });

    it("returns missing triggers diagnosis when triggers not registered", async () => {
      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: "int-1",
                  is_active: true,
                  capture_enabled: true,
                  config: { captureTriggerIds: [] },
                },
                error: null,
              }),
              gte: vi.fn().mockReturnValue({
                then: vi.fn((cb) => cb({ count: 0, error: null })),
              }),
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: null,
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        }),
      });

      const { checkConnectorHealth } = await import("./connector-health");

      const result = await checkConnectorHealth("ws-1", "gmail");

      expect(result.triggerStatus.triggersRegistered).toBe(0);
      expect(result.triggerStatus.triggersExpected).toBe(1);
      expect(result.diagnosis.some((d) => d.includes("No trigger subscriptions"))).toBe(true);
    });
  });

  describe("getQuickConnectorHealth", () => {
    it("returns not_connected for disconnected providers", async () => {
      mockConnectionStatus.mockResolvedValue({
        connected: false,
        composioConnectionId: null,
      });

      const { getQuickConnectorHealth } = await import("./connector-health");

      const result = await getQuickConnectorHealth("ws-1", "gmail");

      expect(result.status).toBe("not_connected");
      expect(result.message).toBe("Not connected");
    });

    it("returns disabled when capture not enabled", async () => {
      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: "int-1",
                  is_active: true,
                  capture_enabled: false,
                  config: {},
                },
                error: null,
              }),
              gte: vi.fn().mockReturnValue({
                then: vi.fn((cb) => cb({ count: 0, error: null })),
              }),
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: null,
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        }),
      });

      const { getQuickConnectorHealth } = await import("./connector-health");

      const result = await getQuickConnectorHealth("ws-1", "gmail");

      expect(result.status).toBe("disabled");
      expect(result.message).toBe("Capture disabled");
    });
  });
});
