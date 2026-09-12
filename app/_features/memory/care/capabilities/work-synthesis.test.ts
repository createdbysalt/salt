import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Work Synthesis capability — selection criteria, user-correction guard,
 * and proposal flow through the care bar.
 */

const h = vi.hoisted(() => {
  interface Row {
    [key: string]: unknown;
  }

  const db = {
    work: [] as Row[],
    captures: [] as Row[],
    links: [] as Row[],
    resources: [] as Row[],
    people: [] as Row[],
    personEmails: [] as Row[],
    organizations: [] as Row[],
    workspaceServices: [] as Row[],
    workUpdates: [] as Array<{ id: string; patch: Row }>,
  };

  const memoryUpdateFieldSpy = vi.fn(
    async (_input: unknown): Promise<{ action: string }> => ({ action: "applied" }),
  );
  const getCareFieldBarSpy = vi.fn(async () => ({
    tier: "standard" as const,
    bar: 85,
    alwaysAuto: false,
  }));
  const getCorrectionBlocklistSpy = vi.fn(
    async (): Promise<Array<{ id: string }>> => [],
  );
  const proposeWorkSynthesisSpy = vi.fn(
    async (_input: unknown) =>
      null as {
        canonicalName: string | null;
        summary: string | null;
        confidence: number;
        matchedService?: string | null;
      } | null,
  );

  type Filter = (row: Row) => boolean;

  /** Resolve "col" or "jsonb_col->>key" against a row. */
  function resolveColumn(row: Row, column: string): unknown {
    if (column.includes("->>")) {
      const [jsonColumn, key] = column.split("->>");
      const value = row[jsonColumn];
      if (!value || typeof value !== "object" || Array.isArray(value)) {
        return undefined;
      }
      return (value as Row)[key];
    }
    return row[column];
  }

  function ilikeFilter(column: string, pattern: string): Filter {
    const term = pattern
      .replace(/^%|%$/g, "")
      .replace(/\\([%_\\])/g, "$1")
      .toLowerCase();
    return (row) => {
      const value = resolveColumn(row, column);
      return typeof value === "string" && value.toLowerCase().includes(term);
    };
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
      gte: (column: string, value: string) => {
        filters.push((row) => (row[column] as string) >= value);
        return builder;
      },
      ilike: (column: string, pattern: string) => {
        filters.push(ilikeFilter(column, pattern));
        return builder;
      },
      not: (column: string, op: string, value: unknown) => {
        if (op === "in") {
          const values = String(value)
            .replace(/^\(|\)$/g, "")
            .split(",")
            .map((entry) => entry.trim().replace(/^"|"$/g, ""));
          filters.push((row) => !values.includes(row[column] as string));
        }
        return builder;
      },
      or: (clause: string) => {
        const conditions = clause
          .split(",")
          .map((condition) => condition.trim())
          .filter(Boolean);
        filters.push((row) =>
          conditions.some((condition) => {
            const match = condition.match(/^(.+)\.ilike\.(.*)$/);
            if (!match) return false;
            return ilikeFilter(match[1], match[2])(row);
          }),
        );
        return builder;
      },
      order: () => builder,
      limit: () => builder,
      maybeSingle: async () => ({
        data: rows.find((row) => filters.every((f) => f(row))) ?? null,
        error: null,
      }),
      update: (patch: Row) => ({
        eq: (column: string, value: unknown) => ({
          eq: async (column2: string, value2: unknown) => {
            const match = rows.find(
              (row) => row[column] === value && row[column2] === value2,
            );
            if (match) Object.assign(match, patch);
            db.workUpdates.push({ id: value as string, patch });
            return { error: null };
          },
        }),
      }),
      then: (resolve: (value: { data: Row[]; error: null }) => void) =>
        resolve({
          data: rows.filter((row) => filters.every((f) => f(row))),
          error: null,
        }),
    };
    return builder;
  }

  function fakeSupabase() {
    return {
      from: (table: string) => {
        if (table === "work") return query(db.work);
        if (table === "capture_events") return query(db.captures);
        if (table === "entity_links") return query(db.links);
        if (table === "resources") return query(db.resources);
        if (table === "people") return query(db.people);
        if (table === "person_emails") return query(db.personEmails);
        if (table === "organizations") return query(db.organizations);
        if (table === "workspace_services") return query(db.workspaceServices);
        throw new Error(`unexpected table ${table}`);
      },
    };
  }

  function resetDb() {
    db.work.length = 0;
    db.captures.length = 0;
    db.links.length = 0;
    db.resources.length = 0;
    db.people.length = 0;
    db.personEmails.length = 0;
    db.organizations.length = 0;
    db.workspaceServices.length = 0;
    db.workUpdates.length = 0;
  }

  return {
    db,
    resetDb,
    fakeSupabase,
    memoryUpdateFieldSpy,
    getCareFieldBarSpy,
    getCorrectionBlocklistSpy,
    proposeWorkSynthesisSpy,
  };
});

