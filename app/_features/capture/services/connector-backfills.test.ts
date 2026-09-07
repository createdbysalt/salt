import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/app/_lib/composio/connections", () => ({
  getConnectionStatusAdmin: vi.fn(),
}));
vi.mock("@/app/_lib/composio/actions", () => ({
  executeComposioAction: vi.fn(),
}));
vi.mock("@/app/_features/memory/records", () => ({ resolvePerson: vi.fn() }));
vi.mock("./ingest-envelope", () => ({ ingestEnvelope: vi.fn() }));
vi.mock("./cal-booking-processor", () => ({ processCalBookings: vi.fn() }));

const produceBillingRecordSignalsMock = vi.fn(
  async (_input: unknown) => ({ matched: false, writes: 0 }),
);
vi.mock("./producers/billing-record-producer", () => ({
  produceBillingRecordSignals: (input: unknown) =>
    produceBillingRecordSignalsMock(input),
}));

const integrationUpdates: Array<Record<string, unknown>> = [];
vi.mock("@/app/_lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table !== "workspace_integrations") {
        throw new Error(`unexpected table ${table}`);
      }
      return {
        update: (row: Record<string, unknown>) => {
          integrationUpdates.push(row);
          return { eq: async () => ({ error: null }) };
        },
      };
    },
  }),
}));

const producePersonFieldSignalsMock = vi.fn(
  async (_input: unknown) => ({ dispatched: [], addressWrites: 0 }),
);
vi.mock("./producers/person-field-producer", () => ({
  producePersonFieldSignals: (input: unknown) =>
    producePersonFieldSignalsMock(input),
}));

const producePersonTagFitsMock = vi.fn(
  async (_input: unknown) => ({ assigned: [] }),
);
vi.mock("./producers/person-tag-fit-producer", () => ({
  producePersonTagFits: (input: unknown) => producePersonTagFitsMock(input),
}));

const getCategoryAdapterMock = vi.fn(async (_provider: string) => null as unknown);
const hasHandWrittenParsingMock = vi.fn((_provider: string) => true);
vi.mock("../adapters/categories", () => ({
  getCategoryAdapter: (provider: string) => getCategoryAdapterMock(provider),
  hasHandWrittenParsing: (provider: string) =>
    hasHandWrittenParsingMock(provider),
}));

const absorbInferredSignalsMock = vi.fn(
  async (
    _workspaceId: string,
    _envelopes: CaptureEnvelope[],
    _context: { userEmail: string | null; customizeContext?: string | null },
    _llmCall: unknown,
  ) => ({ contactsProposed: 0 }),
);
vi.mock("./generic-signal-extractor", () => ({
  absorbInferredSignals: (...args: unknown[]) =>
    absorbInferredSignalsMock(
      ...(args as Parameters<typeof absorbInferredSignalsMock>),
    ),
}));

const getCustomizePromptBlockMock = vi.fn(
  async (_workspaceId: string, _types?: readonly string[]) =>
    null as string | null,
);
vi.mock("@/app/_features/memory/customize/queries", () => ({
  getCustomizePromptBlock: (...args: unknown[]) =>
    getCustomizePromptBlockMock(
      ...(args as Parameters<typeof getCustomizePromptBlockMock>),
    ),
}));

import {
  unwrapItems,
  backfillDropboxCaptures,
  backfillStripeCaptures,
} from "./connector-backfills";
import { getConnectionStatusAdmin } from "@/app/_lib/composio/connections";
import { executeComposioAction } from "@/app/_lib/composio/actions";
import { ingestEnvelope } from "./ingest-envelope";
import { resolvePerson } from "@/app/_features/memory/records";
import type { CaptureEnvelope } from "../adapters/types";

/**
 * Golden contracts for the list shapes Composio tools actually return —
 * each case below mirrors a live execution against staging (2026-08-06),
 * post-executor (Composio's outer envelope already stripped).
 */
