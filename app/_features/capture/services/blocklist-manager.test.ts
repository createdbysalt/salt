import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

/**
 * Parity suite for the blocklist facade (Connector Rules & Learning, P2).
 *
 * The facade's public API and behaviour are unchanged from the
 * capture_blocklist era; storage is now workspace-wide deny rows in
 * `connector_rules`. This mock serves connector_rules rows — every test
 * assertion below is byte-identical to the pre-migration suite.
 */

type MockRow = {
  id: string;
  workspace_id: string;
  provider: string | null;
  area: string | null;
  rule_type: "allow" | "deny";
  entity_type: string;
  entity_key: string;
  reason: string | null;
  source: "user" | "suggested";
  created_at: string;
  created_by: string | null;
};

const BLOCKLIST_TO_ENTITY_TYPE = {
  domain: "domain",
  email: "sender_email",
  sender_pattern: "sender_pattern",
} as const;

function ruleRow(input: {
  id: string;
  type: "domain" | "email" | "sender_pattern";
  value: string;
  reason?: string | null;
  created_by?: string | null;
}): MockRow {
  return {
    id: input.id,
    workspace_id: "ws-1",
    provider: null,
    area: null,
    rule_type: "deny",
    entity_type: BLOCKLIST_TO_ENTITY_TYPE[input.type],
    entity_key: input.value,
    reason: input.reason ?? null,
    source: "user",
    created_at: "2026-07-12T00:00:00Z",
    created_by: input.created_by ?? null,
  };
}

let mockRows: MockRow[] = [];
let mockQueryError: { message: string } | null = null;
let mockOrCalls: string[] = [];
let insertCounter = 0;

/**
 * In-memory connector_rules simulation: filters accumulate via eq()/is()
 * and are applied against mockRows at resolution, so tests exercise real
 * query semantics (exact type+value pairs) instead of canned responses.
 */
function createQueryBuilder() {
  const filters: Array<[string, unknown]> = [];
  let orderBy: [string, boolean] | null = null;
  let limitCount: number | undefined;
  let rangeBounds: [number, number] | undefined;
  let deleteMode = false;
  let insertedRow: MockRow | null = null;

  const matches = (row: MockRow) =>
    filters.every(([col, val]) => row[col as keyof MockRow] === val);

  const resolveRows = () => {
    if (mockQueryError) {
      return { data: null, error: mockQueryError };
    }
    if (deleteMode) {
      mockRows = mockRows.filter((row) => !matches(row));
      return { data: null, error: null };
    }
    let out = mockRows.filter(matches);
    if (orderBy) {
      const [col, ascending] = orderBy;
      out = [...out].sort((a, b) => {
        const aVal = String(a[col as keyof MockRow] ?? "");
        const bVal = String(b[col as keyof MockRow] ?? "");
        const cmp = aVal.localeCompare(bVal);
        return ascending ? cmp : -cmp;
      });
    }
    if (rangeBounds !== undefined) {
      out = out.slice(rangeBounds[0], rangeBounds[1] + 1);
    }
    if (limitCount !== undefined) {
      out = out.slice(0, limitCount);
    }
    return { data: out, error: null };
  };

  const chain = {
    select: () => chain,
    eq: (col: string, val: unknown) => {
      filters.push([col, val]);
      return chain;
    },
    is: (col: string, val: unknown) => {
      filters.push([col, val]);
      return chain;
    },
    or: (expr: string) => {
      mockOrCalls.push(expr);
      return chain;
    },
    order: (col: string, opts?: { ascending?: boolean }) => {
      orderBy = [col, opts?.ascending ?? true];
      return chain;
    },
    limit: (n: number) => {
      limitCount = n;
      return chain;
    },
    range: (from: number, to: number) => {
      rangeBounds = [from, to];
      return chain;
    },
    insert: (row: Record<string, unknown>) => {
      insertCounter++;
      insertedRow = {
        id: `inserted-${insertCounter}`,
        workspace_id: row.workspace_id as string,
        provider: (row.provider as string | null) ?? null,
        area: (row.area as string | null) ?? null,
        rule_type: (row.rule_type as "allow" | "deny") ?? "deny",
        entity_type: row.entity_type as string,
        entity_key: row.entity_key as string,
        reason: (row.reason as string | null) ?? null,
        source: (row.source as "user" | "suggested") ?? "user",
        created_at: "2026-08-07T00:00:00Z",
        created_by: (row.created_by as string | null) ?? null,
      };
      mockRows.push(insertedRow);
      return chain;
    },
    delete: () => {
      deleteMode = true;
      return chain;
    },
    maybeSingle: () => {
      const { data, error } = resolveRows();
      return Promise.resolve({
        data: error ? null : ((data as MockRow[] | null)?.[0] ?? null),
        error,
      });
    },
    single: () => {
      if (insertedRow) {
        return Promise.resolve({ data: insertedRow, error: null });
      }
      const { data, error } = resolveRows();
      return Promise.resolve({
        data: (data as MockRow[] | null)?.[0] ?? null,
        error,
      });
    },
    then: (
      onFulfilled: (value: unknown) => unknown,
      onRejected?: (reason: unknown) => unknown
    ) => Promise.resolve(resolveRows()).then(onFulfilled, onRejected),
  };

  return chain;
}

