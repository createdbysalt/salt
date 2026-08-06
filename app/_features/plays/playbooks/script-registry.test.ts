import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const activityInserts: Record<string, unknown>[] = [];

vi.mock("@/app/_lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn((table: string) => ({
      insert: vi.fn(async (row: Record<string, unknown>) => {
        if (table === "activity_entries") activityInserts.push(row);
        return { error: null };
      }),
    })),
  })),
}));

const hygieneRun = vi.fn();
const memoryRecordsRun = vi.fn();
const memoryRecordsRunForWorkspace = vi.fn();
const connectionsRun = vi.fn();
const notesRun = vi.fn();

vi.mock("./v2/_meta/hygiene/scripts/run", () => ({
  run: (...args: unknown[]) => hygieneRun(...args),
}));
vi.mock("./v2/_meta/memory-records/scripts/run", () => ({
  run: (...args: unknown[]) => memoryRecordsRun(...args),
  runForWorkspace: (...args: unknown[]) => memoryRecordsRunForWorkspace(...args),
}));
vi.mock("./v2/_meta/connections/scripts/run", () => ({
  run: (...args: unknown[]) => connectionsRun(...args),
}));
vi.mock("./v2/_meta/notes/scripts/run", () => ({
  run: (...args: unknown[]) => notesRun(...args),
}));

import {
  hasPlaybookScript,
  getRegisteredScriptSlugs,
  executePlaybookScript,
} from "./script-registry";

describe("script registry resolution", () => {
  it("registers all four learn-layer system playbooks", () => {
    expect(getRegisteredScriptSlugs().sort()).toEqual([
      "connections",
      "memory-hygiene",
      "memory-records",
      "notes",
    ]);
  });

  it("resolves registered slugs and rejects unknown ones", () => {
    expect(hasPlaybookScript("memory-hygiene")).toBe(true);
    expect(hasPlaybookScript("connections")).toBe(true);
    expect(hasPlaybookScript("daily-briefing")).toBe(false);
    expect(hasPlaybookScript("nonexistent")).toBe(false);
  });
});

describe("executePlaybookScript", () => {
  beforeEach(() => {
    activityInserts.length = 0;
    vi.clearAllMocks();
  });

  it("returns skipped for slugs without a script", async () => {
    const result = await executePlaybookScript("nonexistent", {
      workspaceId: "ws-1",
      trigger: "manual",
    });
    expect(result).toEqual({ success: false, skipped: "no_script" });
  });

  it("runs the registered script and passes the context through", async () => {
    connectionsRun.mockResolvedValue({
      success: true,
      summary: "Inferred 1 connection(s)",
      data: { updates: 1 },
    });

    const result = await executePlaybookScript("connections", {
      workspaceId: "ws-1",
      trigger: "signal",
      signal: "capture_email_received",
      entityType: "person",
      entityId: "person-1",
    });

    expect(result.success).toBe(true);
    expect(connectionsRun).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: "ws-1",
        triggerSignal: "capture_email_received",
        entityType: "person",
        entityId: "person-1",
      })
    );
  });

  it("contains script errors instead of throwing", async () => {
    hygieneRun.mockRejectedValue(new Error("db exploded"));

    const result = await executePlaybookScript("memory-hygiene", {
      workspaceId: "ws-1",
      trigger: "schedule",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("db exploded");
  });

  it("records scheduled runs in activity_entries", async () => {
    hygieneRun.mockResolvedValue({
      success: true,
      summary: "Scanned 10 records",
      data: { emitted: 0 },
    });

    await executePlaybookScript("memory-hygiene", {
      workspaceId: "ws-1",
      trigger: "schedule",
    });

    expect(activityInserts).toHaveLength(1);
    expect(activityInserts[0]).toMatchObject({
      workspace_id: "ws-1",
      action: "ran",
      title: "Memory Hygiene ran",
    });
  });

  it("does not record signal-triggered runs that did no meaningful work", async () => {
    notesRun.mockResolvedValue({
      success: true,
      summary: "No duplicate notes",
      data: { merged: 0, updates: 0 },
    });

    await executePlaybookScript("notes", {
      workspaceId: "ws-1",
      trigger: "signal",
      signal: "note_created",
    });

    expect(activityInserts).toHaveLength(0);
  });

  it("records signal-triggered runs that made updates", async () => {
    notesRun.mockResolvedValue({
      success: true,
      summary: "Merged 2 duplicate note(s)",
      data: { merged: 2, updates: 2 },
    });

    await executePlaybookScript("notes", {
      workspaceId: "ws-1",
      trigger: "signal",
      signal: "note_created",
    });

    expect(activityInserts).toHaveLength(1);
    expect(activityInserts[0]).toMatchObject({ title: "Notes ran" });
  });
});
