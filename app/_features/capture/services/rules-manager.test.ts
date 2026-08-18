import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

type MockRow = {
  id: string;
  workspace_id: string;
  provider: string | null;
  area: string | null;
  rule_type: string;
  entity_type: string;
  entity_key: string;
  reason: string | null;
  source: string;
  created_by: string | null;
  created_at: string;
};

let mockRows: MockRow[] = [];
let mockQueryError: { message: string } | null = null;
let mockOrCalls: string[] = [];
let insertCounter = 0;

/**
 * In-memory connector_rules simulation, same approach as the blocklist
 * suite: eq() filters accumulate and apply at resolution so tests exercise
 * real query semantics.
 */
function createQueryBuilder() {
  const filters: Array<[string, unknown]> = [];
  let isNullCols: string[] = [];
  let limitCount: number | undefined;
  let rangeBounds: [number, number] | undefined;
  let deleteMode = false;
  let insertedRow: MockRow | null = null;

  const matches = (row: MockRow) =>
    filters.every(([col, val]) => row[col as keyof MockRow] === val) &&
    isNullCols.every((col) => row[col as keyof MockRow] === null);

  const resolveRows = () => {
    if (mockQueryError) {
      return { data: null, error: mockQueryError };
    }
    if (deleteMode) {
      mockRows = mockRows.filter((row) => !matches(row));
      return { data: null, error: null };
    }
    let out = mockRows.filter(matches);
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
      if (val === null) isNullCols.push(col);
      else filters.push([col, val]);
      return chain;
    },
    or: (expr: string) => {
      mockOrCalls.push(expr);
      return chain;
    },
    order: () => chain,
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
        id: `rule-${insertCounter}`,
        workspace_id: row.workspace_id as string,
        provider: (row.provider as string | null) ?? null,
        area: (row.area as string | null) ?? null,
        rule_type: row.rule_type as string,
        entity_type: row.entity_type as string,
        entity_key: row.entity_key as string,
        reason: (row.reason as string | null) ?? null,
        source: (row.source as string | null) ?? "user",
        created_by: (row.created_by as string | null) ?? null,
        created_at: "2026-08-10T00:00:00Z",
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
      onRejected?: (reason: unknown) => unknown,
    ) => Promise.resolve(resolveRows()).then(onFulfilled, onRejected),
  };

  return chain;
}

vi.mock("@/app/_lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn((table: string) =>
      table === "connector_rules" ? createQueryBuilder() : {},
    ),
  })),
}));

function seedRule(overrides: Partial<MockRow> = {}): MockRow {
  const row: MockRow = {
    id: `seed-${mockRows.length + 1}`,
    workspace_id: "ws-1",
    provider: null,
    area: null,
    rule_type: "deny",
    entity_type: "sender_email",
    entity_key: "spam@junk.com",
    reason: null,
    source: "user",
    created_by: null,
    created_at: "2026-08-10T00:00:00Z",
    ...overrides,
  };
  mockRows.push(row);
  return row;
}

import {
  getRules,
  addRule,
  removeRule,
  checkRules,
} from "./rules-manager";

beforeEach(() => {
  vi.clearAllMocks();
  mockRows = [];
  mockQueryError = null;
  mockOrCalls = [];
  insertCounter = 0;
});

