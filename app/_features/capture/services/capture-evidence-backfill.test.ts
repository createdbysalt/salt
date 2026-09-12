import { beforeEach, describe, expect, it, vi } from "vitest";

interface Candidate {
  id: string;
  workspace_id: string;
}

const dbControl: {
  candidates: Candidate[];
  candidateError: { message: string } | null;
  messageBody: string | null;
  purged: number;
  purgeError: { message: string } | null;
  /** capture_ids that already have evidence provenance rows. */
  provenanceCaptureIds: string[];
} = {
  candidates: [],
  candidateError: null,
  messageBody: null,
  purged: 0,
  purgeError: null,
  provenanceCaptureIds: [],
};

const skipStamped: string[] = [];

vi.mock("@/app/_lib/supabase/admin", () => ({
  createAdminClient: () => makeAdmin(),
}));

const processMock = vi.fn(
  async (
    _captureId: string,
    _options?: { bodyOverride?: string | null },
  ): Promise<{ processed: boolean; signalsDetected: number; results: never[] }> => ({
    processed: true,
    signalsDetected: 1,
    results: [],
  }),
);
vi.mock("@/app/_features/memory/evidence", () => ({
  processCaptureForEvidence: (
    captureId: string,
    options?: { bodyOverride?: string | null },
  ) => processMock(captureId, options),
}));

import {
  EVIDENCE_BACKFILL_GLOBAL_CAP,
  EVIDENCE_BACKFILL_PER_WORKSPACE_CAP,
  runCaptureEvidenceBackfill,
} from "./capture-evidence-backfill";

/** Minimal admin stub shaped to the backfill's query chains. */
function makeAdmin() {
  return {
    rpc: async (fn: string) => {
      if (fn !== "purge_expired_conversation_bodies") {
        throw new Error(`Unexpected rpc: ${fn}`);
      }
      return { data: dbControl.purged, error: dbControl.purgeError };
    },
    from: (table: string) => {
      if (table === "capture_events") {
        return {
          select: () => ({
            is: () => ({
              or: () => ({
                not: () => ({
                  order: () => ({
                    limit: async () => ({
                      // First page only: processed rows are stamped and leave
                      // the candidate set, so a second fetch returns empty.
                      data: dbControl.candidates,
                      error: dbControl.candidateError,
                    }),
                  }),
                }),
              }),
            }),
          }),
          update: () => ({
            eq: async (column: string, value: string) => {
              if (column === "id") skipStamped.push(value);
              return { error: null };
            },
          }),
        };
      }
      if (table === "pending_evidence_signals") {
        return {
          select: () => ({
            in: async () => ({
              data: dbControl.provenanceCaptureIds.map((capture_id) => ({
                capture_id,
              })),
              error: null,
            }),
          }),
        };
      }
      if (table === "conversation_messages") {
        return {
          select: () => ({
            eq: () => ({
              not: () => ({
                order: () => ({
                  limit: () => ({
                    maybeSingle: async () => ({
                      data: dbControl.messageBody
                        ? { body_text: dbControl.messageBody }
                        : null,
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          }),
        };
      }
      throw new Error(`Unexpected table: ${table}`);
    },
  } as never;
}

beforeEach(() => {
  dbControl.candidates = [];
  dbControl.candidateError = null;
  dbControl.messageBody = null;
  dbControl.purged = 0;
  dbControl.purgeError = null;
  dbControl.provenanceCaptureIds = [];
  skipStamped.length = 0;
  processMock.mockClear();
});

describe("runCaptureEvidenceBackfill", () => {
  it("purges expired bodies before processing", async () => {
    dbControl.purged = 7;

    const result = await runCaptureEvidenceBackfill();

    expect(result.bodiesPurged).toBe(7);
    expect(result.capturesProcessed).toBe(0);
  });

  it("processes candidates with the message-store body as override", async () => {
    dbControl.candidates = [{ id: "cap-1", workspace_id: "ws-1" }];
    dbControl.messageBody = "Full body from the message store";

    const result = await runCaptureEvidenceBackfill();

    expect(processMock).toHaveBeenCalledWith("cap-1", {
      bodyOverride: "Full body from the message store",
    });
    expect(result.capturesProcessed).toBe(1);
    expect(result.signalsDetected).toBe(1);
    expect(result.workspacesSeen).toBe(1);
  });

  it("passes a null override when no body was stored", async () => {
    dbControl.candidates = [{ id: "cap-1", workspace_id: "ws-1" }];

    await runCaptureEvidenceBackfill();

    expect(processMock).toHaveBeenCalledWith("cap-1", { bodyOverride: null });
  });

  it("caps processing per workspace", async () => {
    dbControl.candidates = Array.from(
      { length: EVIDENCE_BACKFILL_PER_WORKSPACE_CAP + 10 },
      (_, i) => ({ id: `cap-${i}`, workspace_id: "ws-1" }),
    );

    const result = await runCaptureEvidenceBackfill();

    expect(result.capturesProcessed).toBe(EVIDENCE_BACKFILL_PER_WORKSPACE_CAP);
  });

  it("never exceeds the global cap", async () => {
    const workspaceCount = Math.ceil(
      EVIDENCE_BACKFILL_GLOBAL_CAP / EVIDENCE_BACKFILL_PER_WORKSPACE_CAP,
    );
    dbControl.candidates = Array.from(
      { length: workspaceCount * EVIDENCE_BACKFILL_PER_WORKSPACE_CAP },
      (_, i) => ({
        id: `cap-${i}`,
        workspace_id: `ws-${Math.floor(i / EVIDENCE_BACKFILL_PER_WORKSPACE_CAP)}`,
      }),
    );

    const result = await runCaptureEvidenceBackfill();

    expect(result.capturesProcessed).toBeLessThanOrEqual(
      EVIDENCE_BACKFILL_GLOBAL_CAP,
    );
  });

  it("isolates per-capture failures and keeps going", async () => {
    dbControl.candidates = [
      { id: "cap-bad", workspace_id: "ws-1" },
      { id: "cap-good", workspace_id: "ws-1" },
    ];
    processMock.mockImplementationOnce(async () => {
      throw new Error("boom");
    });

    const result = await runCaptureEvidenceBackfill();

    expect(result.failures).toEqual([{ captureId: "cap-bad", error: "boom" }]);
    expect(result.capturesProcessed).toBe(1);
  });

  it("records a failure when the candidate query errors", async () => {
    dbControl.candidateError = { message: "db down" };

    const result = await runCaptureEvidenceBackfill();

    expect(result.capturesProcessed).toBe(0);
    expect(result.failures[0]?.error).toBe("db down");
  });

  it("skips historical rows that already have evidence provenance", async () => {
    // Pre-stamp history: evidence ran at ingest but the row lacks the
    // evidence.processed_at stamp. Reprocessing would double-count weights.
    dbControl.candidates = [
      { id: "cap-historical", workspace_id: "ws-1" },
      { id: "cap-new", workspace_id: "ws-1" },
    ];
    dbControl.provenanceCaptureIds = ["cap-historical"];
    dbControl.messageBody = "body";

    const result = await runCaptureEvidenceBackfill();

    expect(processMock).toHaveBeenCalledTimes(1);
    expect(processMock.mock.calls[0]?.[0]).toBe("cap-new");
    expect(result.capturesProcessed).toBe(1);
    // The historical row gets stamped so it leaves the candidate set.
    expect(skipStamped).toEqual(["cap-historical"]);
  });
});