vi.mock("@/app/_lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn((table: string) =>
      table === "connector_rules" ? createQueryBuilder() : {}
    ),
  })),
}));

const SEED_ENTRY: MockRow = ruleRow({
  id: "entry-1",
  type: "domain",
  value: "spam.com",
  reason: "Known spam domain",
  created_by: "user-1",
});

describe("Blocklist Manager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRows = [{ ...SEED_ENTRY }];
    mockQueryError = null;
    mockOrCalls = [];
    insertCounter = 0;
  });

  describe("normalizeBlocklistValue (via addBlocklistEntry)", () => {
    it("normalizes domain values to lowercase without @ prefix", async () => {
      const { addBlocklistEntry } = await import("./blocklist-manager");

      const result = await addBlocklistEntry({
        workspaceId: "ws-1",
        type: "domain",
        value: "@EXAMPLE.COM",
      });

      expect(result.success).toBe(true);
    });

    it("normalizes email values to lowercase", async () => {
      const { addBlocklistEntry } = await import("./blocklist-manager");

      const result = await addBlocklistEntry({
        workspaceId: "ws-1",
        type: "email",
        value: "Test@Example.COM",
      });

      expect(result.success).toBe(true);
    });

    it("validates sender_pattern as glob syntax", async () => {
      const { addBlocklistEntry } = await import("./blocklist-manager");

      const validResult = await addBlocklistEntry({
        workspaceId: "ws-1",
        type: "sender_pattern",
        value: "*noreply*",
      });

      expect(validResult.success).toBe(true);
    });

    it("rejects invalid glob patterns", async () => {
      const { addBlocklistEntry } = await import("./blocklist-manager");

      const invalidResult = await addBlocklistEntry({
        workspaceId: "ws-1",
        type: "sender_pattern",
        value: "[invalid(regex",
      });

      expect(invalidResult.success).toBe(false);
      expect(invalidResult.error).toBe("Invalid value format");
    });

    it("rejects empty values", async () => {
      const { addBlocklistEntry } = await import("./blocklist-manager");

      const result = await addBlocklistEntry({
        workspaceId: "ws-1",
        type: "domain",
        value: "   ",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Invalid value format");
    });
  });

  describe("mapBlocklistEntry", () => {
    it("maps database row to BlocklistEntry type", async () => {
      const { getBlocklistEntries } = await import("./blocklist-manager");

      const entries = await getBlocklistEntries("ws-1");

      expect(entries).toHaveLength(1);
      expect(entries[0]).toEqual({
        id: "entry-1",
        workspaceId: "ws-1",
        type: "domain",
        value: "spam.com",
        reason: "Known spam domain",
        createdAt: "2026-07-12T00:00:00Z",
        createdBy: "user-1",
      });
    });
  });

  describe("removeBlocklistEntry", () => {
    it("removes entry successfully", async () => {
      const { removeBlocklistEntry } = await import("./blocklist-manager");

      const result = await removeBlocklistEntry("ws-1", "entry-1");

      expect(result.success).toBe(true);
    });
  });

  describe("isBlocked", () => {
    it("blocks senders whose domain is on the blocklist", async () => {
      const { isBlocked } = await import("./blocklist-manager");

      const result = await isBlocked("ws-1", { domain: "SPAM.com" });

      expect(result.blocked).toBe(true);
      expect(result.matchedEntry?.value).toBe("spam.com");
    });

    it("blocks senders whose email is on the blocklist", async () => {
      mockRows.push(
        ruleRow({ id: "entry-2", type: "email", value: "bad@evil.com" }),
      );
      const { isBlocked } = await import("./blocklist-manager");

      const result = await isBlocked("ws-1", { email: "Bad@Evil.com" });

      expect(result.blocked).toBe(true);
      expect(result.matchedEntry?.value).toBe("bad@evil.com");
    });

    it("returns not-blocked for a clean sender", async () => {
      const { isBlocked } = await import("./blocklist-manager");

      const result = await isBlocked("ws-1", {
        domain: "good.com",
        email: "someone@good.com",
      });

      expect(result.blocked).toBe(false);
    });

    it("does not cross-match values across entry types", async () => {
      // A sender_pattern row must only apply to senderName matching — a
      // domain check for the same string must not hit it.
      mockRows.push(
        ruleRow({ id: "entry-4", type: "sender_pattern", value: "promo.net" }),
      );
      const { isBlocked } = await import("./blocklist-manager");

      const result = await isBlocked("ws-1", { domain: "promo.net" });

      expect(result.blocked).toBe(false);
    });

    it("fails closed when the email is not email-shaped", async () => {
      const { isBlocked } = await import("./blocklist-manager");

      const result = await isBlocked("ws-1", { email: "spam.com" });

      expect(result.blocked).toBe(true);
      expect(result.reason).toMatch(/validation/i);
    });

    it("never passes sender input through a raw or() filter", async () => {
      const { isBlocked } = await import("./blocklist-manager");

      await isBlocked("ws-1", {
        domain: "good.com",
        email: "someone@good.com",
      });

      expect(mockOrCalls).toHaveLength(0);
    });

    it("fails closed when the email carries PostgREST filter syntax", async () => {
      const { isBlocked } = await import("./blocklist-manager");

      const result = await isBlocked("ws-1", {
        email: "x@evil.com,value.neq.zzz",
      });

      expect(result.blocked).toBe(true);
      expect(result.reason).toMatch(/validation/i);
      expect(result.matchedEntry).toBeUndefined();
      expect(mockOrCalls).toHaveLength(0);
    });

    it("fails closed on parenthesis injection in the domain", async () => {
      const { isBlocked } = await import("./blocklist-manager");

      const result = await isBlocked("ws-1", {
        domain: "evil.com),and(type.eq.x",
      });

      expect(result.blocked).toBe(true);
      expect(result.reason).toMatch(/validation/i);
      expect(mockOrCalls).toHaveLength(0);
    });

    it("still enforces sender-name glob patterns", async () => {
      mockRows.push(
        ruleRow({
          id: "entry-3",
          type: "sender_pattern",
          value: "*newsletter*",
        }),
      );
      const { isBlocked } = await import("./blocklist-manager");

      const result = await isBlocked("ws-1", {
        senderName: "Weekly Newsletter Digest",
      });

      expect(result.blocked).toBe(true);
    });

    it("enforces sender patterns past the 100-row page boundary (2.10 pagination)", async () => {
      // 149 non-matching patterns, the matching one is row #150 — a flat
      // .limit(100) would silently never evaluate it.
      for (let i = 0; i < 149; i++) {
        mockRows.push(
          ruleRow({
            id: `pat-${String(i).padStart(3, "0")}`,
            type: "sender_pattern",
            value: `*no-match-${i}*`,
          }),
        );
      }
      mockRows.push(
        ruleRow({
          id: "pat-150",
          type: "sender_pattern",
          value: "*newsletter*",
        }),
      );
      const { isBlocked } = await import("./blocklist-manager");

      const result = await isBlocked("ws-1", {
        senderName: "Weekly Newsletter Digest",
      });

      expect(result.blocked).toBe(true);
      expect(result.matchedEntry?.id).toBe("pat-150");
    });

    it("fails open when the blocklist query itself errors", async () => {
      // An infra failure on this table must not drop ALL inbound mail;
      // hostile input never reaches the query — it fails closed above.
      mockQueryError = { message: "connection refused" };
      const { isBlocked } = await import("./blocklist-manager");

      const result = await isBlocked("ws-1", { domain: "good.com" });

      expect(result.blocked).toBe(false);
    });
  });
});
