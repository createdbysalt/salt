import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Inline backfill analysis (Sources plan 3.4, decision b): admitted captures
 * are analyzed on their transient full bodies during backfill, while only the
 * thin envelope is persisted. These tests pin the contract: owner-gated LLM
 * billing, hydration disabled (the body is already here), inbound-first
 * ordering under the per-run cap, and the body living only in the in-memory
 * row's extracted_data — never in raw_payload.
 */

const maybeSingle = vi.fn();
const limit = vi.fn(() => ({ maybeSingle }));
const eqRole = vi.fn(() => ({ limit }));
const eqWorkspace = vi.fn(() => ({ eq: eqRole }));
const select = vi.fn(() => ({ eq: eqWorkspace }));
const from = vi.fn(() => ({ select }));

vi.mock("@/app/_lib/supabase/admin", () => ({
  createAdminClient: () => ({ from }),
}));

const createLlmCallMock = vi.fn(
  (_workspaceId?: string, _userId?: string) => async () => "{}",
);
vi.mock("./capture-intelligence-cron", () => ({
  createLlmCall: (workspaceId: string, userId: string) =>
    createLlmCallMock(workspaceId, userId),
}));

const processCaptureForScanMock = vi.fn(
  async (_ctx?: unknown, _row?: unknown) => undefined,
);
const scanResult = {
  workspaceId: "ws-1",
  emailsProcessed: 0,
  findingsCreated: 0,
  peopleResolved: 0,
  fieldsApplied: 0,
  fieldsAccumulated: 0,
  errors: [] as string[],
};
const createScanPipelineContextMock = vi.fn(async (_options?: unknown) => ({
  result: scanResult,
}));
vi.mock("./intelligence/daily-scan", () => ({
  createScanPipelineContext: (options: unknown) =>
    createScanPipelineContextMock(options),
  processCaptureForScan: (ctx: unknown, row: unknown) =>
    processCaptureForScanMock(ctx, row),
}));

const extractCaptureEmailFieldsMock = vi.fn();
vi.mock("./extract-capture-email", () => ({
  extractCaptureEmailFields: (row: unknown) =>
    extractCaptureEmailFieldsMock(row),
}));

import {
  INLINE_SCAN_CAP,
  runInlineBackfillScan,
  type AdmittedBackfillCapture,
} from "./backfill-inline-scan";

function admitted(
  captureId: string,
  isSentByUser = false,
): AdmittedBackfillCapture {
  return {
    captureId,
    envelope: {
      sourceType: "gmail",
      captureType: "message",
      externalId: `ext-${captureId}`,
      title: "Subject",
      occurredAt: null,
      participants: [],
      threadId: null,
      extracted: {
        subject: "Subject",
        snippet: "preview",
        sender_email: "sender@client.co",
        isSentByUser,
      },
      raw: { messageId: `ext-${captureId}`, source: "composio_backfill" },
      noise: null,
    },
    row: { id: `ext-${captureId}`, payload: { headers: [] } },
  };
}

describe("runInlineBackfillScan", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    scanResult.findingsCreated = 0;
    scanResult.peopleResolved = 0;
    scanResult.errors = [];
    maybeSingle.mockResolvedValue({ data: { user_id: "owner-1" } });
    extractCaptureEmailFieldsMock.mockReturnValue({
      body_text: "Full transient body",
    });
  });

  it("does nothing when no captures were admitted", async () => {
    const summary = await runInlineBackfillScan("ws-1", []);

    expect(summary.scanned).toBe(0);
    expect(from).not.toHaveBeenCalled();
    expect(processCaptureForScanMock).not.toHaveBeenCalled();
  });

  it("skips analysis when the workspace has no owner to bill", async () => {
    maybeSingle.mockResolvedValue({ data: null });

    const summary = await runInlineBackfillScan("ws-1", [admitted("c1")]);

    expect(summary.scanned).toBe(0);
    expect(summary.errors[0]).toMatch(/no workspace owner/i);
    expect(processCaptureForScanMock).not.toHaveBeenCalled();
  });

  it("builds the pipeline context with the owner and hydration disabled", async () => {
    await runInlineBackfillScan("ws-1", [admitted("c1")]);

    expect(createScanPipelineContextMock).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: "ws-1",
        userId: "owner-1",
        enableHydration: false,
      }),
    );
    expect(createLlmCallMock).toHaveBeenCalledWith("ws-1", "owner-1");
  });

  it("attaches the transient body to the in-memory row, keeping raw_payload thin", async () => {
    await runInlineBackfillScan("ws-1", [admitted("c1")]);

    const [, row] = processCaptureForScanMock.mock.calls[0] as unknown as [
      unknown,
      {
        id: string;
        raw_payload: Record<string, unknown>;
        extracted_data: Record<string, unknown>;
      },
    ];
    expect(row.id).toBe("c1");
    expect(row.extracted_data.body_text).toBe("Full transient body");
    expect(row.extracted_data.snippet).toBe("preview");
    // The persisted-shape pointer stays thin — the body never enters raw_payload.
    expect(JSON.stringify(row.raw_payload)).not.toContain(
      "Full transient body",
    );
  });

  it("omits body_text when the page row yielded no body", async () => {
    extractCaptureEmailFieldsMock.mockReturnValue(null);

    await runInlineBackfillScan("ws-1", [admitted("c1")]);

    const [, row] = processCaptureForScanMock.mock.calls[0] as unknown as [
      unknown,
      { extracted_data: Record<string, unknown> },
    ];
    expect("body_text" in row.extracted_data).toBe(false);
  });

  it("processes inbound mail before sent mail", async () => {
    await runInlineBackfillScan("ws-1", [
      admitted("sent-1", true),
      admitted("inbox-1", false),
    ]);

    const ids = processCaptureForScanMock.mock.calls.map(
      (call) => (call[1] as { id: string }).id,
    );
    expect(ids).toEqual(["inbox-1", "sent-1"]);
  });

  it("caps inline analysis per run", async () => {
    const many = Array.from({ length: INLINE_SCAN_CAP + 10 }, (_, i) =>
      admitted(`c${i}`),
    );

    const summary = await runInlineBackfillScan("ws-1", many);

    expect(processCaptureForScanMock).toHaveBeenCalledTimes(INLINE_SCAN_CAP);
    expect(summary.scanned).toBe(INLINE_SCAN_CAP);
  });

  it("surfaces pipeline counts and errors in the summary", async () => {
    scanResult.findingsCreated = 3;
    scanResult.peopleResolved = 1;
    scanResult.errors = ["Note extraction warning: boom"];

    const summary = await runInlineBackfillScan("ws-1", [admitted("c1")]);

    expect(summary.findingsCreated).toBe(3);
    expect(summary.peopleResolved).toBe(1);
    expect(summary.errors).toContain("Note extraction warning: boom");
  });
});