describe("unwrapItems", () => {
  it("passes arrays through", () => {
    expect(unwrapItems([{ id: 1 }])).toEqual([{ id: 1 }]);
  });

  it("unwraps Calendly { collection } lists", () => {
    const rows = [{ uri: "https://api.calendly.com/scheduled_events/x" }];
    expect(unwrapItems({ collection: rows, pagination: {} })).toEqual(rows);
  });

  it("unwraps Dropbox { entries } lists", () => {
    const rows = [{ ".tag": "file", name: "brief.pdf" }];
    expect(unwrapItems({ entries: rows, cursor: "c", has_more: false })).toEqual(rows);
  });

  it("unwraps Cal.com v2 { data: { bookings } } (CAL_FETCH_ALL_BOOKINGS)", () => {
    const rows = [{ uid: "bk_1", title: "Intro call" }];
    expect(
      unwrapItems({
        data: { bookings: rows, hasMore: false, nextCursor: null, totalCount: 1 },
        status: "success",
      }),
    ).toEqual(rows);
  });

  it("unwraps Microsoft Graph { response_data: { value } } (Outlook lists)", () => {
    const rows = [{ id: "msg_1", subject: "Invoice attached" }];
    expect(
      unwrapItems({
        response_data: { "@odata.context": "…/messages", value: rows },
      }),
    ).toEqual(rows);
  });

  it("unwraps Stripe-style double nesting { data: { data } }", () => {
    const rows = [{ id: "in_1" }];
    expect(unwrapItems({ data: { data: rows, has_more: false } })).toEqual(rows);
  });

  it("returns empty for empty or unrecognized shapes", () => {
    expect(unwrapItems({ entries: [], has_more: false })).toEqual([]);
    expect(unwrapItems({ resource: { uri: "not-a-list" } })).toEqual([]);
    expect(unwrapItems(null)).toEqual([]);
  });
});

/**
 * Long-tail LLM supplement (Sources plan 5.4): providers without hand-written
 * parsing get absorbInferredSignals on newly-created envelopes only.
 */
describe("backfill LLM signal supplement", () => {
  const stubAdapter = {
    sourceType: "dropbox",
    toolkit: "dropbox",
    triggerSlugs: [],
    deriveSignals: () => new Map(),
    normalize(row: unknown): CaptureEnvelope | null {
      const record = row as { id?: string; email?: string };
      if (!record.id) return null;
      return {
        sourceType: "dropbox",
        captureType: "file",
        externalId: record.id,
        title: record.id,
        occurredAt: "2026-08-08T00:00:00Z",
        participants: record.email
          ? [{ email: record.email, name: null, role: "from" as const }]
          : [],
        threadId: null,
        extracted: {},
        raw: {},
        noise: null,
      };
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    hasHandWrittenParsingMock.mockReturnValue(true);
    getCategoryAdapterMock.mockResolvedValue(stubAdapter);
    vi.mocked(getConnectionStatusAdmin).mockResolvedValue({
      connected: true,
      composioConnectionId: "conn-1",
      integrationId: "int-1",
      email: "me@usesalt.io",
    } as never);
    vi.mocked(executeComposioAction).mockResolvedValue({
      entries: [
        {
          ".tag": "file",
          id: "new-1",
          email: "new@client.co",
          server_modified: new Date().toISOString(),
        },
        {
          ".tag": "file",
          id: "dupe-1",
          email: "dupe@client.co",
          server_modified: new Date().toISOString(),
        },
      ],
    } as never);
    vi.mocked(ingestEnvelope).mockImplementation(async (_ws, _int, envelope) => {
      return {
        outcome: envelope.externalId === "new-1" ? "created" : "duplicate",
      } as never;
    });
  });

  it("extracts LLM signals from newly-created envelopes only (not dupes)", async () => {
    hasHandWrittenParsingMock.mockReturnValue(false);
    const llmCall = vi.fn(async () => "{}");

    await backfillDropboxCaptures("ws-1", { llmCall });

    expect(absorbInferredSignalsMock).toHaveBeenCalledTimes(1);
    const [, envelopes, context, call] = absorbInferredSignalsMock.mock.calls[0];
    expect(envelopes.map((e) => e.externalId)).toEqual(["new-1"]);
    expect(context).toEqual({ userEmail: "me@usesalt.io", customizeContext: null });
    expect(call).toBe(llmCall);
  });

  it("Track A (M4): the workspace's person/work customizations ride the extraction", async () => {
    hasHandWrittenParsingMock.mockReturnValue(false);
    getCustomizePromptBlockMock.mockResolvedValue(
      '<workspace-customizations>\n- "x"\n</workspace-customizations>',
    );
    const llmCall = vi.fn(async () => "{}");

    await backfillDropboxCaptures("ws-1", { llmCall });

    expect(getCustomizePromptBlockMock).toHaveBeenCalledWith("ws-1", [
      "person",
      "work",
    ]);
    const [, , context] = absorbInferredSignalsMock.mock.calls[0];
    expect(context.customizeContext).toContain("workspace-customizations");
  });

  it("skips the LLM supplement for hand-written providers", async () => {
    hasHandWrittenParsingMock.mockReturnValue(true);

    await backfillDropboxCaptures("ws-1", { llmCall: vi.fn(async () => "{}") });

    expect(absorbInferredSignalsMock).not.toHaveBeenCalled();
  });

  it("skips the LLM supplement when no llmCall is provided", async () => {
    hasHandWrittenParsingMock.mockReturnValue(false);

    await backfillDropboxCaptures("ws-1");

    expect(absorbInferredSignalsMock).not.toHaveBeenCalled();
  });
});

