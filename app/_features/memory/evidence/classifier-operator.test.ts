import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Classifier self-exclusion — the operator's own addresses, domains, and
 * signature must never emit person/org intake signals. Member-skip used to
 * cover only exact workspace_members.email rows; identity now also comes
 * from profiles, business_email, and website_url.
 */

const h = vi.hoisted(() => {
  type Row = Record<string, unknown>;

  const rows = {
    workspace_members: [] as Row[],
    profiles: [] as Row[],
    people: [] as Row[],
    organizations: [] as Row[],
  };
  let workspace: Row | null = null;

  function listQuery(table: keyof typeof rows) {
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
    builder.not = vi.fn((column: string, _op: string, value: unknown) => {
      filters.push((row) => row[column] !== value);
      return builder;
    });
    builder.then = (
      resolve: (value: { data: Row[]; error: null }) => void,
    ) =>
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
    builder.maybeSingle = vi.fn(async () => ({ data: workspace, error: null }));
    return builder;
  }

  function fakeSupabase() {
    return {
      from: (table: string) => {
        if (table === "workspace_members") return listQuery("workspace_members");
        if (table === "profiles") return listQuery("profiles");
        if (table === "people") return listQuery("people");
        if (table === "organizations") return listQuery("organizations");
        if (table === "workspaces") return workspaceQuery();
        throw new Error(`unexpected table ${table}`);
      },
    };
  }

  function reset() {
    rows.workspace_members.length = 0;
    rows.profiles.length = 0;
    rows.people.length = 0;
    rows.organizations.length = 0;
    workspace = null;
  }

  return {
    rows,
    setWorkspace: (row: Row | null) => {
      workspace = row;
    },
    fakeSupabase,
    reset,
  };
});

vi.mock("@/app/_lib/supabase/admin", () => ({
  createAdminClient: () => h.fakeSupabase(),
}));

import { classifyEmailCapture, classifyMeetingCapture } from "./classifier";

function seedOperator() {
  h.rows.workspace_members.push({
    workspace_id: "ws-1",
    user_id: "user-1",
    email: "founder@gmail.com",
  });
  h.rows.profiles.push({
    id: "user-1",
    email: "hello@createdbysalt.com",
    full_name: "Gabriella Martins",
    display_name: "Gabriella",
  });
  h.setWorkspace({
    id: "ws-1",
    name: "Salt Studio",
    website_url: null,
    business_email: "hello@createdbysalt.com",
    owner_id: "user-1",
  });
}

beforeEach(() => {
  h.reset();
});

describe("classifyEmailCapture — operator self-exclusion", () => {
  it("suppresses the operator's own signature company on outbound mail", async () => {
    seedOperator();

    const signals = await classifyEmailCapture("ws-1", {
      from: "hello@createdbysalt.com",
      to: ["client@acme.com"],
      subject: "Proposal follow-up",
      signature: "Gabriella Martins\nFounder\nSalt Studio\nhello@createdbysalt.com",
    });

    // The operator themselves: no person signal, no org signal.
    expect(
      signals.find((s) => s.identifier === "hello@createdbysalt.com"),
    ).toBeUndefined();
    expect(
      signals.find((s) => s.signal === "email_signature_has_company"),
    ).toBeUndefined();
    expect(
      signals.find((s) => s.identifier === "createdbysalt.com"),
    ).toBeUndefined();

    // The client on the thread still produces signals.
    expect(
      signals.find((s) => s.identifier === "client@acme.com"),
    ).toBeDefined();
    expect(signals.find((s) => s.identifier === "acme.com")).toBeDefined();
  });

  it("suppresses person signals for operator emails known only via profiles", async () => {
    seedOperator();

    // Inbound email TO the operator's business address (known via
    // profiles/business_email, not workspace_members).
    const signals = await classifyEmailCapture("ws-1", {
      from: "client@acme.com",
      to: ["hello@createdbysalt.com"],
      subject: "Re: kickoff",
    });

    expect(
      signals.find((s) => s.identifier === "hello@createdbysalt.com"),
    ).toBeUndefined();
    // The operator's domain must not birth an org either.
    expect(
      signals.find((s) => s.identifier === "createdbysalt.com"),
    ).toBeUndefined();
    // Sender is still a real unknown contact.
    expect(
      signals.find((s) => s.identifier === "client@acme.com"),
    ).toBeDefined();
  });

  it("suppresses a signature company that matches the workspace name", async () => {
    seedOperator();

    const signals = await classifyEmailCapture("ws-1", {
      from: "founder@gmail.com",
      to: ["someone@elsewhere.com"],
      subject: "Hello",
      signature: "Gabriella Martins\nSalt Studio",
    });

    expect(
      signals.find((s) => s.signal === "email_signature_has_company"),
    ).toBeUndefined();
  });
});

describe("classifyMeetingCapture — operator self-exclusion", () => {
  it("skips operator attendees known via profiles, keeps external attendees", async () => {
    seedOperator();

    const signals = await classifyMeetingCapture("ws-1", {
      title: "Intro call",
      attendees: ["hello@createdbysalt.com", "client@acme.com"],
      organizer: "hello@createdbysalt.com",
      startTime: "2026-08-28T15:00:00.000Z",
    });

    const personSignals = signals.filter((s) => s.entityType === "person");
    expect(personSignals.map((s) => s.identifier)).toEqual(["client@acme.com"]);
  });
});