vi.mock("@/app/_lib/supabase/admin", () => ({
  createAdminClient: () => h.fakeSupabase(),
}));

vi.mock("@/app/_lib/memory-tools", () => ({
  memoryUpdateField: (input: unknown) => h.memoryUpdateFieldSpy(input),
}));

vi.mock("../decision-pipeline", () => ({
  getCareFieldBar: () => h.getCareFieldBarSpy(),
}));

vi.mock("@/app/_lib/learning/correction-blocklist", () => ({
  getCorrectionBlocklist: () => h.getCorrectionBlocklistSpy(),
}));

vi.mock("@/app/_features/memory/evidence/name-work", async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import("@/app/_features/memory/evidence/name-work")
    >();
  return {
    ...actual,
    proposeWorkSynthesis: (input: unknown) =>
      h.proposeWorkSynthesisSpy(input),
  };
});

import {
  filterSynthesisCandidates,
  readSynthesizedAt,
  runWorkSynthesisCapability,
} from "./work-synthesis";

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = new Date("2026-09-05T04:00:00.000Z").getTime();

function workRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "work-1",
    workspace_id: "ws-1",
    name: "Barrett on the Studio",
    description: null,
    created_at: new Date(NOW - 2 * DAY_MS).toISOString(),
    capture_event_id: null,
    person_id: null,
    organization_id: null,
    billing_contact_id: null,
    service_id: null,
    metadata: null,
    ...overrides,
  };
}

describe("readSynthesizedAt", () => {
  it("reads the marker from metadata", () => {
    expect(
      readSynthesizedAt({
        work_synthesis: { synthesized_at: "2026-09-01T00:00:00.000Z" },
      }),
    ).toBe(new Date("2026-09-01T00:00:00.000Z").getTime());
  });

  it("returns null for missing or malformed markers", () => {
    expect(readSynthesizedAt(null)).toBeNull();
    expect(readSynthesizedAt({})).toBeNull();
    expect(readSynthesizedAt({ work_synthesis: "nope" })).toBeNull();
    expect(readSynthesizedAt([{ work_synthesis: {} }])).toBeNull();
  });
});

