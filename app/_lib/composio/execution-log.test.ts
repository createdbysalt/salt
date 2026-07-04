import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const inserts: Array<{ table: string; row: Record<string, unknown> }> = [];

vi.mock("@/app/_lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => ({
      insert: async (row: Record<string, unknown>) => {
        inserts.push({ table, row });
        return { error: null };
      },
    }),
  }),
}));

vi.mock("@/app/_features/connectors/connector-capabilities", () => ({
  getComposioProviderForToolSlug: () => "gmail",
}));

import { logToolExecution, summarizeToolArgs } from "./execution-log";

describe("summarizeToolArgs", () => {
  it("keeps short values intact (recipients, subjects, ids)", () => {
    const summary = summarizeToolArgs({
      to: "client@example.com",
      cc: "partner@example.com",
      subject: "Invoice follow-up",
      maxResults: 10,
    });

    expect(summary).toEqual({
      to: "client@example.com",
      cc: "partner@example.com",
      subject: "Invoice follow-up",
      maxResults: 10,
    });
  });

  it("truncates long strings so full email bodies are never persisted", () => {
    const body = "a".repeat(5000);
    const summary = summarizeToolArgs({ body });

    expect(summary?.body).toMatch(/… \(5000 chars\)$/);
    expect(String(summary?.body).length).toBeLessThan(250);
  });

  it("summarizes nested objects (calendar event start/end)", () => {
    const summary = summarizeToolArgs({
      summary: "Kickoff",
      start: { dateTime: "2026-06-12T10:00:00Z" },
    });

    expect(summary).toEqual({
      summary: "Kickoff",
      start: { dateTime: "2026-06-12T10:00:00Z" },
    });
  });

  it("returns null for non-object args", () => {
    expect(summarizeToolArgs(null)).toBeNull();
    expect(summarizeToolArgs("text")).toBeNull();
    expect(summarizeToolArgs(["a"])).toBeNull();
  });
});

describe("audit parity in Activity (5.5.6)", () => {
  beforeEach(() => {
    inserts.length = 0;
  });

  it("mirrors successful mutating executions into activity_entries with provenance", async () => {
    await logToolExecution({
      workspaceId: "ws-1",
      toolSlug: "GMAIL_SEND_EMAIL",
      risk: "mutating",
      source: "ask_salt",
      status: "success",
      userId: "user-1",
      approvedBy: "user-1",
    });

    expect(inserts.map((i) => i.table)).toEqual([
      "workspace_tool_executions",
      "activity_entries",
    ]);
    const activity = inserts[1].row;
    expect(activity.action).toBe("ran");
    expect(activity.title).toBe("Salt ran Gmail send email");
    expect(activity.detail).toBe("You approved this in Ask Salt.");
    expect(activity.metadata).toMatchObject({
      tool_slug: "GMAIL_SEND_EMAIL",
      source: "ask_salt",
      approved_by: "user-1",
    });
  });

  it("keeps reads and failures out of the Activity feed", async () => {
    await logToolExecution({
      workspaceId: "ws-1",
      toolSlug: "GMAIL_FETCH_EMAILS",
      risk: "read",
      source: "ask_salt",
      status: "success",
    });
    await logToolExecution({
      workspaceId: "ws-1",
      toolSlug: "GMAIL_SEND_EMAIL",
      risk: "mutating",
      source: "ask_salt",
      status: "blocked",
    });

    expect(inserts.every((i) => i.table === "workspace_tool_executions")).toBe(true);
  });

  it("records play consent provenance", async () => {
    await logToolExecution({
      workspaceId: "ws-1",
      toolSlug: "GMAIL_CREATE_EMAIL_DRAFT",
      risk: "mutating",
      source: "play",
      status: "success",
      approvedBy: "user-1",
    });

    expect(inserts[1].row.detail).toBe("Pre-approved when you enabled the play.");
  });
});
