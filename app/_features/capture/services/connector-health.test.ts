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

vi.mock("@/app/_lib/composio/trigger-subscriptions", () => ({
  getCaptureTriggerSpecs: vi.fn(async (provider: string) =>
    provider === "gmail"
      ? [{ slug: "GMAIL_NEW_GMAIL_MESSAGE", config: null }]
      : [],
  ),
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

    it("quiet with valid connection and triggers is HEALTHY, never unhealthy (positive-signal rule)", async () => {
      // Zero captures across the board; connection valid, triggers registered.
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

      expect(result.status).toBe("healthy");
      expect(result.message).toBe("Connected — quiet");
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

  describe("summarizeConnectors — positive-signal rule (never infer broken from silence)", () => {
    const status = (over: {
      connected?: boolean;
      captureEnabled?: boolean;
      triggersHealthy?: boolean;
      triggersExpected?: number;
      last7d?: number;
    }) => ({
      provider: "gmail",
      hasAdapter: true,
      connectionStatus: {
        connected: over.connected ?? true,
        isActive: over.connected ?? true,
        captureEnabled: over.captureEnabled ?? true,
        composioConnectionId: "ca_x",
      },
      triggerStatus: {
        triggerSlugs: [] as readonly string[],
        registeredTriggerIds: [] as string[],
        triggersExpected: over.triggersExpected ?? 1,
        triggersRegistered:
          over.triggersHealthy === false ? 0 : over.triggersExpected ?? 1,
        healthy: over.triggersHealthy ?? true,
      },
      captureStats: {
        last24h: 0,
        last7d: over.last7d ?? 0,
        lastCaptureAt: null,
      },
      diagnosis: [] as string[],
    });

    it("a quiet connector with valid connection and registered triggers is HEALTHY", async () => {
      const { summarizeConnectors } = await import("./connector-health");
      const summary = summarizeConnectors([
        status({ last7d: 0, triggersHealthy: true }),
      ]);
      expect(summary.healthy).toBe(1);
      expect(summary.unhealthy).toBe(0);
    });

    it("unhealthy requires a positive signal: trigger registration shortfall", async () => {
      const { summarizeConnectors } = await import("./connector-health");
      const summary = summarizeConnectors([status({ triggersHealthy: false })]);
      expect(summary.unhealthy).toBe(1);
      expect(summary.healthy).toBe(0);
    });

    it("capture volume never decides health — traffic with broken triggers is still unhealthy", async () => {
      const { summarizeConnectors } = await import("./connector-health");
      const summary = summarizeConnectors([
        status({ last7d: 500, triggersHealthy: false }),
      ]);
      expect(summary.unhealthy).toBe(1);
    });

    it("disconnected and capture-disabled are their own buckets, not unhealthy", async () => {
      const { summarizeConnectors } = await import("./connector-health");
      const summary = summarizeConnectors([
        status({ connected: false }),
        status({ captureEnabled: false }),
      ]);
      expect(summary.notConnected).toBe(1);
      expect(summary.captureDisabled).toBe(1);
      expect(summary.unhealthy).toBe(0);
    });

    it("backfill-only connectors (zero expected triggers) are healthy when enabled", async () => {
      const { summarizeConnectors } = await import("./connector-health");
      const summary = summarizeConnectors([
        status({ triggersExpected: 0, triggersHealthy: true, last7d: 0 }),
      ]);
      expect(summary.healthy).toBe(1);
    });
  });
});