describe("filterSynthesisCandidates", () => {
  it("includes newly created work", () => {
    const works = [workRow()];
    expect(filterSynthesisCandidates(works, [], NOW)).toHaveLength(1);
  });

  it("excludes work synthesized within the throttle window", () => {
    const works = [
      workRow({
        metadata: {
          work_synthesis: {
            synthesized_at: new Date(NOW - 2 * DAY_MS).toISOString(),
          },
        },
      }),
    ];
    expect(filterSynthesisCandidates(works, [], NOW)).toHaveLength(0);
  });

  it("includes old work with fresh linked evidence since the last synthesis", () => {
    const works = [
      workRow({
        created_at: new Date(NOW - 60 * DAY_MS).toISOString(),
        metadata: {
          work_synthesis: {
            synthesized_at: new Date(NOW - 10 * DAY_MS).toISOString(),
          },
        },
      }),
    ];
    const links = [
      {
        target_id: "work-1",
        created_at: new Date(NOW - 1 * DAY_MS).toISOString(),
      },
    ];
    expect(filterSynthesisCandidates(works, links, NOW)).toHaveLength(1);
  });

  it("excludes old work whose fresh evidence predates the last synthesis", () => {
    const works = [
      workRow({
        created_at: new Date(NOW - 60 * DAY_MS).toISOString(),
        metadata: {
          work_synthesis: {
            synthesized_at: new Date(NOW - 10 * DAY_MS).toISOString(),
          },
        },
      }),
    ];
    const links = [
      {
        target_id: "work-1",
        created_at: new Date(NOW - 12 * DAY_MS).toISOString(),
      },
    ];
    expect(filterSynthesisCandidates(works, links, NOW)).toHaveLength(0);
  });

  it("excludes old work with no fresh evidence and no recent birth", () => {
    const works = [
      workRow({ created_at: new Date(NOW - 60 * DAY_MS).toISOString() }),
    ];
    expect(filterSynthesisCandidates(works, [], NOW)).toHaveLength(0);
  });
});

