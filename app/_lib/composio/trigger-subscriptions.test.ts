import { describe, it, expect, vi, beforeEach } from "vitest";

const mockCreateTrigger = vi.fn();
const mockDeleteTrigger = vi.fn();
const mockListActive = vi.fn();

vi.mock("./client", () => ({
  getComposioClient: () => ({
    triggers: {
      create: (...args: unknown[]) => mockCreateTrigger(...args),
      delete: (...args: unknown[]) => mockDeleteTrigger(...args),
      listActive: (...args: unknown[]) => mockListActive(...args),
    },
  }),
}));

let triggerTypeRows: Array<Record<string, unknown>> = [];
let triggerTypeError: { message: string } | null = null;
let integrationRow: Record<string, unknown> | null = null;
const configUpdates: Array<unknown> = [];
const syncEventInserts: Array<Record<string, unknown>> = [];
let recentSyncEvents: Array<Record<string, unknown>> = [];

vi.mock("@/app/_lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === "connector_trigger_types") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                eq: () => Promise.resolve({ data: triggerTypeRows, error: triggerTypeError }),
              }),
            }),
          }),
        };
      }
      if (table === "workspace_integrations") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({ data: integrationRow }),
              }),
            }),
          }),
          update: (payload: unknown) => {
            configUpdates.push(payload);
            // Apply the write so sequential reads see it, like the real DB.
            if (
              integrationRow &&
              typeof payload === "object" &&
              payload !== null &&
              "config" in payload
            ) {
              integrationRow = {
                ...integrationRow,
                config: (payload as { config: unknown }).config,
              };
            }
            return { eq: () => Promise.resolve({ error: null }) };
          },
        };
      }
      if (table === "connector_sync_events") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                eq: () => ({
                  eq: () => ({
                    gte: () => ({
                      limit: () => Promise.resolve({ data: recentSyncEvents, error: null }),
                    }),
                  }),
                }),
              }),
            }),
          }),
          insert: (payload: Record<string, unknown>) => {
            syncEventInserts.push(payload);
            return Promise.resolve({ error: null });
          },
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  }),
}));

const adapterForToolkitMock = vi.fn();
vi.mock("@/app/_features/capture/adapters/registry", () => ({
  adapterForToolkit: (provider: string) => adapterForToolkitMock(provider),
}));

import {
  enableCaptureTriggers,
  getCaptureTriggerSpecs,
  getCaptureTriggerSlugs,
  refreshCaptureTriggerConfigs,
  upsertCaptureTriggerConfig,
} from "./trigger-subscriptions";

/** Stainless APIError shape Composio returns when the upsert rejects triggerConfig. */
function configRejection(message: string): Error {
  return Object.assign(new Error(message), { status: 400 });
}

beforeEach(() => {
  vi.clearAllMocks();
  triggerTypeRows = [];
  triggerTypeError = null;
  integrationRow = {
    id: "int-1",
    composio_connection_id: "conn-1",
    config: {},
  };
  configUpdates.length = 0;
  syncEventInserts.length = 0;
  recentSyncEvents = [];
  adapterForToolkitMock.mockReturnValue({
    sourceType: "gmail",
    triggerSlugs: ["GMAIL_NEW_GMAIL_MESSAGE"],
  });
  mockCreateTrigger.mockResolvedValue({ triggerId: "t-1" });
  mockDeleteTrigger.mockResolvedValue({});
  mockListActive.mockResolvedValue({ items: [], nextCursor: null });
});

