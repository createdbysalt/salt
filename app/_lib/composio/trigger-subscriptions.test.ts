import { describe, it, expect, vi, beforeEach } from "vitest";

const mockCreateTrigger = vi.fn();
const mockDeleteTrigger = vi.fn();

vi.mock("./client", () => ({
  getComposioClient: () => ({
    triggers: {
      create: (...args: unknown[]) => mockCreateTrigger(...args),
      delete: (...args: unknown[]) => mockDeleteTrigger(...args),
    },
  }),
}));

let triggerTypeRows: Array<Record<string, unknown>> = [];
let triggerTypeError: { message: string } | null = null;
let integrationRow: Record<string, unknown> | null = null;
const configUpdates: Array<unknown> = [];

vi.mock("@/app/_lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === "connector_trigger_types") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                eq: () =>
                  Promise.resolve({ data: triggerTypeRows, error: triggerTypeError }),
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
            return { eq: () => Promise.resolve({ error: null }) };
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
} from "./trigger-subscriptions";

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
  adapterForToolkitMock.mockReturnValue({
    sourceType: "gmail",
    triggerSlugs: ["GMAIL_NEW_GMAIL_MESSAGE"],
  });
  mockCreateTrigger.mockResolvedValue({ triggerId: "t-1" });
  mockDeleteTrigger.mockResolvedValue({});
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

    expect(specs).toEqual([
      { slug: "STRIPE_CHARGE_FAILED_TRIGGER", config: null },
    ]);
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
    expect(mockCreateTrigger).toHaveBeenCalledWith(
      "ws-1",
      "GMAIL_NEW_GMAIL_MESSAGE",
      {
        connectedAccountId: "conn-1",
        triggerConfig: {
          interval: 1,
          query: "{label:inbox label:sent} -category:promotions",
        },
      },
    );
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
      .mockRejectedValueOnce(new Error("unknown config key: interval"))
      .mockResolvedValueOnce({ triggerId: "t-2" });

    const result = await enableCaptureTriggers("ws-1", "slack");

    expect(result).toEqual({ ok: true, created: ["t-2"] });
    expect(mockCreateTrigger).toHaveBeenLastCalledWith(
      "ws-1",
      "SLACK_CHANNEL_MESSAGE_RECEIVED",
      {
        connectedAccountId: "conn-1",
        triggerConfig: { is_bot_message: false },
      },
    );
  });

  it("rolls back created triggers when a later slug fails", async () => {
    triggerTypeRows = [
      { trigger_slug: "STRIPE_SUBSCRIPTION_ADDED_TRIGGER", capture_trigger_config: null },
      { trigger_slug: "STRIPE_CHARGE_FAILED_TRIGGER", capture_trigger_config: null },
    ];
    adapterForToolkitMock.mockReturnValue({
      sourceType: "stripe",
      triggerSlugs: [
        "STRIPE_SUBSCRIPTION_ADDED_TRIGGER",
        "STRIPE_CHARGE_FAILED_TRIGGER",
      ],
    });
    mockCreateTrigger
      .mockResolvedValueOnce({ triggerId: "t-created" })
      // both ladder rungs for the second slug reject (config-less spec: 2 tries)
      .mockRejectedValueOnce(new Error("boom"))
      .mockRejectedValueOnce(new Error("boom"));

    const result = await enableCaptureTriggers("ws-1", "stripe");

    expect(result.ok).toBe(false);
    expect(mockDeleteTrigger).toHaveBeenCalledWith("t-created");
  });
});
