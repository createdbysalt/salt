import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Memory → Customize entry actions (Phase M1).
 *
 * In-memory Supabase mock (same pattern as memory/evidence/actions.test.ts):
 * the table starts empty per test; inserts/updates land in `db.rows`.
 */

interface EntryRow {
  id: string;
  workspace_id: string;
  entity_type: string;
  body: string;
  source: string;
  status: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

const h = vi.hoisted(() => {
  const db = { rows: [] as EntryRow[] };
  let idCounter = 0;

  function makeBuilder(table: string) {
    const filters: Array<[string, unknown]> = [];
    const builder = {
      insert: (row: Record<string, unknown>) => {
        const stored: EntryRow = {
          id: `00000000-0000-4000-8000-${String(++idCounter).padStart(12, "0")}`,
          status: "active",
          created_by: null,
          created_at: "2026-08-10T00:00:00Z",
          updated_at: "2026-08-10T00:00:00Z",
          ...(row as Partial<EntryRow>),
        } as EntryRow;
        db.rows.push(stored);
        return {
          select: () => ({
            single: async () => ({ data: { ...stored }, error: null }),
          }),
        };
      },
      update: (patch: Record<string, unknown>) => ({
        eq: (column: string, value: unknown) => {
          filters.push([column, value]);
          return {
            eq: (c: string, v: unknown) => {
              filters.push([c, v]);
              return {
                eq: async (c2: string, v2: unknown) => {
                  filters.push([c2, v2]);
                  const match = db.rows.find((row) =>
                    filters.every(([c, v]) => row[c as keyof EntryRow] === v),
                  );
                  if (match) Object.assign(match, patch);
                  return { error: null };
                },
              };
            },
          };
        },
      }),
      select: () => builder,
      eq: (column: string, value: unknown) => {
        filters.push([column, value]);
        return builder;
      },
      order: async () => ({
        data: db.rows.filter((row) =>
          filters.every(([c, v]) => row[c as keyof EntryRow] === v),
        ),
        error: null,
      }),
    };
    void table;
    return builder;
  }

  return {
    db,
    makeBuilder,
    member: {
      ok: true as boolean,
      userId: "user-1",
      workspaceId: "ws-1",
      error: "",
    },
  };
});

vi.mock("@/app/_lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: (table: string) => h.makeBuilder(table) }),
}));

vi.mock("@/app/_lib/composio/workspace-auth", () => ({
  requireAuthenticatedWorkspaceMember: async () =>
    h.member.ok
      ? { ok: true, userId: h.member.userId, workspaceId: h.member.workspaceId }
      : { ok: false, error: h.member.error },
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { addCustomizeEntry, revertCustomizeEntry } from "./actions";

beforeEach(() => {
  h.db.rows.length = 0;
  h.member.ok = true;
});

describe("addCustomizeEntry", () => {
  it("writes an active entry with the caller's workspace and user", async () => {
    const result = await addCustomizeEntry({
      entityType: "person",
      body: "Accountants are not clients",
      source: "user",
    });

    expect(result.success).toBe(true);
    expect(h.db.rows).toHaveLength(1);
    expect(h.db.rows[0]).toMatchObject({
      workspace_id: "ws-1",
      entity_type: "person",
      body: "Accountants are not clients",
      source: "user",
      status: "active",
      created_by: "user-1",
    });
  });

  it("rejects a body over 500 characters", async () => {
    const result = await addCustomizeEntry({
      entityType: "person",
      body: "x".repeat(501),
      source: "user",
    });

    expect(result).toEqual({
      success: false,
      error: "Entries are 1–500 characters and belong to a record type.",
    });
    expect(h.db.rows).toHaveLength(0);
  });

  it("rejects deferred record types (billing/me are not v1 tabs)", async () => {
    const result = await addCustomizeEntry({
      entityType: "billing",
      body: "Never touch invoice status",
      source: "user",
    });

    expect(result.success).toBe(false);
    expect(h.db.rows).toHaveLength(0);
  });

  it("rejects source=reflection — Salt-authored additions are Phase M6", async () => {
    const result = await addCustomizeEntry({
      entityType: "person",
      body: "Salt noticed a pattern",
      source: "reflection",
    });

    expect(result.success).toBe(false);
    expect(h.db.rows).toHaveLength(0);
  });

  it("fails closed when the caller is not a workspace member", async () => {
    h.member.ok = false;
    h.member.error = "Not authenticated";

    const result = await addCustomizeEntry({
      entityType: "person",
      body: "test",
      source: "user",
    });

    expect(result).toEqual({ success: false, error: "Not authenticated" });
    expect(h.db.rows).toHaveLength(0);
  });
});

describe("revertCustomizeEntry", () => {
  it("flips status to reverted — the row is kept for audit", async () => {
    const added = await addCustomizeEntry({
      entityType: "work",
      body: "Inquiry emails are not work",
      source: "correction",
    });
    if (!added.success) throw new Error("setup failed");

    const result = await revertCustomizeEntry(added.data.id);

    expect(result).toEqual({ success: true });
    expect(h.db.rows[0].status).toBe("reverted");
  });

  it("rejects a non-uuid id", async () => {
    const result = await revertCustomizeEntry("not-a-uuid");
    expect(result.success).toBe(false);
  });
});
