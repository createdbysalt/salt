import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * person-emails — multi-email identity: resolution by any address, primary
 * enforcement, attach semantics, and merge union.
 */

const h = vi.hoisted(() => {
  interface Row {
    [key: string]: unknown;
  }

  const db = {
    personEmails: [] as Row[],
    people: [] as Row[],
  };

  type Filter = (row: Row) => boolean;

  function applyFilters(rows: Row[], filters: Filter[]) {
    return rows.filter((row) => filters.every((f) => f(row)));
  }

  function query(rows: Row[]) {
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
      in: (column: string, values: unknown[]) => {
        filters.push((row) => values.includes(row[column]));
        return builder;
      },
      ilike: (column: string, pattern: string) => {
        const needle = pattern.replace(/\\([%_\\])/g, "$1").toLowerCase();
        filters.push(
          (row) => (row[column] as string | null)?.toLowerCase() === needle,
        );
        return builder;
      },
      limit: () => builder,
      maybeSingle: async () => ({
        data: applyFilters(rows, filters)[0] ?? null,
        error: null,
      }),
      insert: async (row: Row) => {
        // Honor the (workspace_id, email) uniqueness.
        const clash = db.personEmails.find(
          (existing) =>
            existing.workspace_id === row.workspace_id &&
            existing.email === row.email,
        );
        if (clash) {
          return {
            data: null,
            error: { message: "duplicate key value violates unique constraint" },
          };
        }
        db.personEmails.push({ id: `pe-${db.personEmails.length + 1}`, ...row });
        return { data: row, error: null };
      },
      update: (patch: Row) => {
        const updateFilters: Filter[] = [];
        const updateBuilder = {
          eq: (column: string, value: unknown) => {
            updateFilters.push((row) => row[column] === value);
            return updateBuilder;
          },
          in: (column: string, values: unknown[]) => {
            updateFilters.push((row) => values.includes(row[column]));
            return updateBuilder;
          },
          then: (resolve: (value: { data: null; error: null }) => void) => {
            for (const row of applyFilters(rows, updateFilters)) {
              Object.assign(row, patch);
            }
            resolve({ data: null, error: null });
          },
        };
        return updateBuilder;
      },
      delete: () => {
        const deleteFilters: Filter[] = [];
        const deleteBuilder = {
          in: (column: string, values: unknown[]) => {
            deleteFilters.push((row) => values.includes(row[column]));
            return deleteBuilder;
          },
          then: (resolve: (value: { data: null; error: null }) => void) => {
            const doomed = new Set(applyFilters(rows, deleteFilters));
            for (let i = rows.length - 1; i >= 0; i--) {
              if (doomed.has(rows[i])) rows.splice(i, 1);
            }
            resolve({ data: null, error: null });
          },
        };
        return deleteBuilder;
      },
      then: (resolve: (value: { data: Row[]; error: null }) => void) =>
        resolve({ data: applyFilters(rows, filters), error: null }),
    };
    return builder;
  }

  function fakeAdmin() {
    return {
      from: (table: string) => {
        if (table === "person_emails") return query(db.personEmails);
        if (table === "people") return query(db.people);
        throw new Error(`unexpected table ${table}`);
      },
    };
  }

  function resetDb() {
    db.personEmails.length = 0;
    db.people.length = 0;
  }

  return { db, resetDb, fakeAdmin };
});

import {
  attachPersonEmail,
  findPersonIdsByEmail,
  normalizeEmail,
  unionPersonEmailsOnMerge,
} from "./person-emails";

type Admin = Parameters<typeof findPersonIdsByEmail>[0];
const admin = () => h.fakeAdmin() as unknown as Admin;

describe("normalizeEmail", () => {
  it("lowercases and trims", () => {
    expect(normalizeEmail("  jane.example@outlook.com ")).toBe(
      "jane.example@outlook.com",
    );
  });
});

describe("findPersonIdsByEmail", () => {
  beforeEach(() => h.resetDb());

  it("resolves by a secondary person_emails address", async () => {
    h.db.people.push({
      id: "p1",
      workspace_id: "ws",
      email: "jane@studio.com",
      deleted_at: null,
    });
    h.db.personEmails.push(
      { person_id: "p1", workspace_id: "ws", email: "jane@studio.com", is_primary: true },
      { person_id: "p1", workspace_id: "ws", email: "jane.example@outlook.com", is_primary: false },
    );

    const ids = await findPersonIdsByEmail(admin(), "ws", "jane.example@outlook.com");
    expect(ids).toEqual(["p1"]);
  });

  it("falls back to people.email when no person_emails row exists", async () => {
    h.db.people.push({
      id: "p1",
      workspace_id: "ws",
      email: "maya@acme.com",
      deleted_at: null,
    });

    const ids = await findPersonIdsByEmail(admin(), "ws", "Maya@Acme.com");
    expect(ids).toEqual(["p1"]);
  });

  it("never crosses the tenant boundary", async () => {
    h.db.personEmails.push({
      person_id: "p-other",
      workspace_id: "ws-other",
      email: "jane@studio.com",
    });

    const ids = await findPersonIdsByEmail(admin(), "ws", "jane@studio.com");
    expect(ids).toEqual([]);
  });
});

