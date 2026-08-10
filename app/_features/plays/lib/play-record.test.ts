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
      sourceContext: { source: "playbook", playbook_slug: "memory-records" },
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

/**
 * Plays canon Phase 2 (P2-4): Ask Salt tool confirmations stay in chat —
 * their play_runs rows exist ONLY for metering/idempotency and must never
 * surface as approvable queue cards. Needs You renders state queued/draft;
 * a chat-approved action must always land ran + auto_handled. If either
 * assertion breaks, an executed external send becomes a ghost row invisible
 * in both queue tabs (or worse, an approvable card for work already done).
 */
describe("createPlayRecord ask-salt queue isolation", () => {
  beforeEach(() => {
    recordPlayExecution.mockClear();
    for (const key of Object.keys(insertedByTable)) delete insertedByTable[key];
  });

  it("chat-approved ask_salt actions always insert ran + auto_handled", async () => {
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

    expect(result.queue).toBe("auto_handled");
    expect(result.state).toBe("ran");

    const row = insertedByTable["play_runs"]?.[0];
    expect(row).toMatchObject({ queue: "auto_handled", state: "ran" });
  });

  it("approval short-circuits routing even when budget routing is left on", async () => {
    // ask-salt-tools passes useBudgetRouting: false, but the approval
    // short-circuit must hold on its own — a refactor dropping the option
    // must not let an executed send route to needs_you.
    const result = await createPlayRecord({
      workspaceId: "ws-1",
      title: "Email Maya",
      sourceContext: {
        source: "ask_salt",
        user_approved_at: new Date().toISOString(),
      },
      state: "ran",
      stakes: "high",
      confidence: 95,
      executedToolSlugs: ["GMAIL_SEND_EMAIL"],
    });

    expect(result.queue).toBe("auto_handled");
    expect(result.state).toBe("ran");
  });
});