describe("addRule", () => {
  it("inserts a provider-scoped allow rule with normalized key", async () => {
    const result = await addRule({
      workspaceId: "ws-1",
      provider: "gmail",
      ruleType: "allow",
      entityType: "sender_email",
      entityKey: "Alice@Example.COM",
    });

    expect(result.success).toBe(true);
    expect(result.rule?.entityKey).toBe("alice@example.com");
    expect(result.rule?.provider).toBe("gmail");
    expect(result.rule?.ruleType).toBe("allow");
  });

  it("rejects a duplicate (same workspace/provider/type/entity)", async () => {
    seedRule();

    const result = await addRule({
      workspaceId: "ws-1",
      provider: null,
      ruleType: "deny",
      entityType: "sender_email",
      entityKey: "spam@junk.com",
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/already exists/i);
  });

  it("treats provider-scoped and workspace-wide rules as distinct", async () => {
    seedRule();

    const result = await addRule({
      workspaceId: "ws-1",
      provider: "gmail",
      ruleType: "deny",
      entityType: "sender_email",
      entityKey: "spam@junk.com",
    });

    expect(result.success).toBe(true);
  });

  it("rejects invalid sender_pattern globs", async () => {
    const result = await addRule({
      workspaceId: "ws-1",
      provider: null,
      ruleType: "deny",
      entityType: "sender_pattern",
      entityKey: "[invalid(regex",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Invalid value format");
  });

  it("rejects empty keys", async () => {
    const result = await addRule({
      workspaceId: "ws-1",
      provider: null,
      ruleType: "deny",
      entityType: "domain",
      entityKey: "   ",
    });

    expect(result.success).toBe(false);
  });
});

describe("getRules / removeRule", () => {
  it("lists rules filtered by provider scope", async () => {
    seedRule();
    seedRule({ provider: "gmail", rule_type: "allow", entity_key: "vip@co.com" });

    const all = await getRules("ws-1");
    const gmailOnly = await getRules("ws-1", { provider: "gmail" });

    expect(all).toHaveLength(2);
    expect(gmailOnly).toHaveLength(1);
    expect(gmailOnly[0].provider).toBe("gmail");
  });

  it("removes a rule by id", async () => {
    const rule = seedRule();

    const result = await removeRule("ws-1", rule.id);

    expect(result.success).toBe(true);
    expect(mockRows).toHaveLength(0);
  });
});

describe("checkRules precedence", () => {
  it("returns null when no rule matches", async () => {
    const result = await checkRules("ws-1", {
      provider: "gmail",
      entity: { type: "sender_email", key: "someone@good.com" },
    });

    expect(result.verdict).toBeNull();
  });

  it("deny wins over allow for the same entity", async () => {
    seedRule({ rule_type: "allow", entity_key: "both@co.com" });
    seedRule({ rule_type: "deny", entity_key: "both@co.com" });

    const result = await checkRules("ws-1", {
      provider: "gmail",
      entity: { type: "sender_email", key: "both@co.com" },
    });

    expect(result.verdict).toBe("deny");
  });

  it("provider-scoped rules beat workspace-wide rules", async () => {
    seedRule({ rule_type: "allow", provider: null, entity_key: "vip@co.com" });
    seedRule({ rule_type: "deny", provider: "gmail", entity_key: "vip@co.com" });

    const gmail = await checkRules("ws-1", {
      provider: "gmail",
      entity: { type: "sender_email", key: "vip@co.com" },
    });
    expect(gmail.verdict).toBe("deny");
    expect(gmail.rule?.provider).toBe("gmail");

    // Another provider sees only the workspace-wide rule.
    const outlook = await checkRules("ws-1", {
      provider: "outlook",
      entity: { type: "sender_email", key: "vip@co.com" },
    });
    expect(outlook.verdict).toBe("allow");
    expect(outlook.rule?.provider).toBeNull();
  });

  it("derives domain rules from a sender_email key at check time", async () => {
    seedRule({ rule_type: "deny", entity_type: "domain", entity_key: "junk.com" });

    const result = await checkRules("ws-1", {
      provider: "gmail",
      entity: { type: "sender_email", key: "anyone@junk.com" },
    });

    expect(result.verdict).toBe("deny");
    expect(result.rule?.entityType).toBe("domain");
  });

  it("does not cross-match a domain rule against a non-email entity", async () => {
    seedRule({ rule_type: "deny", entity_type: "domain", entity_key: "junk.com" });

    const result = await checkRules("ws-1", {
      provider: "stripe",
      entity: { type: "customer", key: "junk.com" },
    });

    expect(result.verdict).toBeNull();
  });

  it("matches sender_pattern rules against pattern candidates (sender name)", async () => {
    seedRule({
      rule_type: "deny",
      entity_type: "sender_pattern",
      entity_key: "*newsletter*",
    });

    const result = await checkRules("ws-1", {
      provider: null,
      entity: { type: "sender_email", key: "anyone@somewhere.com" },
      patternCandidates: ["Weekly Newsletter Digest"],
    });

    expect(result.verdict).toBe("deny");
  });

  it("enforces pattern rules past the 100-row page boundary", async () => {
    for (let i = 0; i < 149; i++) {
      seedRule({
        rule_type: "deny",
        entity_type: "sender_pattern",
        entity_key: `*no-match-${i}*`,
      });
    }
    seedRule({
      rule_type: "deny",
      entity_type: "sender_pattern",
      entity_key: "*newsletter*",
    });

    const result = await checkRules("ws-1", {
      provider: null,
      entity: { type: "sender_email", key: "anyone@somewhere.com" },
      patternCandidates: ["Weekly Newsletter Digest"],
    });

    expect(result.verdict).toBe("deny");
  });

  it("never passes entity input through a raw or() filter", async () => {
    seedRule();

    await checkRules("ws-1", {
      provider: "gmail",
      entity: { type: "sender_email", key: "x@evil.com" },
    });

    expect(mockOrCalls).toHaveLength(0);
  });

  it("fails open when the rules query errors", async () => {
    mockQueryError = { message: "connection refused" };

    const result = await checkRules("ws-1", {
      provider: "gmail",
      entity: { type: "sender_email", key: "anyone@junk.com" },
    });

    expect(result.verdict).toBeNull();
  });

  it("matches non-email entities category-agnostically", async () => {
    seedRule({
      rule_type: "allow",
      provider: "slack",
      entity_type: "channel",
      entity_key: "C0123ABC",
    });

    const result = await checkRules("ws-1", {
      provider: "slack",
      entity: { type: "channel", key: "C0123ABC" },
    });

    expect(result.verdict).toBe("allow");
  });
});

describe("checkRules — area scope", () => {
  it("area-scoped rules fire for any provider in the area", async () => {
    seedRule({ rule_type: "deny", area: "email", entity_key: "spam@junk.com" });

    const outlook = await checkRules("ws-1", {
      provider: "outlook",
      area: "email",
      entity: { type: "sender_email", key: "spam@junk.com" },
    });
    expect(outlook.verdict).toBe("deny");
    expect(outlook.rule?.area).toBe("email");

    const gmail = await checkRules("ws-1", {
      provider: "gmail",
      area: "email",
      entity: { type: "sender_email", key: "spam@junk.com" },
    });
    expect(gmail.verdict).toBe("deny");
  });

  it("area-scoped rules do not fire outside their area", async () => {
    seedRule({ rule_type: "deny", area: "email", entity_key: "spam@junk.com" });

    const slack = await checkRules("ws-1", {
      provider: "slack",
      area: "messaging",
      entity: { type: "author", key: "spam@junk.com" },
    });
    expect(slack.verdict).toBeNull();
  });

  it("provider-scoped rules beat area-scoped rules", async () => {
    seedRule({ rule_type: "allow", area: "email", entity_key: "vip@co.com" });
    seedRule({
      rule_type: "deny",
      provider: "outlook",
      entity_key: "vip@co.com",
    });

    const result = await checkRules("ws-1", {
      provider: "outlook",
      area: "email",
      entity: { type: "sender_email", key: "vip@co.com" },
    });
    expect(result.verdict).toBe("deny");
    expect(result.rule?.provider).toBe("outlook");
  });

  it("area-scoped rules beat workspace-wide rules", async () => {
    seedRule({ rule_type: "allow", entity_key: "vip@co.com" });
    seedRule({ rule_type: "deny", area: "email", entity_key: "vip@co.com" });

    const result = await checkRules("ws-1", {
      provider: "gmail",
      area: "email",
      entity: { type: "sender_email", key: "vip@co.com" },
    });
    expect(result.verdict).toBe("deny");
    expect(result.rule?.area).toBe("email");
  });

  it("checks without an area see only provider and workspace-wide rules", async () => {
    seedRule({ rule_type: "deny", area: "email", entity_key: "spam@junk.com" });

    const result = await checkRules("ws-1", {
      provider: null,
      entity: { type: "sender_email", key: "spam@junk.com" },
    });
    expect(result.verdict).toBeNull();
  });
});

describe("addRule — area scope", () => {
  it("rejects a rule scoped to both a provider and an area", async () => {
    const result = await addRule({
      workspaceId: "ws-1",
      provider: "outlook",
      area: "email",
      ruleType: "deny",
      entityType: "sender_email",
      entityKey: "spam@junk.com",
    });

    expect(result.success).toBe(false);
    expect(mockRows).toHaveLength(0);
  });

  it("treats the same entity in different areas as distinct rules", async () => {
    seedRule({
      rule_type: "deny",
      area: "email",
      entity_type: "sender_email",
      entity_key: "shared@co.com",
    });

    const duplicate = await addRule({
      workspaceId: "ws-1",
      area: "email",
      ruleType: "deny",
      entityType: "sender_email",
      entityKey: "shared@co.com",
    });
    expect(duplicate.success).toBe(false);
    expect(duplicate.error).toBe("Rule already exists");

    const otherArea = await addRule({
      workspaceId: "ws-1",
      area: "messaging",
      ruleType: "deny",
      entityType: "sender_email",
      entityKey: "shared@co.com",
    });
    expect(otherArea.success).toBe(true);
    expect(otherArea.rule?.area).toBe("messaging");
  });
});

describe("checkRules — S5 vocabulary expansion", () => {
  it("matches subject_pattern rules against subject candidates", async () => {
    seedRule({
      rule_type: "deny",
      entity_type: "subject_pattern",
      entity_key: "*invoice*",
    });

    const result = await checkRules("ws-1", {
      provider: "gmail",
      entity: { type: "sender_email", key: "billing@vendor.com" },
      entityCandidates: { subject_pattern: ["Invoice #42 attached"] },
    });

    expect(result.verdict).toBe("deny");
    expect(result.rule?.entityType).toBe("subject_pattern");
  });

  it("matches title_pattern rules against title candidates (allow)", async () => {
    seedRule({
      rule_type: "allow",
      entity_type: "title_pattern",
      entity_key: "*standup*",
    });

    const result = await checkRules("ws-1", {
      provider: "googlecalendar",
      entity: null,
      entityCandidates: { title_pattern: ["Weekly standup with Sam"] },
    });

    expect(result.verdict).toBe("allow");
  });

  it("matches keyword rules against message text candidates", async () => {
    seedRule({
      rule_type: "deny",
      entity_type: "keyword",
      entity_key: "*unsubscribe*",
    });

    const result = await checkRules("ws-1", {
      provider: "slack",
      entity: null,
      entityCandidates: { keyword: ["please unsubscribe me from this"] },
    });

    expect(result.verdict).toBe("deny");
  });

  it("matches name_pattern rules against file name candidates", async () => {
    seedRule({
      rule_type: "deny",
      entity_type: "name_pattern",
      entity_key: "*template*",
    });

    const result = await checkRules("ws-1", {
      provider: "googledrive",
      entity: null,
      entityCandidates: { name_pattern: ["Brand Template v2.psd"] },
    });

    expect(result.verdict).toBe("deny");
  });

  it("matches attendee rules against candidate emails case-insensitively", async () => {
    seedRule({
      rule_type: "deny",
      entity_type: "attendee",
      entity_key: "bob@acme.com",
    });

    const result = await checkRules("ws-1", {
      provider: "googlecalendar",
      entity: null,
      entityCandidates: { attendee: ["Bob@Acme.com", "sam@acme.com"] },
    });

    expect(result.verdict).toBe("deny");
  });

  it("matches participant rules against candidate emails", async () => {
    seedRule({
      rule_type: "allow",
      entity_type: "participant",
      entity_key: "carol@x.com",
    });

    const result = await checkRules("ws-1", {
      provider: "fireflies",
      entity: null,
      entityCandidates: { participant: ["carol@x.com"] },
    });

    expect(result.verdict).toBe("allow");
  });

  it("does not cross-match a pattern rule against a different candidate type", async () => {
    seedRule({
      rule_type: "deny",
      entity_type: "subject_pattern",
      entity_key: "*invoice*",
    });

    const result = await checkRules("ws-1", {
      provider: "googledrive",
      entity: null,
      entityCandidates: { name_pattern: ["invoice-template.psd"] },
    });

    expect(result.verdict).toBeNull();
  });

  it("enforces new pattern rules past the 100-row page boundary", async () => {
    for (let i = 0; i < 149; i++) {
      seedRule({
        rule_type: "deny",
        entity_type: "subject_pattern",
        entity_key: `*no-match-${i}*`,
      });
    }
    seedRule({
      rule_type: "deny",
      entity_type: "subject_pattern",
      entity_key: "*invoice*",
    });

    const result = await checkRules("ws-1", {
      provider: "gmail",
      entity: null,
      entityCandidates: { subject_pattern: ["Your invoice is ready"] },
    });

    expect(result.verdict).toBe("deny");
  });

  it("returns null when there is no entity and no candidates", async () => {
    seedRule({
      rule_type: "deny",
      entity_type: "subject_pattern",
      entity_key: "*invoice*",
    });

    const result = await checkRules("ws-1", {
      provider: "gmail",
      entity: null,
    });

    expect(result.verdict).toBeNull();
  });
});

describe("addRule — S5 vocabulary expansion", () => {
  it("lowercases attendee keys", async () => {
    const result = await addRule({
      workspaceId: "ws-1",
      provider: "googlecalendar",
      ruleType: "deny",
      entityType: "attendee",
      entityKey: "Bob@Acme.COM",
    });

    expect(result.success).toBe(true);
    expect(result.rule?.entityKey).toBe("bob@acme.com");
  });

  it("rejects invalid subject_pattern globs", async () => {
    const result = await addRule({
      workspaceId: "ws-1",
      provider: null,
      ruleType: "deny",
      entityType: "subject_pattern",
      entityKey: "[invalid(regex",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Invalid value format");
  });
});