describe("attachPersonEmail", () => {
  beforeEach(() => h.resetDb());

  it("makes the first attached address primary and syncs people.email", async () => {
    h.db.people.push({ id: "p1", workspace_id: "ws", email: null });

    const result = await attachPersonEmail(admin(), {
      workspaceId: "ws",
      personId: "p1",
      email: "Jane@Studio.com",
      source: "capture",
    });

    expect(result.attached).toBe(true);
    expect(h.db.personEmails[0]).toMatchObject({
      person_id: "p1",
      email: "jane@studio.com",
      is_primary: true,
    });
    expect(h.db.people[0].email).toBe("jane@studio.com");
  });

  it("attaches a second address as non-primary and leaves people.email alone", async () => {
    h.db.people.push({ id: "p1", workspace_id: "ws", email: "jane@studio.com" });
    h.db.personEmails.push({
      person_id: "p1",
      workspace_id: "ws",
      email: "jane@studio.com",
      is_primary: true,
    });

    const result = await attachPersonEmail(admin(), {
      workspaceId: "ws",
      personId: "p1",
      email: "jane.example@outlook.com",
      source: "capture",
    });

    expect(result.attached).toBe(true);
    const row = h.db.personEmails.find((r) => r.email === "jane.example@outlook.com");
    expect(row?.is_primary).toBe(false);
    expect(h.db.people[0].email).toBe("jane@studio.com");
  });

  it("refuses to attach an address owned by a different person", async () => {
    h.db.personEmails.push({
      person_id: "p1",
      workspace_id: "ws",
      email: "jane@studio.com",
      is_primary: true,
    });

    const result = await attachPersonEmail(admin(), {
      workspaceId: "ws",
      personId: "p2",
      email: "jane@studio.com",
      source: "capture",
    });

    expect(result.attached).toBe(false);
    expect(result.reason).toMatch(/different person/);
  });

  it("is a no-op when the person already knows the address", async () => {
    h.db.personEmails.push({
      person_id: "p1",
      workspace_id: "ws",
      email: "jane@studio.com",
      is_primary: true,
    });

    const result = await attachPersonEmail(admin(), {
      workspaceId: "ws",
      personId: "p1",
      email: "jane@studio.com",
      source: "capture",
    });

    expect(result).toEqual({ attached: false, reason: "already attached" });
    expect(h.db.personEmails).toHaveLength(1);
  });

  it("explicit primary promotion demotes the old primary", async () => {
    h.db.people.push({ id: "p1", workspace_id: "ws", email: "jane@studio.com" });
    h.db.personEmails.push({
      person_id: "p1",
      workspace_id: "ws",
      email: "jane@studio.com",
      is_primary: true,
    });

    await attachPersonEmail(admin(), {
      workspaceId: "ws",
      personId: "p1",
      email: "jane.example@outlook.com",
      source: "manual",
      primary: true,
    });

    const primaries = h.db.personEmails.filter((r) => r.is_primary === true);
    expect(primaries).toHaveLength(1);
    expect(primaries[0].email).toBe("jane.example@outlook.com");
    expect(h.db.people[0].email).toBe("jane.example@outlook.com");
  });
});

describe("unionPersonEmailsOnMerge", () => {
  beforeEach(() => h.resetDb());

  it("moves the loser's addresses to the winner, keeping the winner's primary", async () => {
    h.db.people.push({ id: "winner", workspace_id: "ws", email: "jane@studio.com" });
    h.db.personEmails.push(
      { id: "w1", person_id: "winner", workspace_id: "ws", email: "jane@studio.com", is_primary: true },
      { id: "l1", person_id: "loser", workspace_id: "ws", email: "jane.example@outlook.com", is_primary: true },
    );

    await unionPersonEmailsOnMerge(admin(), "ws", "winner", "loser");

    const winnerRows = h.db.personEmails.filter((r) => r.person_id === "winner");
    expect(winnerRows.map((r) => r.email).sort()).toEqual([
      "jane.example@outlook.com",
      "jane@studio.com",
    ]);
    expect(winnerRows.filter((r) => r.is_primary === true)).toHaveLength(1);
    expect(
      winnerRows.find((r) => r.email === "jane@studio.com")?.is_primary,
    ).toBe(true);
    expect(h.db.personEmails.some((r) => r.person_id === "loser")).toBe(false);
  });

  it("drops addresses the winner already has instead of violating uniqueness", async () => {
    h.db.people.push({ id: "winner", workspace_id: "ws", email: "jane@studio.com" });
    h.db.personEmails.push(
      { id: "w1", person_id: "winner", workspace_id: "ws", email: "jane@studio.com", is_primary: true },
      { id: "l1", person_id: "loser", workspace_id: "ws", email: "jane@studio.com", is_primary: true },
    );

    await unionPersonEmailsOnMerge(admin(), "ws", "winner", "loser");

    expect(h.db.personEmails).toHaveLength(1);
    expect(h.db.personEmails[0]).toMatchObject({
      person_id: "winner",
      email: "jane@studio.com",
      is_primary: true,
    });
  });
});
