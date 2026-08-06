import { describe, it, expect, vi, beforeEach } from "vitest";

const mockListActive = vi.fn();
const mockCreateTrigger = vi.fn();
const mockDeleteTrigger = vi.fn();

vi.mock("./client", () => ({
  getComposioClient: () => ({
    triggers: {
      listActive: (...args: unknown[]) => mockListActive(...args),
      create: (...args: unknown[]) => mockCreateTrigger(...args),
      delete: (...args: unknown[]) => mockDeleteTrigger(...args),
    },
  }),
}));

let mockRows: Array<Record<string, unknown>> = [];
const configUpdates: Array<{ id: string; captureTriggerIds: unknown }> = [];

vi.mock("@/app/_lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => Promise.resolve({ data: mockRows, error: null }),
      update: (payload: { config?: { captureTriggerIds?: unknown } }) => ({
        eq: (_col: string, id: string) => {
          configUpdates.push({
            id,
            captureTriggerIds: payload.config?.captureTriggerIds,
          });
          return Promise.resolve({ error: null });
        },
      }),
    }),
  }),
}));

let slugsByProvider: Record<string, string[]> = {};

vi.mock("./trigger-subscriptions", () => ({
  getCaptureTriggerSlugs: vi.fn(
    async (provider: string) => slugsByProvider[provider] ?? [],
  ),
}));

function integrationRow(overrides: Record<string, unknown>) {
  return {
    id: "int-1",
    workspace_id: "ws-1",
    provider: "stripe",
    composio_connection_id: "conn-1",
    config: {},
    is_active: true,
    capture_enabled: true,
    ...overrides,
  };
}

