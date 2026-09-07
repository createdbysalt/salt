import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Operator identity guard — the operator (and their business) must never
 * become person/org records in their own Memory. Identity is assembled from
 * workspace_members, profiles, and the workspace row itself so it works even
 * when website_url was never set.
 */

const h = vi.hoisted(() => {
  type Row = Record<string, unknown>;

  const rows: {
    workspace_members: Row[];
    profiles: Row[];
    workspaces: Row | null;
  } = {
    workspace_members: [],
    profiles: [],
    workspaces: null,
  };

  function listQuery(table: "workspace_members" | "profiles") {
    const filters: Array<(row: Row) => boolean> = [];
    const builder: Record<string, unknown> = {};
    builder.select = vi.fn(() => builder);
    builder.eq = vi.fn((column: string, value: unknown) => {
      filters.push((row) => row[column] === value);
      return builder;
    });
    builder.in = vi.fn((column: string, values: unknown[]) => {
      filters.push((row) => values.includes(row[column]));
      return builder;
    });
    builder.then = (resolve: (value: { data: Row[]; error: null }) => void) =>
      resolve({
        data: rows[table].filter((row) => filters.every((f) => f(row))),
        error: null,
      });
    return builder;
  }

  function workspaceQuery() {
    const builder: Record<string, unknown> = {};
    builder.select = vi.fn(() => builder);
    builder.eq = vi.fn(() => builder);
    builder.maybeSingle = vi.fn(async () => ({ data: rows.workspaces, error: null }));
    builder.then = (resolve: (value: { data: Row | null; error: null }) => void) =>
      resolve({ data: rows.workspaces, error: null });
    return builder;
  }

  function fakeSupabase() {
    return {
      from: (table: string) => {
        if (table === "workspace_members") return listQuery("workspace_members");
        if (table === "profiles") return listQuery("profiles");
        if (table === "workspaces") return workspaceQuery();
        throw new Error(`unexpected table ${table}`);
      },
    };
  }

  function reset() {
    rows.workspace_members.length = 0;
    rows.profiles.length = 0;
    rows.workspaces = null;
  }

  return { rows, fakeSupabase, reset };
});

vi.mock("@/app/_lib/supabase/admin", () => ({
  createAdminClient: () => h.fakeSupabase(),
}));

import {
  getOperatorIdentity,
  isOperatorDomain,
  isOperatorEmail,
  isOperatorName,
  normalizeOperatorName,
} from "./operator";

function seedSaltStudio() {
  h.rows.workspace_members.push({
    workspace_id: "ws-1",
    user_id: "user-1",
    email: "hello@createdbysalt.com",
  });
  h.rows.profiles.push({
    id: "user-1",
    email: "hello@createdbysalt.com",
    full_name: "Gabriella Martins",
    display_name: "Gabriella",
  });
  h.rows.workspaces = {
    id: "ws-1",
    name: "Salt Studio",
    website_url: "https://www.createdbysalt.com/",
    business_email: null,
    owner_id: "user-1",
  };
}

beforeEach(() => {
  h.reset();
});

describe("getOperatorIdentity", () => {
  it("assembles emails, names, and domains from members, profiles, and the workspace", async () => {
    seedSaltStudio();

    const identity = await getOperatorIdentity("ws-1");

    expect(identity.emails.has("hello@createdbysalt.com")).toBe(true);
    expect(identity.names.has("gabriella martins")).toBe(true);
    expect(identity.names.has("gabriella")).toBe(true);
    expect(identity.names.has("salt studio")).toBe(true);
    expect(identity.domains.has("createdbysalt.com")).toBe(true);
  });

  it("derives the operator domain from a business email when website_url is null", async () => {
    h.rows.workspace_members.push({
      workspace_id: "ws-1",
      user_id: "user-1",
      email: "founder@gmail.com",
    });
    h.rows.profiles.push({
      id: "user-1",
      email: "founder@gmail.com",
      full_name: "Gabriella Martins",
      display_name: null,
    });
    h.rows.workspaces = {
      id: "ws-1",
      name: "Salt Studio",
      website_url: null,
      business_email: "hello@createdbysalt.com",
      owner_id: "user-1",
    };

    const identity = await getOperatorIdentity("ws-1");

    expect(identity.domains.has("createdbysalt.com")).toBe(true);
    // A personal mailbox domain must never become an operator domain.
    expect(identity.domains.has("gmail.com")).toBe(false);
  });

  it("returns an empty identity for an unknown workspace (fail open)", async () => {
    const identity = await getOperatorIdentity("ws-unknown");

    expect(identity.emails.size).toBe(0);
    expect(identity.names.size).toBe(0);
    expect(identity.domains.size).toBe(0);
  });
});

describe("matchers", () => {
  it("matches emails case-insensitively with whitespace tolerance", async () => {
    seedSaltStudio();
    const identity = await getOperatorIdentity("ws-1");

    expect(isOperatorEmail(identity, "  HELLO@createdbysalt.com ")).toBe(true);
    expect(isOperatorEmail(identity, "client@acme.com")).toBe(false);
  });

  it("matches names only on exact normalized full-name equality", async () => {
    seedSaltStudio();
    const identity = await getOperatorIdentity("ws-1");

    expect(isOperatorName(identity, "Gabriella  Martins")).toBe(true);
    expect(isOperatorName(identity, "SALT STUDIO")).toBe(true);
    // Partial matches must not refuse — false-positive guard.
    expect(isOperatorName(identity, "Gabriella")).toBe(true); // display_name is an exact identity name
    expect(isOperatorName(identity, "Gabriella M")).toBe(false);
    expect(isOperatorName(identity, "Salt Studio Design")).toBe(false);
  });

  it("matches the apex domain and its subdomains", async () => {
    seedSaltStudio();
    const identity = await getOperatorIdentity("ws-1");

    expect(isOperatorDomain(identity, "createdbysalt.com")).toBe(true);
    expect(isOperatorDomain(identity, "mail.createdbysalt.com")).toBe(true);
    expect(isOperatorDomain(identity, "notcreatedbysalt.com")).toBe(false);
    expect(isOperatorDomain(identity, "acme.com")).toBe(false);
  });
});

describe("normalizeOperatorName", () => {
  it("lowercases, strips punctuation, and collapses whitespace", () => {
    expect(normalizeOperatorName("  Salt   Studio, LLC ")).toBe("salt studio llc");
    expect(normalizeOperatorName("Gabriella-Martins")).toBe("gabriella martins");
  });
});
