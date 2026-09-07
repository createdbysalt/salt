import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Correction tools — pattern extraction (real implementation, not a copy)
 * and the execute flow for rename corrections: a rename must resolve work
 * records, write work.name through memoryUpdateField, and never claim a
 * write that didn't happen.
 */

const h = vi.hoisted(() => {
  interface Row {
    [key: string]: unknown;
  }

  const db = {
    learnings: [] as Row[],
    people: [] as Row[],
    organizations: [] as Row[],
    work: [] as Row[],
    facts: [] as Row[],
  };

  const recordConversationalCorrectionSpy = vi.fn(async (_input: unknown) => ({
    id: "corr-1",
    penaltyApplied: 10,
  }));
  const memoryUpdateFieldSpy = vi.fn(
    async (_input: unknown): Promise<{ action: string }> => ({ action: "applied" }),
  );
  const logToolExecutionSpy = vi.fn();

  type Filter = (row: Row) => boolean;

  function tableQuery(rows: Row[]) {
    const filters: Filter[] = [];
    const builder = {
      select: () => builder,
      eq: (column: string, value: unknown) => {
        filters.push((row) => row[column] === value);
        return builder;
      },
      is: (column: string, value: unknown) => {
        filters.push((row) => (row[column] ?? null) === value);
        return builder;
      },
      ilike: (column: string, pattern: unknown) => {
        const needle = String(pattern).replace(/%/g, "").toLowerCase();
        filters.push(
          (row) =>
            typeof row[column] === "string" &&
            (row[column] as string).toLowerCase().includes(needle),
        );
        return builder;
      },
      order: () => builder,
      limit: () => builder,
      maybeSingle: async () => ({
        data: rows.find((row) => filters.every((f) => f(row))) ?? null,
        error: null,
      }),
      insert: (row: Row) => {
        db.facts.push(row);
        return {
          select: () => ({
            single: async () => ({ data: { id: "fact-1" }, error: null }),
          }),
        };
      },
    };
    return builder;
  }

  function fakeClient() {
    return {
      from: (table: string) => {
        if (table === "salt_learnings") return tableQuery(db.learnings);
        if (table === "people") return tableQuery(db.people);
        if (table === "organizations") return tableQuery(db.organizations);
        if (table === "work") return tableQuery(db.work);
        if (table === "operator_memory_facts") return tableQuery(db.facts);
        throw new Error(`unexpected table ${table}`);
      },
    };
  }

  function resetDb() {
    db.learnings.length = 0;
    db.people.length = 0;
    db.organizations.length = 0;
    db.work.length = 0;
    db.facts.length = 0;
  }

  return {
    db,
    resetDb,
    fakeClient,
    recordConversationalCorrectionSpy,
    memoryUpdateFieldSpy,
    logToolExecutionSpy,
  };
});

vi.mock("@/app/_lib/supabase/server", () => ({
  createClient: async () => h.fakeClient(),
}));

vi.mock("@/app/_lib/supabase/admin", () => ({
  createAdminClient: () => h.fakeClient(),
}));

vi.mock("@/app/_lib/composio/execution-log", () => ({
  logToolExecution: (input: unknown) => h.logToolExecutionSpy(input),
}));

vi.mock("@/app/_features/me/actions/corrections", () => ({
  recordConversationalCorrection: (input: unknown) =>
    h.recordConversationalCorrectionSpy(input),
}));

vi.mock("@/app/_lib/memory-tools", () => ({
  memoryUpdateField: (input: unknown) => h.memoryUpdateFieldSpy(input),
}));

import {
  buildCorrectionTools,
  extractPatterns,
} from "./correction-tools";