describe("getCaptureTriggerSpecs", () => {
  it("returns slugs with Salt-curated upstream filter config from the DB", async () => {
    triggerTypeRows = [
      {
        trigger_slug: "GMAIL_NEW_GMAIL_MESSAGE",
        capture_trigger_config: {
          query: "{label:inbox label:sent} -category:promotions",
        },
      },
    ];

    const specs = await getCaptureTriggerSpecs("gmail");

    expect(specs).toEqual([
      {
        slug: "GMAIL_NEW_GMAIL_MESSAGE",
        config: { query: "{label:inbox label:sent} -category:promotions" },
      },
    ]);
  });

  it("treats NULL config as no filters", async () => {
    triggerTypeRows = [
      { trigger_slug: "STRIPE_CHARGE_FAILED_TRIGGER", capture_trigger_config: null },
    ];

    const specs = await getCaptureTriggerSpecs("stripe");

    expect(specs).toEqual([{ slug: "STRIPE_CHARGE_FAILED_TRIGGER", config: null }]);
  });

  it("falls back to adapter slugs (unfiltered) when the DB lookup fails", async () => {
    triggerTypeError = { message: "connection refused" };

    const specs = await getCaptureTriggerSpecs("gmail");

    expect(specs).toEqual([{ slug: "GMAIL_NEW_GMAIL_MESSAGE", config: null }]);
  });

  it("getCaptureTriggerSlugs remains a slug-only view of the same source", async () => {
    triggerTypeRows = [
      { trigger_slug: "SLACK_CHANNEL_MESSAGE_RECEIVED", capture_trigger_config: null },
      { trigger_slug: "SLACK_DIRECT_MESSAGE_RECEIVED", capture_trigger_config: null },
    ];

    await expect(getCaptureTriggerSlugs("slack")).resolves.toEqual([
      "SLACK_CHANNEL_MESSAGE_RECEIVED",
      "SLACK_DIRECT_MESSAGE_RECEIVED",
    ]);
  });
});

