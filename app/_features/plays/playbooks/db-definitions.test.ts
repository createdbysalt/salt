import { beforeEach, describe, expect, it, vi } from "vitest";

const upserts: Array<{ row: Record<string, unknown>; onConflict?: string }> = [];
const updates: Array<Record<string, unknown>> = [];
let tableRows: Array<Record<string, unknown>> = [];
let selectError: { message: string } | null = null;
let upsertError: { message: string } | null = null;

function fakeQuery() {
  const filters: Record<string, unknown> = {};
  const builder = {
    select: () => builder,
    eq: (column: string, value: unknown) => {
      filters[column] = value;
      return builder;
    },
    upsert: async (row: Record<string, unknown>, opts?: { onConflict?: string }) => {
      upserts.push({ row, onConflict: opts?.onConflict });
      return { error: upsertError };
    },
    update: (patch: Record<string, unknown>) => {
      updates.push(patch);
      return { eq: () => ({ eq: async () => ({ error: null }) }) };
    },
    then: (
      resolve: (value: { data: Array<Record<string, unknown>>; error: unknown }) => void
    ) => {
      resolve({
        data: tableRows.filter(
          (r) =>
            r.workspace_id === filters.workspace_id && r.status === filters.status
        ),
        error: selectError,
      });
    },
  };
  return builder;
}

vi.mock("@/app/_lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: () => fakeQuery() }),
}));

import {
  archivePlaybookDefinition,
  listWorkspacePlaybookDefinitions,
  savePlaybookDefinition,
} from "./db-definitions";

function validDefinition(overrides: Record<string, unknown> = {}) {
  return {
    name: "Follow-up nudge",
    slug: "follow-up-nudge",
    version: "1.0.0",
    description: "Drafts a follow-up when a billing payment lands",
    section: "billing",
    layer: "act",
    voice: "billing",
    trigger: { type: "signal", signal: "billing_payment_matched" },
    steps: [
      {
        step: "draft",
        id: "note",
        prompt: "Write a short note about the payment.",
        max_tokens: 120,
      },
    ],
    output: { type: "finding", approval: "ask" },
    ...overrides,
  };
}

beforeEach(() => {
  upserts.length = 0;
  updates.length = 0;
  tableRows = [];
  selectError = null;
  upsertError = null;
});

describe("savePlaybookDefinition", () => {
  it("rejects an invalid definition without touching the DB", async () => {
    const result = await savePlaybookDefinition({
      workspaceId: "ws-1",
      definition: { name: "broken" },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.length).toBeGreaterThan(0);
    expect(upserts).toHaveLength(0);
  });

  it("upserts a valid definition keyed on workspace + slug", async () => {
    const result = await savePlaybookDefinition({
      workspaceId: "ws-1",
      definition: validDefinition(),
      createdBy: "user-1",
    });

    expect(result).toEqual({
      ok: true,
      data: { slug: "follow-up-nudge", version: "1.0.0" },
    });
    expect(upserts).toHaveLength(1);
    expect(upserts[0].onConflict).toBe("workspace_id,slug");
    expect(upserts[0].row).toMatchObject({
      workspace_id: "ws-1",
      slug: "follow-up-nudge",
      version: "1.0.0",
      source: "db",
      status: "active",
      created_by: "user-1",
    });
  });

  it("surfaces DB errors", async () => {
    upsertError = { message: "permission denied" };

    const result = await savePlaybookDefinition({
      workspaceId: "ws-1",
      definition: validDefinition(),
    });

    expect(result).toEqual({ ok: false, errors: ["permission denied"] });
  });
});

describe("listWorkspacePlaybookDefinitions", () => {
  it("returns validated rows as parsed playbooks", async () => {
    tableRows = [
      {
        workspace_id: "ws-1",
        status: "active",
        slug: "follow-up-nudge",
        definition: validDefinition(),
      },
    ];

    const result = await listWorkspacePlaybookDefinitions("ws-1");

    expect(result.errors).toHaveLength(0);
    expect(result.playbooks).toHaveLength(1);
    expect(result.playbooks[0].definition.slug).toBe("follow-up-nudge");
  });

  it("reports rows that fail re-validation instead of dropping them silently", async () => {
    tableRows = [
      {
        workspace_id: "ws-1",
        status: "active",
        slug: "stale-row",
        definition: { name: "no longer valid under the current schema" },
      },
    ];

    const result = await listWorkspacePlaybookDefinitions("ws-1");

    expect(result.playbooks).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].file).toBe("db:stale-row");
  });

  it("scopes reads to the workspace and active status", async () => {
    tableRows = [
      { workspace_id: "ws-2", status: "active", slug: "other", definition: validDefinition() },
      { workspace_id: "ws-1", status: "archived", slug: "old", definition: validDefinition() },
    ];

    const result = await listWorkspacePlaybookDefinitions("ws-1");

    expect(result.playbooks).toHaveLength(0);
  });

  it("turns a read failure into a reported error", async () => {
    selectError = { message: "connection reset" };

    const result = await listWorkspacePlaybookDefinitions("ws-1");

    expect(result.playbooks).toHaveLength(0);
    expect(result.errors[0].errors).toContain("connection reset");
  });
});

describe("archivePlaybookDefinition", () => {
  it("marks the row archived", async () => {
    const result = await archivePlaybookDefinition("ws-1", "follow-up-nudge");

    expect(result).toEqual({ ok: true });
    expect(updates[0].status).toBe("archived");
  });
});