/**
 * Field-signal absorption (registry-wiring Phase 4): adapters that derive
 * person FIELD values hand them to the person-field producer after the
 * contact resolves to a person record.
 */
describe("backfill field-signal absorption", () => {
  const stubAdapter = {
    sourceType: "dropbox",
    toolkit: "dropbox",
    triggerSlugs: [],
    deriveSignals: () => new Map(),
    deriveFieldSignals: () =>
      new Map([
        [
          "jane@acme.com",
          { signalValues: { person_phone_extracted: "+1 415 555 0100" } },
        ],
      ]),
    normalize(row: unknown): CaptureEnvelope | null {
      const record = row as { id?: string; email?: string };
      if (!record.id) return null;
      return {
        sourceType: "dropbox",
        captureType: "file",
        externalId: record.id,
        title: record.id,
        occurredAt: "2026-08-08T00:00:00Z",
        participants: record.email
          ? [{ email: record.email, name: null, role: "from" as const }]
          : [],
        threadId: null,
        extracted: {},
        raw: {},
        noise: null,
      };
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    hasHandWrittenParsingMock.mockReturnValue(true);
    getCategoryAdapterMock.mockResolvedValue(stubAdapter);
    vi.mocked(getConnectionStatusAdmin).mockResolvedValue({
      connected: true,
      composioConnectionId: "conn-1",
      integrationId: "int-1",
      email: "me@usesalt.io",
    } as never);
    vi.mocked(executeComposioAction).mockResolvedValue({
      entries: [
        {
          ".tag": "file",
          id: "new-1",
          email: "jane@acme.com",
          server_modified: new Date().toISOString(),
        },
      ],
    } as never);
    vi.mocked(ingestEnvelope).mockImplementation(
      async () => ({ outcome: "created" }) as never,
    );
  });

  it("resolves the contact and produces person field signals", async () => {
    vi.mocked(resolvePerson).mockResolvedValue({
      resolved: true,
      person_id: "person-1",
      is_new: false,
      confidence: 90,
      confidence_reason: "exact email match",
      needs_confirmation: false,
    });

    await backfillDropboxCaptures("ws-1");

    expect(resolvePerson).toHaveBeenCalledWith(
      "ws-1",
      expect.objectContaining({ email: "jane@acme.com" }),
    );
    expect(producePersonFieldSignalsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: "ws-1",
        personId: "person-1",
        source: "dropbox",
        fields: expect.objectContaining({
          signalValues: { person_phone_extracted: "+1 415 555 0100" },
        }),
      }),
    );
    expect(producePersonTagFitsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: "ws-1",
        personId: "person-1",
        source: "dropbox",
      }),
    );
  });

  it("skips production when the contact does not resolve to a person", async () => {
    vi.mocked(resolvePerson).mockResolvedValue({
      resolved: false,
      is_new: false,
      confidence: 0,
      confidence_reason: "insufficient signals",
      needs_confirmation: true,
    });

    await backfillDropboxCaptures("ws-1");

    expect(producePersonFieldSignalsMock).not.toHaveBeenCalled();
  });
});

/**
 * Stripe history paging + sync stamping (billing intake repair): invoices
 * page via starting_after until has_more is false or the run cap hits, and
 * every successful backfill stamps workspace_integrations.last_synced_at.
 */