describe("enableCaptureTriggers", () => {
  it("subscribes with interval + upstream filters merged", async () => {
    triggerTypeRows = [
      {
        trigger_slug: "GMAIL_NEW_GMAIL_MESSAGE",
        capture_trigger_config: {
          query: "{label:inbox label:sent} -category:promotions",
        },
      },
    ];

    const result = await enableCaptureTriggers("ws-1", "gmail");

    expect(result).toEqual({ ok: true, created: ["t-1"] });
    expect(mockCreateTrigger).toHaveBeenCalledWith("ws-1", "GMAIL_NEW_GMAIL_MESSAGE", {
      connectedAccountId: "conn-1",
      triggerConfig: {
        interval: 1,
        query: "{label:inbox label:sent} -category:promotions",
      },
    });
  });

  it("retries with filters intact when the interval rung is rejected", async () => {
    triggerTypeRows = [
      {
        trigger_slug: "SLACK_CHANNEL_MESSAGE_RECEIVED",
        capture_trigger_config: { is_bot_message: false },
      },
    ];
    adapterForToolkitMock.mockReturnValue({
      sourceType: "slack",
      triggerSlugs: ["SLACK_CHANNEL_MESSAGE_RECEIVED"],
    });
    mockCreateTrigger
      .mockRejectedValueOnce(configRejection("unknown config key: interval"))
      .mockResolvedValueOnce({ triggerId: "t-2" });

    const result = await enableCaptureTriggers("ws-1", "slack");

    expect(result).toEqual({ ok: true, created: ["t-2"] });
    expect(mockCreateTrigger).toHaveBeenLastCalledWith("ws-1", "SLACK_CHANNEL_MESSAGE_RECEIVED", {
      connectedAccountId: "conn-1",
      triggerConfig: { is_bot_message: false },
    });
  });

  it("rolls back created triggers when a later slug fails", async () => {
    triggerTypeRows = [
      { trigger_slug: "STRIPE_SUBSCRIPTION_ADDED_TRIGGER", capture_trigger_config: null },
      { trigger_slug: "STRIPE_CHARGE_FAILED_TRIGGER", capture_trigger_config: null },
    ];
    adapterForToolkitMock.mockReturnValue({
      sourceType: "stripe",
      triggerSlugs: ["STRIPE_SUBSCRIPTION_ADDED_TRIGGER", "STRIPE_CHARGE_FAILED_TRIGGER"],
    });
    mockCreateTrigger
      .mockResolvedValueOnce({ triggerId: "t-created" })
      // Non-400 failure on the second slug: the ladder fails fast (3.7).
      .mockRejectedValueOnce(new Error("boom"));

    const result = await enableCaptureTriggers("ws-1", "stripe");

    expect(result.ok).toBe(false);
    expect(mockDeleteTrigger).toHaveBeenCalledWith("t-created");
  });

  it("alerts when a filtered spec falls to an unfiltered subscription (3.2)", async () => {
    triggerTypeRows = [
      {
        trigger_slug: "GMAIL_NEW_GMAIL_MESSAGE",
        capture_trigger_config: { query: "label:inbox" },
      },
    ];
    mockCreateTrigger
      .mockRejectedValueOnce(configRejection("unknown config key: interval"))
      .mockRejectedValueOnce(configRejection("unknown config key: query"))
      .mockResolvedValueOnce({ triggerId: "t-bare" });

    const result = await enableCaptureTriggers("ws-1", "gmail");

    expect(result).toEqual({ ok: true, created: ["t-bare"] });
    expect(mockCreateTrigger).toHaveBeenLastCalledWith("ws-1", "GMAIL_NEW_GMAIL_MESSAGE", {
      connectedAccountId: "conn-1",
    });
    expect(syncEventInserts).toHaveLength(1);
    expect(syncEventInserts[0]).toMatchObject({
      kind: "sync_failed",
      subject_slug: "GMAIL_NEW_GMAIL_MESSAGE",
      detail: expect.objectContaining({
        stage: "trigger_filter_dropped",
        workspaceId: "ws-1",
      }),
    });
  });

  it("throttles the filter-dropped alert to one row per day", async () => {
    triggerTypeRows = [
      {
        trigger_slug: "GMAIL_NEW_GMAIL_MESSAGE",
        capture_trigger_config: { query: "label:inbox" },
      },
    ];
    recentSyncEvents = [{ id: "evt-1" }];
    mockCreateTrigger
      .mockRejectedValueOnce(configRejection("unknown config key: interval"))
      .mockRejectedValueOnce(configRejection("unknown config key: query"))
      .mockResolvedValueOnce({ triggerId: "t-bare" });

    const result = await enableCaptureTriggers("ws-1", "gmail");

    expect(result.ok).toBe(true);
    expect(syncEventInserts).toHaveLength(0);
  });

  it("fails fast on a non-400 error instead of climbing the ladder (3.7)", async () => {
    triggerTypeRows = [
      {
        trigger_slug: "GMAIL_NEW_GMAIL_MESSAGE",
        capture_trigger_config: { query: "label:inbox" },
      },
    ];
    // Transient/auth failures fail every rung identically — one attempt only.
    mockCreateTrigger.mockRejectedValueOnce(new Error("socket hangup"));

    const result = await enableCaptureTriggers("ws-1", "gmail");

    expect(result.ok).toBe(false);
    expect(mockCreateTrigger).toHaveBeenCalledTimes(1);
    // No filter-dropped alert: the filter was never rejected, the call was.
    expect(syncEventInserts).toHaveLength(0);
  });

  it("fails fast on a dead slug (typed SDK error shape, no `status`)", async () => {
    triggerTypeRows = [{ trigger_slug: "GMAIL_DEPRECATED_TRIGGER", capture_trigger_config: null }];
    // ComposioTriggerTypeNotFoundError carries statusCode, not status.
    mockCreateTrigger.mockRejectedValueOnce(
      Object.assign(new Error("Trigger type not found"), { statusCode: 400 })
    );

    const result = await enableCaptureTriggers("ws-1", "gmail");

    expect(result.ok).toBe(false);
    expect(mockCreateTrigger).toHaveBeenCalledTimes(1);
  });
});

