import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const queryFilters: Array<{ method: string; args: unknown[] }> = [];
let queryResult: { data: unknown[] | null; error: { message: string } | null } = {
  data: [],
  error: null,
};

function makeChain() {
  // Supabase builders are chainable AND thenable — filters may be appended
  // after limit(), and the final chain is awaited directly.
  const chain: Record<string, unknown> = {};
  for (const method of ["select", "eq", "gte", "order", "limit"]) {
    chain[method] = vi.fn((...args: unknown[]) => {
      queryFilters.push({ method, args });
      return chain;
    });
  }
  chain.then = (resolve: (value: unknown) => void) => resolve(queryResult);
  return chain;
}

vi.mock("@/app/_lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn(() => makeChain()),
  })),
}));

import {
  findBlockingCorrection,
  getCorrectionBlocklist,
  type CorrectionBlockEntry,
} from "./correction-blocklist";

function entry(
  fieldPath: string,
  wrongValue: unknown,
  overrides: Partial<CorrectionBlockEntry> = {}
): CorrectionBlockEntry {
  return {
    id: "corr-1",
    fieldPath,
    wrongValue,
    reason: "never_true",
    createdAt: "2026-08-01T00:00:00Z",
    ...overrides,
  };
}

describe("findBlockingCorrection", () => {
  it("blocks an exact scalar value match", () => {
    const blocklist = [entry("company", "Acme Inc")];
    expect(findBlockingCorrection(blocklist, "company", "Acme Inc")).not.toBeNull();
  });

  it("does not block a different value for the same field", () => {
    const blocklist = [entry("company", "Acme Inc")];
    expect(findBlockingCorrection(blocklist, "company", "Meridian Corp")).toBeNull();
  });

  it("does not block other fields", () => {
    const blocklist = [entry("company", "Acme Inc")];
    expect(findBlockingCorrection(blocklist, "role", "Acme Inc")).toBeNull();
  });

  it("blocks merge candidates by targetId even when metadata differs", () => {
    const blocklist = [
      entry(
        "_merge_candidate",
        // UI dismissals store the display string
        JSON.stringify({ targetId: "p2", targetName: "Lisa T.", signal: "same_email" })
      ),
    ];
    const reproposed = { targetId: "p2", targetName: "Jane Example", signal: "same_phone" };
    expect(
      findBlockingCorrection(blocklist, "_merge_candidate", reproposed)
    ).not.toBeNull();
  });

  it("allows merge candidates against a different target", () => {
    const blocklist = [
      entry("_merge_candidate", JSON.stringify({ targetId: "p2" })),
    ];
    expect(
      findBlockingCorrection(blocklist, "_merge_candidate", { targetId: "p3" })
    ).toBeNull();
  });

  it("blocks link candidates by targetId", () => {
    const blocklist = [entry("_link_candidate", { targetId: "org-1" })];
    expect(
      findBlockingCorrection(blocklist, "_link_candidate", {
        targetId: "org-1",
        targetName: "Acme",
        reason: "domain_match",
      })
    ).not.toBeNull();
  });

  it("blocks any archive candidate after one dismissal", () => {
    const blocklist = [
      entry("_archive_candidate", { reason: "stale", daysSinceActivity: 120 }),
    ];
    expect(
      findBlockingCorrection(blocklist, "_archive_candidate", {
        reason: "stale",
        daysSinceActivity: 240,
      })
    ).not.toBeNull();
  });

  it("matches string-stored values against raw proposals", () => {
    const blocklist = [entry("relationship_type", "client")];
    expect(
      findBlockingCorrection(blocklist, "relationship_type", "client")
    ).not.toBeNull();
  });
});

describe("getCorrectionBlocklist", () => {
  beforeEach(() => {
    queryFilters.length = 0;
    queryResult = { data: [], error: null };
  });

  it("scopes by workspace, entity, and TTL cutoff", async () => {
    await getCorrectionBlocklist("ws-1", "person", "p-1");

    const eqCalls = queryFilters.filter((f) => f.method === "eq");
    expect(eqCalls.map((c) => c.args)).toEqual(
      expect.arrayContaining([
        ["workspace_id", "ws-1"],
        ["entity_type", "person"],
        ["entity_id", "p-1"],
      ])
    );
    expect(queryFilters.some((f) => f.method === "gte")).toBe(true);
  });

  it("maps rows into entries", async () => {
    queryResult = {
      data: [
        {
          id: "c-1",
          field_path: "company",
          wrong_value: "Acme Inc",
          correction_reason: "never_true",
          created_at: "2026-08-01T00:00:00Z",
        },
      ],
      error: null,
    };

    const blocklist = await getCorrectionBlocklist("ws-1", "person", "p-1", "company");
    expect(blocklist).toHaveLength(1);
    expect(blocklist[0]).toMatchObject({
      id: "c-1",
      fieldPath: "company",
      wrongValue: "Acme Inc",
    });
  });

  it("fails open on read errors", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    queryResult = { data: null, error: { message: "boom" } };

    const blocklist = await getCorrectionBlocklist("ws-1", "person", "p-1");
    expect(blocklist).toEqual([]);

    consoleError.mockRestore();
  });
});