describe("backfillStripeCaptures paging and sync stamp", () => {
  const stripeAdapter = {
    sourceType: "stripe",
    toolkit: "stripe",
    triggerSlugs: [],
    deriveSignals: () => new Map(),
    normalize(row: unknown): CaptureEnvelope | null {
      const record = row as { id?: string };
      if (!record.id) return null;
      return {
        sourceType: "stripe",
        captureType: "payment",
        externalId: record.id,
        title: `Invoice ${record.id}`,
        occurredAt: "2026-08-08T00:00:00Z",
        participants: [],
        threadId: null,
        extracted: {},
        raw: {},
        noise: null,
      };
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    integrationUpdates.length = 0;
    hasHandWrittenParsingMock.mockReturnValue(true);
    getCategoryAdapterMock.mockResolvedValue(stripeAdapter);
    vi.mocked(getConnectionStatusAdmin).mockResolvedValue({
      connected: true,
      composioConnectionId: "conn-1",
      integrationId: "int-1",
      email: "me@usesalt.io",
    } as never);
    vi.mocked(ingestEnvelope).mockImplementation(
      async () => ({ outcome: "created" }) as never,
    );
  });

  it("pages invoices with starting_after until has_more is false", async () => {
    vi.mocked(executeComposioAction).mockImplementation(async (slug, params) => {
      if (slug === "STRIPE_LIST_INVOICES") {
        const p = params as { starting_after?: string };
        if (!p.starting_after) {
          return { data: { data: [{ id: "in_1" }, { id: "in_2" }], has_more: true } } as never;
        }
        return { data: { data: [{ id: "in_3" }], has_more: false } } as never;
      }
      return { data: { data: [], has_more: false } } as never;
    });

    const result = await backfillStripeCaptures("ws-1", { limit: 100 });

    expect(result.success).toBe(true);
    expect(result.capturesCreated).toBe(3);
    const invoiceCalls = vi
      .mocked(executeComposioAction)
      .mock.calls.filter(([slug]) => slug === "STRIPE_LIST_INVOICES");
    expect(invoiceCalls).toHaveLength(2);
    expect(invoiceCalls[1][1]).toEqual(
      expect.objectContaining({ starting_after: "in_2" }),
    );
  });

  it("respects the run cap — a single small page never follows has_more", async () => {
    vi.mocked(executeComposioAction).mockImplementation(async (slug) => {
      if (slug === "STRIPE_LIST_INVOICES") {
        return {
          data: { data: [{ id: "in_1" }, { id: "in_2" }], has_more: true },
        } as never;
      }
      return { data: { data: [], has_more: false } } as never;
    });

    const result = await backfillStripeCaptures("ws-1", { limit: 2 });

    expect(result.capturesCreated).toBe(2);
    const invoiceCalls = vi
      .mocked(executeComposioAction)
      .mock.calls.filter(([slug]) => slug === "STRIPE_LIST_INVOICES");
    expect(invoiceCalls).toHaveLength(1);
  });

  it("stamps workspace_integrations.last_synced_at on a successful run", async () => {
    vi.mocked(executeComposioAction).mockResolvedValue({
      data: { data: [{ id: "in_1" }], has_more: false },
    } as never);

    await backfillStripeCaptures("ws-1");

    expect(integrationUpdates).toHaveLength(1);
    expect(integrationUpdates[0]).toEqual({
      last_synced_at: expect.any(String),
    });
  });

  it("stamps last_synced_at even when every row is a duplicate", async () => {
    vi.mocked(executeComposioAction).mockResolvedValue({
      data: { data: [{ id: "in_1" }], has_more: false },
    } as never);
    vi.mocked(ingestEnvelope).mockImplementation(
      async () => ({ outcome: "duplicate" }) as never,
    );

    const result = await backfillStripeCaptures("ws-1");

    expect(result.success).toBe(true);
    expect(result.capturesCreated).toBe(0);
    expect(integrationUpdates).toHaveLength(1);
  });

  it("does not stamp when the fetch fails", async () => {
    vi.mocked(executeComposioAction).mockRejectedValue(new Error("composio down"));

    const result = await backfillStripeCaptures("ws-1");

    expect(result.success).toBe(false);
    expect(integrationUpdates).toHaveLength(0);
  });
});