describe("runTriggerReconciliation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRows = [];
    configUpdates.length = 0;
    slugsByProvider = {};
    mockListActive.mockResolvedValue({ items: [], nextCursor: null });
    mockDeleteTrigger.mockResolvedValue({});
  });

  it("creates missing subscriptions and persists trigger IDs", async () => {
    mockRows = [integrationRow({})];
    slugsByProvider = {
      stripe: [
        "STRIPE_INVOICE_PAYMENT_SUCCEEDED_TRIGGER",
        "STRIPE_CHARGE_FAILED_TRIGGER",
      ],
    };
    mockCreateTrigger
      .mockResolvedValueOnce({ triggerId: "t1" })
      .mockResolvedValueOnce({ triggerId: "t2" });

    const { runTriggerReconciliation } = await import("./trigger-reconciliation");
    const result = await runTriggerReconciliation();

    expect(result.triggersCreated).toBe(2);
    expect(result.failures).toHaveLength(0);
    expect(mockCreateTrigger).toHaveBeenCalledWith(
      "ws-1",
      "STRIPE_INVOICE_PAYMENT_SUCCEEDED_TRIGGER",
      { connectedAccountId: "conn-1", triggerConfig: { interval: 1 } },
    );
    expect(configUpdates).toEqual([
      { id: "int-1", captureTriggerIds: ["t1", "t2"] },
    ]);
    expect(result.configsUpdated).toBe(1);
  });

  it("deletes orphaned instances whose account matches no integration row", async () => {
    mockRows = [integrationRow({ composio_connection_id: "conn-current" })];
    slugsByProvider = { stripe: [] };
    mockListActive.mockResolvedValue({
      items: [
        {
          id: "orphan-1",
          connectedAccountId: "conn-expired",
          triggerName: "STRIPE_CHARGE_FAILED_TRIGGER",
        },
      ],
      nextCursor: null,
    });

    const { runTriggerReconciliation } = await import("./trigger-reconciliation");
    const result = await runTriggerReconciliation();

    expect(mockDeleteTrigger).toHaveBeenCalledWith("orphan-1");
    expect(result.orphansDeleted).toBe(1);
  });

  it("leaves healthy subscriptions untouched and drops dead IDs from config", async () => {
    mockRows = [
      integrationRow({
        provider: "gmail",
        composio_connection_id: "conn-g",
        config: { captureTriggerIds: ["dead-id", "live-id"] },
      }),
    ];
    slugsByProvider = { gmail: ["GMAIL_NEW_GMAIL_MESSAGE"] };
    mockListActive.mockResolvedValue({
      items: [
        {
          id: "live-id",
          connectedAccountId: "conn-g",
          triggerName: "GMAIL_NEW_GMAIL_MESSAGE",
        },
      ],
      nextCursor: null,
    });

    const { runTriggerReconciliation } = await import("./trigger-reconciliation");
    const result = await runTriggerReconciliation();

    expect(mockCreateTrigger).not.toHaveBeenCalled();
    expect(mockDeleteTrigger).not.toHaveBeenCalled();
    expect(result.triggersCreated).toBe(0);
    expect(configUpdates).toEqual([
      { id: "int-1", captureTriggerIds: ["live-id"] },
    ]);
  });

  it("skips inactive and capture-disabled integrations without touching their triggers", async () => {
    mockRows = [
      integrationRow({ capture_enabled: false, composio_connection_id: "conn-off" }),
      integrationRow({ id: "int-2", is_active: false, composio_connection_id: "conn-dead" }),
    ];
    slugsByProvider = { stripe: ["STRIPE_CHARGE_FAILED_TRIGGER"] };
    mockListActive.mockResolvedValue({
      items: [
        {
          id: "t-off",
          connectedAccountId: "conn-off",
          triggerName: "STRIPE_CHARGE_FAILED_TRIGGER",
        },
      ],
      nextCursor: null,
    });

    const { runTriggerReconciliation } = await import("./trigger-reconciliation");
    const result = await runTriggerReconciliation();

    expect(result.connectionsSeen).toBe(0);
    expect(mockCreateTrigger).not.toHaveBeenCalled();
    // The instance belongs to a known integration row — not an orphan.
    expect(mockDeleteTrigger).not.toHaveBeenCalled();
  });

  it("continues past per-slug create failures and records them", async () => {
    mockRows = [integrationRow({})];
    slugsByProvider = {
      stripe: ["BAD_SLUG_404", "STRIPE_CHARGE_FAILED_TRIGGER"],
    };
    // createTriggerInstance retries once without triggerConfig, so the bad
    // slug rejects twice before the good slug succeeds.
    mockCreateTrigger
      .mockRejectedValueOnce(new Error("Trigger type not found"))
      .mockRejectedValueOnce(new Error("Trigger type not found"))
      .mockResolvedValueOnce({ triggerId: "t-good" });

    const { runTriggerReconciliation } = await import("./trigger-reconciliation");
    const result = await runTriggerReconciliation();

    expect(result.triggersCreated).toBe(1);
    expect(result.failures).toEqual([
      {
        workspaceId: "ws-1",
        provider: "stripe",
        detail: "create BAD_SLUG_404",
        error: "Trigger type not found",
      },
    ]);
    expect(configUpdates).toEqual([
      { id: "int-1", captureTriggerIds: ["t-good"] },
    ]);
  });

  it("paginates through all trigger instance pages", async () => {
    mockRows = [];
    mockListActive
      .mockResolvedValueOnce({
        items: [
          { id: "a", connectedAccountId: "conn-x", triggerName: "T1" },
        ],
        nextCursor: "cursor-2",
      })
      .mockResolvedValueOnce({
        items: [
          { id: "b", connectedAccountId: "conn-y", triggerName: "T2" },
        ],
        nextCursor: null,
      });

    const { runTriggerReconciliation } = await import("./trigger-reconciliation");
    const result = await runTriggerReconciliation();

    expect(mockListActive).toHaveBeenCalledTimes(2);
    expect(mockListActive).toHaveBeenLastCalledWith({
      limit: 100,
      cursor: "cursor-2",
    });
    expect(result.instancesSeen).toBe(2);
    // No integration rows at all — both instances are orphans.
    expect(result.orphansDeleted).toBe(2);
  });
});
