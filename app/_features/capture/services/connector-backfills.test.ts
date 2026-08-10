import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/app/_lib/composio/connections", () => ({
  getConnectionStatusAdmin: vi.fn(),
}));
vi.mock("@/app/_lib/composio/actions", () => ({
  executeComposioAction: vi.fn(),
}));
vi.mock("./system-plays", () => ({ resolvePerson: vi.fn() }));
vi.mock("./ingest-envelope", () => ({ ingestEnvelope: vi.fn() }));
vi.mock("./cal-booking-processor", () => ({ processCalBookings: vi.fn() }));

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

import { unwrapItems, backfillDropboxCaptures } from "./connector-backfills";
import { getConnectionStatusAdmin } from "@/app/_lib/composio/connections";
import { executeComposioAction } from "@/app/_lib/composio/actions";
import { ingestEnvelope } from "./ingest-envelope";
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
