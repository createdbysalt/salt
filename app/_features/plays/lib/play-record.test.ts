import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const insertedByTable: Record<string, Record<string, unknown>[]> = {};

vi.mock("@/app/_lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => ({
      insert: (row: Record<string, unknown>) => {
        (insertedByTable[table] ??= []).push(row);
        // play_runs reads the id back; activity_entries awaits the insert directly.
        return {
          select: () => ({
            single: async () => ({ data: { id: "run-1" }, error: null }),
          }),
          then: (resolve: (value: { error: null }) => unknown) => resolve({ error: null }),
        };
      },
    }),
  }),
}));

vi.mock("@/app/_lib/learning/queue-budget", () => ({
  shouldRouteToNeedsYou: async () => ({ decision: "auto_handled" }),
}));

vi.mock("@/app/_lib/learning/outcomes", () => ({
  setExpectedOutcome: async () => undefined,
}));

const recordPlayExecution = vi.fn(async (_input: unknown) => ({
  ok: true as const,
  deduped: false,
}));

vi.mock("@/app/_lib/usage/record-play-usage", () => ({
  recordPlayExecution: (input: unknown) => recordPlayExecution(input),
}));

const { createPlayRecord } = await import("./play-record");

/**
 * Ask Salt runs a Composio tool and then logs it here. Pricing §1 counts that
 * standalone external action as one billable play, and nothing else in the
 * codebase meters it — so these assertions are the only thing standing between
 * "Salt, email this client" and a free send.
 */
describe("createPlayRecord metering", () => {
  beforeEach(() => {
    recordPlayExecution.mockClear();
    for (const key of Object.keys(insertedByTable)) delete insertedByTable[key];
  });

  it("meters an Ask Salt action with the slug that actually executed", async () => {
    await createPlayRecord({
      workspaceId: "ws-1",
      title: "Email Maya",
      sourceContext: {
        source: "ask_salt",
        user_approved_at: new Date().toISOString(),
      },
      state: "ran",
      useBudgetRouting: false,
      executedToolSlugs: ["GMAIL_SEND_EMAIL"],
    });

    expect(recordPlayExecution).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: "ws-1",
        playRunId: "run-1",
        toolSlugs: ["GMAIL_SEND_EMAIL"],
      }),
    );
  });

  it("meters a tool-less completed play so LEARN-layer spend stays visible", async () => {
    await createPlayRecord({
      workspaceId: "ws-1",
      title: "Updated industry for Acme",
      sourceContext: { source: "playbook", playbook_slug: "records-keeper" },
      state: "ran",
      useBudgetRouting: false,
    });

    expect(recordPlayExecution).toHaveBeenCalledWith(
      expect.objectContaining({ playRunId: "run-1", toolSlugs: [] }),
    );
  });

  it("does not meter a play that has not run yet", async () => {
    await createPlayRecord({
      workspaceId: "ws-1",
      title: "Draft follow-up",
      sourceContext: { source: "playbook" },
      state: "draft",
      useBudgetRouting: false,
    });

    expect(recordPlayExecution).not.toHaveBeenCalled();
  });

  it("still returns the play when metering throws", async () => {
    recordPlayExecution.mockRejectedValueOnce(new Error("ledger down"));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await createPlayRecord({
      workspaceId: "ws-1",
      title: "Email Maya",
      sourceContext: {
        source: "ask_salt",
        user_approved_at: new Date().toISOString(),
      },
      state: "ran",
      useBudgetRouting: false,
      executedToolSlugs: ["GMAIL_SEND_EMAIL"],
    });

    expect(result.playId).toBe("run-1");
    consoleError.mockRestore();
  });
});