describe("extractPatterns", () => {
  it("extracts role correction from 'isn't a client, she's an accountant'", () => {
    const patterns = extractPatterns(
      "Jane isn't a client, she's my accountant",
      "Jane",
      "client",
    );

    expect(patterns.length).toBeGreaterThanOrEqual(1);
    expect(patterns.some((p) => p.type === "role_correction")).toBe(true);
    const rolePattern = patterns.find((p) => p.type === "role_correction");
    expect(rolePattern?.correctValue).toBeDefined();
  });

  it("extracts timing correction from 'not anymore'", () => {
    const patterns = extractPatterns(
      "That was true last year but not anymore",
      "John",
      "client",
    );

    expect(patterns.some((p) => p.type === "timing_correction")).toBe(true);
  });

  it("extracts never_true from 'was never a client'", () => {
    const patterns = extractPatterns(
      "She was never a client, I don't know where Salt got that",
      "Jane",
      "client",
    );

    expect(patterns.some((p) => p.type === "never_true")).toBe(true);
  });

  it("extracts domain rule from 'anyone from @acme.com'", () => {
    const patterns = extractPatterns(
      "Anyone from @acme.com is a vendor, not a client",
      "Jane",
      "client",
    );

    expect(patterns.some((p) => p.type === "context_rule")).toBe(true);
    const rule = patterns.find((p) => p.type === "context_rule");
    expect(rule?.rule).toContain("acme.com");
  });

  it("extracts multiple patterns from complex explanation", () => {
    const patterns = extractPatterns(
      "Jane isn't a client anymore, she used to be but not anymore",
      "Jane",
      "client",
    );

    expect(patterns.length).toBeGreaterThanOrEqual(2);
    expect(patterns.some((p) => p.type === "role_correction")).toBe(true);
    expect(patterns.some((p) => p.type === "timing_correction")).toBe(true);
  });

  it("returns empty array when no patterns match", () => {
    const patterns = extractPatterns(
      "I just want to update this",
      "Jane",
      "client",
    );

    expect(patterns).toHaveLength(0);
  });

  it("extracts a rename from 'the name of the work is X, not Y'", () => {
    const patterns = extractPatterns(
      "The name of the work is Playground Website, not 'Barrett on the Studio'",
      "Barrett on the Studio",
      "unknown",
    );

    const rename = patterns.find((p) => p.type === "rename_correction");
    expect(rename).toBeDefined();
    expect(rename?.correctValue).toBe("Playground Website");
    expect(rename?.wrongValue).toBe("Barrett on the Studio");
  });

  it("extracts a rename from 'it's called X, not Y'", () => {
    const patterns = extractPatterns(
      "It's called Playground Website, not Barrett on the Studio",
      "Barrett on the Studio",
      "unknown",
    );

    const rename = patterns.find((p) => p.type === "rename_correction");
    expect(rename?.correctValue).toBe("Playground Website");
    expect(rename?.wrongValue).toBe("Barrett on the Studio");
  });

  it("extracts a rename from 'rename the work to X'", () => {
    const patterns = extractPatterns(
      "Rename the work to Playground Website",
      "Barrett on the Studio",
      "Barrett on the Studio",
    );

    const rename = patterns.find((p) => p.type === "rename_correction");
    expect(rename?.correctValue).toBe("Playground Website");
  });

  it("does not fire the rename pattern on role corrections", () => {
    const patterns = extractPatterns(
      "Jane isn't a client, she's my accountant",
      "Jane",
      "client",
    );

    expect(patterns.some((p) => p.type === "rename_correction")).toBe(false);
  });
});