describe("upsertCaptureTriggerConfig (4.2)", () => {
  const spec = {
    slug: "GMAIL_NEW_GMAIL_MESSAGE",
    config: { query: "label:inbox -category:promotions" },
  };

  function liveInstance(id: string, triggerName = "GMAIL_NEW_GMAIL_MESSAGE") {
    return { id, connectedAccountId: "conn-1", triggerName };
  }

  it("applies the new config in place via the upsert (no delete+recreate)", async () => {
    integrationRow = {
      id: "int-1",
      composio_connection_id: "conn-1",
      config: { captureTriggerIds: ["t-1"] },
    };
    mockListActive.mockResolvedValue({
      items: [liveInstance("t-1")],
      nextCursor: null,
    });

    const result = await upsertCaptureTriggerConfig("ws-1", "gmail", spec);

    expect(result.ok).toBe(true);
    expect(result.triggerId).toBe("t-1");
    // The upsert carries the new filter config...
    expect(mockCreateTrigger).toHaveBeenCalledWith(
      "ws-1",
      "GMAIL_NEW_GMAIL_MESSAGE",
      expect.objectContaining({
        connectedAccountId: "conn-1",
        triggerConfig: expect.objectContaining({ query: spec.config.query }),
      })
    );
    // ...the live instance is already the stored one: no delete, no rewrite.
    expect(mockDeleteTrigger).not.toHaveBeenCalled();
    expect(configUpdates).toHaveLength(0);
  });

  it("adopts a rotated trigger id and deletes the stale predecessor", async () => {
    integrationRow = {
      id: "int-1",
      composio_connection_id: "conn-1",
      config: { captureTriggerIds: ["t-old"] },
    };
    mockCreateTrigger.mockResolvedValueOnce({ triggerId: "t-new" });
    mockListActive.mockResolvedValue({
      items: [liveInstance("t-old"), liveInstance("t-new")],
      nextCursor: null,
    });

    const result = await upsertCaptureTriggerConfig("ws-1", "gmail", spec);

    expect(result.ok).toBe(true);
    expect(result.triggerId).toBe("t-new");
    expect(mockDeleteTrigger).toHaveBeenCalledWith("t-old");
    expect(result.removedStaleIds).toEqual(["t-old"]);
    expect(configUpdates).toHaveLength(1);
    expect(configUpdates[0]).toEqual({
      config: { captureTriggerIds: ["t-new"] },
    });
  });

  it("leaves other slugs' stored ids untouched while reconciling", async () => {
    integrationRow = {
      id: "int-1",
      composio_connection_id: "conn-1",
      config: { captureTriggerIds: ["t-other", "t-old"] },
    };
    mockCreateTrigger.mockResolvedValueOnce({ triggerId: "t-new" });
    mockListActive.mockResolvedValue({
      items: [
        liveInstance("t-old"),
        liveInstance("t-new"),
        // Different slug on the same account — never stale for this upsert.
        liveInstance("t-other", "GMAIL_LABEL_ADDED"),
      ],
      nextCursor: null,
    });

    const result = await upsertCaptureTriggerConfig("ws-1", "gmail", spec);

    expect(result.ok).toBe(true);
    expect(mockDeleteTrigger).toHaveBeenCalledTimes(1);
    expect(mockDeleteTrigger).toHaveBeenCalledWith("t-old");
    expect(configUpdates[0]).toEqual({
      config: { captureTriggerIds: ["t-other", "t-new"] },
    });
  });

  it("keeps a stale id stored when its delete fails so disable can retry", async () => {
    integrationRow = {
      id: "int-1",
      composio_connection_id: "conn-1",
      config: { captureTriggerIds: ["t-old"] },
    };
    mockCreateTrigger.mockResolvedValueOnce({ triggerId: "t-new" });
    mockListActive.mockResolvedValue({
      items: [liveInstance("t-old"), liveInstance("t-new")],
      nextCursor: null,
    });
    mockDeleteTrigger.mockRejectedValueOnce(new Error("delete failed"));

    const result = await upsertCaptureTriggerConfig("ws-1", "gmail", spec);

    expect(result.ok).toBe(true);
    expect(result.removedStaleIds).toEqual([]);
    expect(configUpdates[0]).toEqual({
      config: { captureTriggerIds: ["t-old", "t-new"] },
    });
  });

  it("still stores the fresh id when the live-instance listing fails", async () => {
    integrationRow = {
      id: "int-1",
      composio_connection_id: "conn-1",
      config: { captureTriggerIds: ["t-old"] },
    };
    mockCreateTrigger.mockResolvedValueOnce({ triggerId: "t-new" });
    mockListActive.mockRejectedValueOnce(new Error("listActive down"));

    const result = await upsertCaptureTriggerConfig("ws-1", "gmail", spec);

    expect(result.ok).toBe(true);
    expect(mockDeleteTrigger).not.toHaveBeenCalled();
    expect(configUpdates[0]).toEqual({
      config: { captureTriggerIds: ["t-old", "t-new"] },
    });
  });

  it("returns ok:false when the connection is missing", async () => {
    integrationRow = null;

    const result = await upsertCaptureTriggerConfig("ws-1", "gmail", spec);

    expect(result.ok).toBe(false);
    expect(result.error).toBe("Connection not found");
    expect(mockCreateTrigger).not.toHaveBeenCalled();
  });

  it("returns ok:false without touching state when the upsert throws", async () => {
    mockCreateTrigger.mockRejectedValueOnce(new Error("socket hangup"));

    const result = await upsertCaptureTriggerConfig("ws-1", "gmail", spec);

    expect(result.ok).toBe(false);
    expect(result.error).toBe("socket hangup");
    expect(mockDeleteTrigger).not.toHaveBeenCalled();
    expect(configUpdates).toHaveLength(0);
  });
});