describe("runWorkSynthesisCapability", () => {
  beforeEach(() => {
    h.resetDb();
    h.memoryUpdateFieldSpy.mockClear();
    h.memoryUpdateFieldSpy.mockResolvedValue({ action: "applied" });
    h.getCareFieldBarSpy.mockClear();
    h.getCorrectionBlocklistSpy.mockClear();
    h.getCorrectionBlocklistSpy.mockResolvedValue([]);
    h.proposeWorkSynthesisSpy.mockClear();
    h.proposeWorkSynthesisSpy.mockResolvedValue(null);
  });

  /** Give the default work row a birth capture so gatherWorkContext finds
   * evidence — context-free records are skipped before the LLM read. */
  function pushWorkWithCapture(overrides: Record<string, unknown> = {}) {
    h.db.work.push(workRow({ capture_event_id: "cap-1", ...overrides }));
    h.db.captures.push({
      id: "cap-1",
      extracted_data: {
        subject: "Barrett on the Studio",
        snippet: "Attached is the signed agreement.",
      },
      raw_payload: {},
    });
  }

  it("renames a work record when the proposal clears the bar", async () => {
    pushWorkWithCapture();
    h.proposeWorkSynthesisSpy.mockResolvedValueOnce({
      canonicalName: "Playground Website",
      summary: "A website build for Barrett's studio.",
      confidence: 92,
    });

    const result = await runWorkSynthesisCapability({ workspaceId: "ws-1" });

    expect(result.success).toBe(true);
    expect(h.memoryUpdateFieldSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: "work",
        entityId: "work-1",
        field: "name",
        value: "Playground Website",
        confidence: 92,
        source: "care",
        minThreshold: 85,
      }),
    );
    // Blank description gets the summary.
    expect(h.memoryUpdateFieldSpy).toHaveBeenCalledWith(
      expect.objectContaining({ field: "description" }),
    );
    expect(result.data).toMatchObject({ renamed: 1, synthesized: 1 });
    // The synthesis marker was stamped.
    expect(h.db.workUpdates[0].patch.metadata).toMatchObject({
      work_synthesis: expect.objectContaining({
        synthesized_at: expect.any(String),
      }),
    });
  });

  it("never touches a work record the user has corrected", async () => {
    h.db.work.push(workRow());
    h.getCorrectionBlocklistSpy.mockResolvedValueOnce([{ id: "corr-1" }]);

    const result = await runWorkSynthesisCapability({ workspaceId: "ws-1" });

    expect(result.success).toBe(true);
    expect(h.proposeWorkSynthesisSpy).not.toHaveBeenCalled();
    expect(h.memoryUpdateFieldSpy).not.toHaveBeenCalled();
    expect(result.data).toMatchObject({ skippedUserNamed: 1, synthesized: 0 });
  });

  it("parks a below-bar rename as Watching evidence instead of applying", async () => {
    pushWorkWithCapture();
    h.proposeWorkSynthesisSpy.mockResolvedValueOnce({
      canonicalName: "Playground Website",
      summary: null,
      confidence: 80,
    });
    h.memoryUpdateFieldSpy.mockResolvedValueOnce({ action: "accumulated" });

    const result = await runWorkSynthesisCapability({ workspaceId: "ws-1" });

    expect(result.data).toMatchObject({ renamed: 0, parked: 1 });
  });

  it("does not emit a rename identical to the current name", async () => {
    pushWorkWithCapture({ name: "Playground Website" });
    h.proposeWorkSynthesisSpy.mockResolvedValueOnce({
      canonicalName: "playground  website",
      summary: null,
      confidence: 95,
    });

    const result = await runWorkSynthesisCapability({ workspaceId: "ws-1" });

    expect(result.success).toBe(true);
    expect(h.memoryUpdateFieldSpy).not.toHaveBeenCalledWith(
      expect.objectContaining({ field: "name" }),
    );
  });

  it("never overwrites an existing description", async () => {
    pushWorkWithCapture({ description: "User-written description." });
    h.proposeWorkSynthesisSpy.mockResolvedValueOnce({
      canonicalName: null,
      summary: "A website build for Barrett's studio.",
      confidence: 90,
    });

    await runWorkSynthesisCapability({ workspaceId: "ws-1" });

    expect(h.memoryUpdateFieldSpy).not.toHaveBeenCalledWith(
      expect.objectContaining({ field: "description" }),
    );
  });

  it("skips emitting very-low-confidence renames entirely", async () => {
    pushWorkWithCapture();
    h.proposeWorkSynthesisSpy.mockResolvedValueOnce({
      canonicalName: "Something Uncertain",
      summary: null,
      confidence: 30,
    });

    const result = await runWorkSynthesisCapability({ workspaceId: "ws-1" });

    expect(h.memoryUpdateFieldSpy).not.toHaveBeenCalled();
    expect(result.data).toMatchObject({ renamed: 0, parked: 0 });
  });

  it("still stamps the marker when the LLM has no proposal", async () => {
    pushWorkWithCapture();

    const result = await runWorkSynthesisCapability({ workspaceId: "ws-1" });

    expect(result.success).toBe(true);
    // The LLM was consulted (context existed) but proposed nothing.
    expect(h.proposeWorkSynthesisSpy).toHaveBeenCalled();
    expect(h.memoryUpdateFieldSpy).not.toHaveBeenCalled();
    expect(h.db.workUpdates).toHaveLength(1);
    expect(result.data).toMatchObject({ synthesized: 1 });
  });

  it("skips orphaned records without stamping — no evidence, no LLM call", async () => {
    // No birth capture, no linked resources, and nothing in the workspace
    // mentions the counterparty: there is nothing to read. Stamping here
    // would suppress the record for a week even though no LLM call happened,
    // so the record stays eligible for the moment evidence lands.
    h.db.work.push(workRow());

    const result = await runWorkSynthesisCapability({ workspaceId: "ws-1" });

    expect(result.success).toBe(true);
    expect(h.proposeWorkSynthesisSpy).not.toHaveBeenCalled();
    expect(h.memoryUpdateFieldSpy).not.toHaveBeenCalled();
    expect(h.db.workUpdates).toHaveLength(0);
    expect(result.data).toMatchObject({ synthesized: 0 });
  });

  it("reads counterparty evidence for orphaned records (identity-first)", async () => {
    // Orphaned work named after the client: nothing is linked, but the
    // exact name resolves to a person, whose emails and org carry the
    // deliverable evidence.
    h.db.work.push(workRow({ name: "Barrett Shutt" }));
    h.db.people.push({
      id: "p-1",
      workspace_id: "ws-1",
      name: "Barrett Shutt",
      email: "barrett@ontheplayground.studio",
      deleted_at: null,
    });
    // People link to orgs through entity_links, not a column.
    h.db.links.push({
      workspace_id: "ws-1",
      source_type: "person",
      source_id: "p-1",
      target_type: "org",
      target_id: "o-1",
    });
    h.db.organizations.push({
      id: "o-1",
      workspace_id: "ws-1",
      name: "Playground Studios",
      deleted_at: null,
    });
    h.db.captures.push({
      id: "cap-orphan",
      workspace_id: "ws-1",
      source_type: "gmail",
      extracted_data: {
        sender_email: "hello@createdbysalt.com",
        to: "barrett@ontheplayground.studio",
        subject: "Round 1 revisions are fully live",
        snippet: "Hi Barrett, revisions for the site are live…",
        attachments: [{ name: "Playground Website Service Agreement.pdf" }],
      },
      raw_payload: {},
    });
    h.db.resources.push({
      id: "res-orphan",
      workspace_id: "ws-1",
      file_name: "SERVICE AGREEMENT | Playground Studios",
      ai_summary: "Service agreement for the Playground website build.",
      deleted_at: null,
    });

    await runWorkSynthesisCapability({ workspaceId: "ws-1" });

    expect(h.proposeWorkSynthesisSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        currentName: "Barrett Shutt",
        subjects: expect.arrayContaining(["Round 1 revisions are fully live"]),
        documentNames: expect.arrayContaining([
          "Playground Website Service Agreement.pdf",
          "SERVICE AGREEMENT | Playground Studios",
        ]),
        // The matched person feeds the never-a-person-name collision guard.
        knownEntityNames: expect.arrayContaining([
          "Barrett Shutt",
          "Playground Studios",
        ]),
      }),
    );

    // The resolved identity connects the record — the deliverable-only name
    // convention makes these links the record's tie to its client.
    expect(h.memoryUpdateFieldSpy).toHaveBeenCalledWith(
      expect.objectContaining({ field: "person_id", value: "p-1" }),
    );
    expect(h.memoryUpdateFieldSpy).toHaveBeenCalledWith(
      expect.objectContaining({ field: "organization_id", value: "o-1" }),
    );
  });

  it("never crosses identities — only the exact person's evidence is read", async () => {
    // Two unrelated Chrises: goodcompany.com (Seixas) and goodcompany.ca
    // (Durso). Name-part searches matched both and produced the "Good
    // Company Project" rename; identity-first reads only Seixas's email.
    h.db.work.push(workRow({ name: "Chris Seixas — Project" }));
    h.db.people.push(
      {
        id: "p-seixas",
        workspace_id: "ws-1",
        name: "Chris Seixas",
        email: "chris@goodcompany.com",
        deleted_at: null,
      },
      {
        id: "p-durso",
        workspace_id: "ws-1",
        name: "Chris Durso",
        email: "chris@goodcompany.ca",
        deleted_at: null,
      },
    );
    h.db.captures.push(
      {
        id: "cap-seixas",
        workspace_id: "ws-1",
        source_type: "gmail",
        extracted_data: {
          sender_email: "chris@goodcompany.com",
          subject: "Re: brand identity concepts",
          snippet: "Love the direction on the identity.",
        },
        raw_payload: {},
      },
      {
        id: "cap-durso",
        workspace_id: "ws-1",
        source_type: "gmail",
        extracted_data: {
          sender_email: "chris@goodcompany.ca",
          subject: "Good Company kickoff",
          snippet: "Durso's project — nothing to do with Seixas.",
        },
        raw_payload: {},
      },
    );

    await runWorkSynthesisCapability({ workspaceId: "ws-1" });

    const proposalInput = h.proposeWorkSynthesisSpy.mock.calls[0]?.[0] as {
      subjects: string[];
      knownEntityNames: string[];
    };
    expect(proposalInput.subjects).toContain("Re: brand identity concepts");
    expect(proposalInput.subjects).not.toContain("Good Company kickoff");
    expect(proposalInput.knownEntityNames).toContain("Chris Seixas");
    expect(proposalInput.knownEntityNames).not.toContain("Chris Durso");
    // Connected to Seixas, never Durso.
    expect(h.memoryUpdateFieldSpy).toHaveBeenCalledWith(
      expect.objectContaining({ field: "person_id", value: "p-seixas" }),
    );
    expect(h.memoryUpdateFieldSpy).not.toHaveBeenCalledWith(
      expect.objectContaining({ field: "person_id", value: "p-durso" }),
    );
  });

  it("skips a name-shaped placeholder that resolves to nobody", async () => {
    // No exact person named "Mystery Person" — there is no precise identity
    // to search by, and name-part searches would cross identities.
    h.db.work.push(workRow({ name: "Mystery Person — Project" }));

    const result = await runWorkSynthesisCapability({ workspaceId: "ws-1" });

    expect(result.success).toBe(true);
    expect(h.proposeWorkSynthesisSpy).not.toHaveBeenCalled();
    expect(h.memoryUpdateFieldSpy).not.toHaveBeenCalled();
    expect(h.db.workUpdates).toHaveLength(0);
  });

  it("links the matched service when the proposal names one", async () => {
    pushWorkWithCapture();
    h.db.workspaceServices.push({
      id: "svc-1",
      workspace_id: "ws-1",
      name: "Website Redesign",
      is_active: true,
    });
    h.proposeWorkSynthesisSpy.mockResolvedValueOnce({
      canonicalName: "Website Redesign",
      summary: null,
      confidence: 92,
      matchedService: "Website Redesign",
    });

    const result = await runWorkSynthesisCapability({ workspaceId: "ws-1" });

    // The service catalog is the naming vocabulary.
    expect(h.proposeWorkSynthesisSpy).toHaveBeenCalledWith(
      expect.objectContaining({ services: ["Website Redesign"] }),
    );
    expect(h.memoryUpdateFieldSpy).toHaveBeenCalledWith(
      expect.objectContaining({ field: "service_id", value: "svc-1" }),
    );
    expect(result.data).toMatchObject({ connected: 1 });
  });

  it("gathers birth-capture and resource context for the synthesis read", async () => {
    h.db.work.push(workRow({ capture_event_id: "cap-1", person_id: "p-1" }));
    h.db.captures.push({
      id: "cap-1",
      extracted_data: {
        subject: "Barrett on the Studio",
        snippet: "Attached is the signed agreement.",
        attachments: [{ name: "Playground Website Service Agreement.pdf" }],
      },
      raw_payload: {},
    });
    h.db.links.push({
      workspace_id: "ws-1",
      source_type: "resource",
      source_id: "res-1",
      target_type: "work",
      target_id: "work-1",
      created_at: new Date(NOW - 1 * DAY_MS).toISOString(),
    });
    h.db.resources.push({
      id: "res-1",
      workspace_id: "ws-1",
      file_name: "Playground Website Service Agreement.pdf",
      ai_summary: "Service agreement for the Playground Website build.",
      extracted_data: null,
      deleted_at: null,
    });
    h.db.people.push({ id: "p-1", name: "Barrett", deleted_at: null });

    await runWorkSynthesisCapability({ workspaceId: "ws-1" });

    expect(h.proposeWorkSynthesisSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: "ws-1",
        currentName: "Barrett on the Studio",
        subjects: ["Barrett on the Studio"],
        documentNames: expect.arrayContaining([
          "Playground Website Service Agreement.pdf",
        ]),
        knownEntityNames: ["Barrett"],
      }),
    );
  });
});