describe("correct_previous_action — rename flow", () => {
  const workspaceId = "ws-1";
  const userId = "user-1";

  function buildTool() {
    const tools = buildCorrectionTools({ workspaceId, userId });
    return tools.correct_previous_action as unknown as {
      execute: (input: Record<string, unknown>) => Promise<{
        success: boolean;
        message: string;
        fieldUpdated?: boolean;
      }>;
    };
  }

  beforeEach(() => {
    h.resetDb();
    h.recordConversationalCorrectionSpy.mockClear();
    h.memoryUpdateFieldSpy.mockClear();
    h.memoryUpdateFieldSpy.mockResolvedValue({ action: "applied" });
    h.logToolExecutionSpy.mockClear();
  });

  it("renames a work record via its birth learning (field_path 'record')", async () => {
    h.db.learnings.push({
      id: "learn-1",
      workspace_id: workspaceId,
      entity_type: "work",
      entity_id: "work-1",
      entity_label: "Barrett on the Studio",
      field_path: "record",
      new_value: "Barrett on the Studio",
      undone_at: null,
      created_at: "2026-09-05T00:00:00.000Z",
    });

    const result = await buildTool().execute({
      entityName: "Barrett on the Studio",
      explanation:
        "The name of the work is Playground Website, not 'Barrett on the Studio'",
    });

    expect(result.success).toBe(true);
    expect(h.memoryUpdateFieldSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: "work",
        entityId: "work-1",
        field: "name",
        value: "Playground Website",
        confidence: 100,
      }),
    );
    expect(h.recordConversationalCorrectionSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: "work",
        entityId: "work-1",
        fieldPath: "name",
        correctValue: "Playground Website",
      }),
    );
    expect(result.fieldUpdated).toBe(true);
    expect(result.message).toContain('updated the record to "Playground Website"');
  });

  it("resolves a work record by name when no learning exists", async () => {
    h.db.work.push({
      id: "work-9",
      workspace_id: workspaceId,
      name: "Barrett on the Studio",
      deleted_at: null,
    });

    const result = await buildTool().execute({
      entityName: "Barrett on the Studio",
      explanation: "It's called Playground Website, not Barrett on the Studio",
    });

    expect(result.success).toBe(true);
    expect(h.memoryUpdateFieldSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: "work",
        entityId: "work-9",
        field: "name",
        value: "Playground Website",
      }),
    );
  });

  it("resolves people by their name column", async () => {
    h.db.people.push({
      id: "person-1",
      workspace_id: workspaceId,
      name: "Jane Doe",
      deleted_at: null,
    });

    const result = await buildTool().execute({
      entityName: "Jane",
      explanation: "Jane isn't a client, she's my accountant",
    });

    expect(result.success).toBe(true);
    expect(h.recordConversationalCorrectionSpy).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: "person", entityId: "person-1" }),
    );
  });

  it("never claims a write that did not happen", async () => {
    h.memoryUpdateFieldSpy.mockResolvedValue({ action: "accumulated" });
    h.db.work.push({
      id: "work-9",
      workspace_id: workspaceId,
      name: "Barrett on the Studio",
      deleted_at: null,
    });

    const result = await buildTool().execute({
      entityName: "Barrett on the Studio",
      explanation: "It's called Playground Website, not Barrett on the Studio",
    });

    expect(result.success).toBe(true);
    expect(result.fieldUpdated).toBe(false);
    expect(result.message).not.toContain("I've updated the record");
    expect(result.message).toContain("wasn't able to update the record itself");
  });

  it("stays honest when the field update throws", async () => {
    h.memoryUpdateFieldSpy.mockRejectedValueOnce(new Error("Unknown work field"));
    h.db.work.push({
      id: "work-9",
      workspace_id: workspaceId,
      name: "Barrett on the Studio",
      deleted_at: null,
    });

    const result = await buildTool().execute({
      entityName: "Barrett on the Studio",
      explanation: "It's called Playground Website, not Barrett on the Studio",
    });

    expect(result.success).toBe(true);
    expect(result.message).not.toContain("I've updated the record");
  });

  it("returns not-found when nothing resolves", async () => {
    const result = await buildTool().execute({
      entityName: "Ghost Record",
      explanation: "The name of the work is Something Else entirely",
    });

    expect(result.success).toBe(false);
    expect(result.message).toContain("couldn't find");
    expect(h.memoryUpdateFieldSpy).not.toHaveBeenCalled();
  });
});
