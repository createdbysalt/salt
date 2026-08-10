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

let specsByProvider: Record<
  string,
  Array<{ slug: string; config: Record<string, unknown> | null }>
> = {};

vi.mock("./trigger-subscriptions", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("./trigger-subscriptions")>();
  return {
    ...actual,
    getCaptureTriggerSpecs: vi.fn(
      async (provider: string) => specsByProvider[provider] ?? [],
    ),
  };
});

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
    specsByProvider = {};
    mockListActive.mockResolvedValue({ items: [], nextCursor: null });
    mockDeleteTrigger.mockResolvedValue({});
  });

  it("creates missing subscriptions and persists trigger IDs", async () => {
    mockRows = [integrationRow({})];
    specsByProvider = {
      stripe: [
        { slug: "STRIPE_INVOICE_PAYMENT_SUCCEEDED_TRIGGER", config: null },
        { slug: "STRIPE_CHARGE_FAILED_TRIGGER", config: null },
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

  it("passes Salt-curated upstream filter config when creating subscriptions", async () => {
    mockRows = [integrationRow({ provider: "slack", composio_connection_id: "conn-s" })];
    specsByProvider = {
      slack: [
        {
          slug: "SLACK_CHANNEL_MESSAGE_RECEIVED",
          config: { is_bot_message: false },
        },
      ],
    };
    mockCreateTrigger.mockResolvedValueOnce({ triggerId: "t-slack" });

    const { runTriggerReconciliation } = await import("./trigger-reconciliation");
    const result = await runTriggerReconciliation();

    expect(result.triggersCreated).toBe(1);
    expect(mockCreateTrigger).toHaveBeenCalledWith(
      "ws-1",
      "SLACK_CHANNEL_MESSAGE_RECEIVED",
      {
        connectedAccountId: "conn-s",
        triggerConfig: { interval: 1, is_bot_message: false },
      },
    );
  });

  it("keeps the filter config when the interval rung is rejected", async () => {
    mockRows = [integrationRow({ provider: "slack", composio_connection_id: "conn-s" })];
    specsByProvider = {
      slack: [
        {
          slug: "SLACK_CHANNEL_MESSAGE_RECEIVED",
          config: { is_bot_message: false },
        },
      ],
    };
    // Webhook triggers reject `interval` — the ladder must retry with the
    // filters intact rather than dropping to an unfiltered subscription.
    mockCreateTrigger
      .mockRejectedValueOnce(
        Object.assign(new Error("unknown config key: interval"), { status: 400 }),
      )
      .mockResolvedValueOnce({ triggerId: "t-slack" });

    const { runTriggerReconciliation } = await import("./trigger-reconciliation");
    const result = await runTriggerReconciliation();

    expect(result.triggersCreated).toBe(1);
    expect(mockCreateTrigger).toHaveBeenLastCalledWith(
      "ws-1",
      "SLACK_CHANNEL_MESSAGE_RECEIVED",
      {
        connectedAccountId: "conn-s",
        triggerConfig: { is_bot_message: false },
      },
    );
  });

  it("deletes orphaned instances whose account matches no integration row", async () => {
    mockRows = [integrationRow({ composio_connection_id: "conn-current" })];
    specsByProvider = { stripe: [] };
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
    specsByProvider = {
      gmail: [{ slug: "GMAIL_NEW_GMAIL_MESSAGE", config: null }],
    };
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
    specsByProvider = {
      stripe: [{ slug: "STRIPE_CHARGE_FAILED_TRIGGER", config: null }],
    };
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
    specsByProvider = {
      stripe: [
        { slug: "BAD_SLUG_404", config: null },
        { slug: "STRIPE_CHARGE_FAILED_TRIGGER", config: null },
      ],
    };
    // A dead slug throws the SDK's typed not-found error (no `status`), which
    // fails the ladder fast (3.7) — one attempt, then the good slug succeeds.
    mockCreateTrigger
      .mockRejectedValueOnce(
        Object.assign(new Error("Trigger type not found"), { statusCode: 400 }),
      )
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
