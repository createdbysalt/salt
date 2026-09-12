import { beforeEach, describe, expect, it, vi } from "vitest";

const dbControl: {
  pendingRows: Array<{ id: string; entity_type: string; identifier: string }>;
  pendingError: { message: string } | null;
} = {
  pendingRows: [],
  pendingError: null,
};

vi.mock("@/app/_lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table !== "pending_evidence") throw new Error(`Unexpected table: ${table}`);
      return {
        select: () => ({
          eq: () => ({
            in: () => ({
              in: () => ({
                limit: async () => ({
                  data: dbControl.pendingRows,
                  error: dbControl.pendingError,
                }),
              }),
            }),
          }),
        }),
      };
    },
  }),
}));

const processEntitySignalsMock = vi.fn(
  async (
    _input: Record<string, unknown>,
  ): Promise<{ dispatched: string[]; results: never[] }> => ({
    dispatched: ["capture_email_received"],
    results: [],
  }),
);
const updateCaptureMock = vi.fn(
  async (_captureId: string, _results: unknown[]): Promise<void> => undefined,
);
vi.mock("@/app/_features/plays/playbooks/trigger-dispatch", () => ({
  processEntitySignals: (input: Record<string, unknown>) =>
    processEntitySignalsMock(input),
  updateCaptureWithDispatchResults: (captureId: string, results: unknown[]) =>
    updateCaptureMock(captureId, results),
}));

import { dispatchCaptureSignals } from "./dispatch-capture-signals";

const baseInput = {
  workspaceId: "ws-1",
  captureId: "cap-1",
  signals: ["capture_email_received"],
};

beforeEach(() => {
  dbControl.pendingRows = [];
  dbControl.pendingError = null;
  processEntitySignalsMock.mockClear();
  updateCaptureMock.mockClear();
});

describe("dispatchCaptureSignals", () => {
  it("returns empty when no dispatchable signals matched", async () => {
    const result = await dispatchCaptureSignals({
      ...baseInput,
      signals: ["is_automated_sender"],
      linkedRecords: [{ surface: "people", entity_id: "p-1" }],
    });

    expect(result).toEqual({
      dispatched: [],
      entitiesNotified: 0,
      candidatesNotified: 0,
    });
    expect(processEntitySignalsMock).not.toHaveBeenCalled();
  });

  it("dispatches to linked records (born entities) as before", async () => {
    const result = await dispatchCaptureSignals({
      ...baseInput,
      linkedRecords: [
        { surface: "people", entity_id: "p-1", entity_label: "Ada" },
        { surface: "people", entity_id: "p-1" }, // duplicate — deduped
      ],
    });

    expect(processEntitySignalsMock).toHaveBeenCalledTimes(1);
    expect(processEntitySignalsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        entitySurface: "person",
        entityId: "p-1",
      }),
    );
    // Born-entity path never takes the pending-candidate lane.
    expect(processEntitySignalsMock.mock.calls[0][0]).not.toHaveProperty(
      "pendingEvidenceId",
    );
    expect(result.entitiesNotified).toBe(1);
    expect(result.candidatesNotified).toBe(0);
  });

  it("dispatches to pending_evidence candidates when no records are linked", async () => {
    dbControl.pendingRows = [
      { id: "pe-1", entity_type: "person", identifier: "ada@example.com" },
      { id: "pe-2", entity_type: "file", identifier: "bob@example.com" },
    ];

    const result = await dispatchCaptureSignals({
      ...baseInput,
      linkedRecords: [],
      participantEmails: ["Ada@Example.com", "bob@example.com"],
    });

    expect(processEntitySignalsMock).toHaveBeenCalledTimes(2);
    expect(processEntitySignalsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        entitySurface: "person",
        entityId: "pe-1",
        entityLabel: "ada@example.com",
        pendingEvidenceId: "pe-1",
        evidence: { capture_id: "cap-1" },
      }),
    );
    // Legacy "file" spelling normalizes to the resource surface.
    expect(processEntitySignalsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        entitySurface: "resource",
        pendingEvidenceId: "pe-2",
      }),
    );
    expect(result.candidatesNotified).toBe(2);
    expect(result.entitiesNotified).toBe(0);
  });

  it("skips the candidate lookup when there are no participant emails", async () => {
    const result = await dispatchCaptureSignals({
      ...baseInput,
      linkedRecords: [],
      participantEmails: [],
    });

    expect(processEntitySignalsMock).not.toHaveBeenCalled();
    expect(result.candidatesNotified).toBe(0);
  });

  it("swallows candidate-lookup errors and returns empty", async () => {
    dbControl.pendingError = { message: "db down" };

    const result = await dispatchCaptureSignals({
      ...baseInput,
      linkedRecords: [],
      participantEmails: ["ada@example.com"],
    });

    expect(result.candidatesNotified).toBe(0);
    expect(processEntitySignalsMock).not.toHaveBeenCalled();
  });

  it("isolates per-candidate dispatch failures", async () => {
    dbControl.pendingRows = [
      { id: "pe-bad", entity_type: "person", identifier: "a@example.com" },
      { id: "pe-good", entity_type: "person", identifier: "b@example.com" },
    ];
    processEntitySignalsMock.mockImplementationOnce(async () => {
      throw new Error("boom");
    });

    const result = await dispatchCaptureSignals({
      ...baseInput,
      linkedRecords: [],
      participantEmails: ["a@example.com", "b@example.com"],
    });

    expect(processEntitySignalsMock).toHaveBeenCalledTimes(2);
    expect(result.candidatesNotified).toBe(1);
  });
});
