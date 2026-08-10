import { beforeEach, describe, expect, it, vi } from "vitest";
import { schemaHash } from "./catalog-sync-hash";

describe("schema hash (drift comparison)", () => {
  it("is stable across key ordering", () => {
    const a = schemaHash({ b: 1, a: { d: 2, c: 3 } }, null);
    const b = schemaHash({ a: { c: 3, d: 2 }, b: 1 }, null);
    expect(a).toBe(b);
  });

  it("changes when a schema field changes", () => {
    const a = schemaHash({ properties: { q: { type: "string" } } }, null);
    const b = schemaHash({ properties: { q: { type: "number" } } }, null);
    expect(a).not.toBe(b);
  });

  it("distinguishes input changes from output changes", () => {
    const a = schemaHash({ x: 1 }, { y: 2 });
    const b = schemaHash({ x: 1 }, { y: 3 });
    expect(a).not.toBe(b);
  });
});

// ============================================================================
// runCatalogSync — trigger-schema drift watch (Sources plan 5.8)
// ============================================================================

const mockListTriggerTypes = vi.fn();

vi.mock("./client", () => ({
  getComposioClient: () => ({
    toolkits: { get: async () => ({ name: "Gmail", meta: {} }) },
    tools: { getRawComposioTools: async () => [] },
    triggers: { listTypes: (...args: unknown[]) => mockListTriggerTypes(...args) },
  }),
}));

vi.mock("./classification-store", () => ({
  invalidateClassificationCache: () => {},
}));

let triggerTypeRows: Array<Record<string, unknown>> = [];
const triggerUpserts: Array<Record<string, unknown>> = [];
const syncEventInserts: Array<Record<string, unknown>> = [];

vi.mock("@/app/_lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === "connector_catalog") {
        return {
          select: () =>
            Promise.resolve({
              data: [
                {
                  provider_key: "gmail",
                  toolkit_slug: "gmail",
                  name: "Gmail",
                  description: "Email",
                  meta: {},
                },
              ],
              error: null,
            }),
          update: () => ({ eq: () => Promise.resolve({ error: null }) }),
        };
      }
      if (table === "connector_overrides") {
        return {
          select: () =>
            Promise.resolve({
              data: [{ provider_key: "gmail", tier: "capture" }],
              error: null,
            }),
        };
      }
      if (table === "connector_tools") {
        return {
          select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }),
        };
      }
      if (table === "connector_trigger_types") {
        return {
          select: () => ({
            eq: () => Promise.resolve({ data: triggerTypeRows, error: null }),
          }),
          upsert: (payload: Record<string, unknown>) => {
            triggerUpserts.push(payload);
            return Promise.resolve({ error: null });
          },
          update: () => ({ eq: () => Promise.resolve({ error: null }) }),
        };
      }
      if (table === "connector_sync_events") {
        return {
          insert: (payload: Array<Record<string, unknown>>) => {
            syncEventInserts.push(...payload);
            return Promise.resolve({ error: null });
          },
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  }),
}));

import { runCatalogSync } from "./catalog-sync";

const STORED_GMAIL_PAYLOAD = {
  type: "object",
  properties: { subject: { type: "string" }, sender: { type: "string" } },
};

beforeEach(() => {
  vi.clearAllMocks();
  triggerUpserts.length = 0;
  syncEventInserts.length = 0;
  triggerTypeRows = [
    {
      trigger_slug: "GMAIL_NEW_GMAIL_MESSAGE",
      sync_status: "active",
      payload_schema: STORED_GMAIL_PAYLOAD,
      config_schema: null,
      enabled_for_capture: true,
    },
  ];
  mockListTriggerTypes.mockResolvedValue({
    items: [
      {
        slug: "GMAIL_NEW_GMAIL_MESSAGE",
        name: "New Gmail Message",
        type: "polling",
        payload: STORED_GMAIL_PAYLOAD,
        config: null,
      },
    ],
  });
});

describe("runCatalogSync trigger-schema drift watch (5.8)", () => {
  it("stays silent when the upstream schema matches the stored one", async () => {
    const result = await runCatalogSync();

    expect(result.events).toEqual([]);
    expect(triggerUpserts[0]).toMatchObject({
      trigger_slug: "GMAIL_NEW_GMAIL_MESSAGE",
      sync_status: "active",
    });
    expect(syncEventInserts).toEqual([]);
  });

  it("ignores jsonb key-ordering differences (no false drift)", async () => {
    mockListTriggerTypes.mockResolvedValue({
      items: [
        {
          slug: "GMAIL_NEW_GMAIL_MESSAGE",
          name: "New Gmail Message",
          payload: {
            properties: {
              sender: { type: "string" },
              subject: { type: "string" },
            },
            type: "object",
          },
        },
      ],
    });

    const result = await runCatalogSync();

    expect(result.events).toEqual([]);
    expect(triggerUpserts[0].sync_status).toBe("active");
  });

  it("alerts with enabledForCapture when a subscribed trigger's payload schema drifts", async () => {
    mockListTriggerTypes.mockResolvedValue({
      items: [
        {
          slug: "GMAIL_NEW_GMAIL_MESSAGE",
          name: "New Gmail Message",
          payload: {
            type: "object",
            properties: {
              subject: { type: "string" },
              sender: { type: "string" },
              thread_id: { type: "string" },
            },
          },
        },
      ],
    });

    const result = await runCatalogSync();

    expect(result.events).toEqual([
      {
        kind: "trigger_schema_changed",
        subjectSlug: "GMAIL_NEW_GMAIL_MESSAGE",
        detail: { enabledForCapture: true, changedFields: ["payload_schema"] },
      },
    ]);
    expect(triggerUpserts[0].sync_status).toBe("changed");
    expect(syncEventInserts).toContainEqual(
      expect.objectContaining({
        kind: "trigger_schema_changed",
        subject_slug: "GMAIL_NEW_GMAIL_MESSAGE",
      }),
    );
  });

  it("flags config-schema drift on a non-capture trigger as not capture-enabled", async () => {
    triggerTypeRows = [
      {
        trigger_slug: "GMAIL_NEW_GMAIL_MESSAGE",
        sync_status: "active",
        payload_schema: STORED_GMAIL_PAYLOAD,
        config_schema: { properties: { interval: { type: "number" } } },
        enabled_for_capture: false,
      },
    ];
    mockListTriggerTypes.mockResolvedValue({
      items: [
        {
          slug: "GMAIL_NEW_GMAIL_MESSAGE",
          name: "New Gmail Message",
          payload: STORED_GMAIL_PAYLOAD,
          config: { properties: { interval: { type: "string" } } },
        },
      ],
    });

    const result = await runCatalogSync();

    expect(result.events).toEqual([
      {
        kind: "trigger_schema_changed",
        subjectSlug: "GMAIL_NEW_GMAIL_MESSAGE",
        detail: { enabledForCapture: false, changedFields: ["config_schema"] },
      },
    ]);
  });

  it("treats a never-seen trigger as added, not changed", async () => {
    triggerTypeRows = [];

    const result = await runCatalogSync();

    expect(result.events).toEqual([
      { kind: "trigger_added", subjectSlug: "GMAIL_NEW_GMAIL_MESSAGE" },
    ]);
    expect(triggerUpserts[0].sync_status).toBe("active");
  });
});