describe("refreshCaptureTriggerConfigs (4.2)", () => {
  it("re-upserts every enabled spec with its current DB config", async () => {
    triggerTypeRows = [
      {
        trigger_slug: "GMAIL_NEW_GMAIL_MESSAGE",
        capture_trigger_config: { query: "label:inbox" },
      },
      { trigger_slug: "GMAIL_LABEL_ADDED", capture_trigger_config: null },
    ];
    integrationRow = {
      id: "int-1",
      composio_connection_id: "conn-1",
      config: {},
    };
    mockCreateTrigger
      .mockResolvedValueOnce({ triggerId: "t-1" })
      .mockResolvedValueOnce({ triggerId: "t-2" });

    const result = await refreshCaptureTriggerConfigs("ws-1", "gmail");

    expect(result.ok).toBe(true);
    expect(result.results).toEqual([
      { slug: "GMAIL_NEW_GMAIL_MESSAGE", triggerId: "t-1", error: undefined },
      { slug: "GMAIL_LABEL_ADDED", triggerId: "t-2", error: undefined },
    ]);
    // Each upsert re-reads config, so the second write builds on the first.
    expect(configUpdates[1]).toEqual({
      config: { captureTriggerIds: ["t-1", "t-2"] },
    });
  });

  it("isolates a per-slug failure instead of blocking the rest", async () => {
    triggerTypeRows = [
      { trigger_slug: "GMAIL_NEW_GMAIL_MESSAGE", capture_trigger_config: null },
      { trigger_slug: "GMAIL_LABEL_ADDED", capture_trigger_config: null },
    ];
    mockCreateTrigger
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce({ triggerId: "t-2" });

    const result = await refreshCaptureTriggerConfigs("ws-1", "gmail");

    expect(result.ok).toBe(false);
    expect(result.results[0].error).toBe("boom");
    expect(result.results[1].triggerId).toBe("t-2");
  });
});
