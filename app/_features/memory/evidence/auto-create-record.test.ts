import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * autoCreateRecord — meeting dedupe guard + resource creation (audit #7).
 *
 * Meetings: capture-driven creation must never double-create against the
 * existing insert paths (cal-booking-processor keys on cal_booking_id;
 * calendar events carry external_event_id / source_external_id). A match
 * links the evidence to the existing record instead of inserting.
 * Resources: auto-create like every other entity type — the threshold is
 * the only gate; uploaded_by stays null on the evidence path.
 * People: calendar invites often carry only an email — the name falls back
 * to the local part instead of failing closed and parking forever.
 */

const h = vi.hoisted(() => {
  interface Row {
    [key: string]: unknown;
  }

  const db = {
    meetings: [] as Row[],
    files: [] as Row[],
    billing: [] as Row[],
    links: [] as Row[],
    people: [] as Row[],
    personEmails: [] as Row[],
    organizations: [] as Row[],
    work: [] as Row[],
    evidence: [] as Row[],
    evidenceSignals: [] as Row[],
    evidenceUpdates: [] as Array<{ id: string; patch: Row }>,
    captures: [] as Row[],
  };

  let idCounter = 0;

  type Filter = (row: Row) => boolean;

  function meetingsQuery() {
    const filters: Filter[] = [];
    const builder = {
      select: () => builder,
      eq: (column: string, value: unknown) => {
        filters.push((row) => row[column] === value);
        return builder;
      },
      is: (column: string, value: unknown) => {
        filters.push((row) => row[column] === value);
        return builder;
      },
      gte: (column: string, value: string) => {
        filters.push((row) => (row[column] as string) >= value);
        return builder;
      },
      lte: (column: string, value: string) => {
        filters.push((row) => (row[column] as string) <= value);
        return builder;
      },
      maybeSingle: async () => {
        const match = db.meetings.find((row) => filters.every((f) => f(row)));
        return { data: match ? { id: match.id } : null, error: null };
      },
      insert: (row: Row) => {
        const inserted = { id: `mtg-${++idCounter}`, ...row };
        db.meetings.push(inserted);
        return {
          select: () => ({
            single: async () => ({ data: { id: inserted.id }, error: null }),
          }),
        };
      },
      then: (resolve: (value: { data: Row[]; error: null }) => void) =>
        resolve({
          data: db.meetings.filter((row) => filters.every((f) => f(row))),
          error: null,
        }),
    };
    return builder;
  }

  function filesQuery() {
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
      maybeSingle: async () => {
        const match = db.files.find((row) => filters.every((f) => f(row)));
        return { data: match ?? null, error: null };
      },
      insert: (row: Row) => {
        const inserted = { id: `file-${++idCounter}`, ...row };
        db.files.push(inserted);
        return {
          select: () => ({
            single: async () => ({ data: { id: inserted.id }, error: null }),
          }),
        };
      },
    };
    return builder;
  }

  function billingQuery() {
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
      ilike: (column: string, value: unknown) => {
        filters.push(
          (row) =>
            typeof row[column] === "string" &&
            (row[column] as string).toLowerCase() ===
              String(value).toLowerCase(),
        );
        return builder;
      },
      limit: () => builder,
      maybeSingle: async () => {
        const match = db.billing.find((row) => filters.every((f) => f(row)));
        return { data: match ? { id: match.id } : null, error: null };
      },
      insert: (row: Row) => {
        const inserted = { id: `bill-${++idCounter}`, ...row };
        db.billing.push(inserted);
        return {
          select: () => ({
            single: async () => ({ data: { id: inserted.id }, error: null }),
          }),
        };
      },
    };
    return builder;
  }

  function linksQuery() {
    const filters: Filter[] = [];
    const builder = {
      select: () => builder,
      eq: (column: string, value: unknown) => {
        filters.push((row) => row[column] === value);
        return builder;
      },
      maybeSingle: async () => {
        const match = db.links.find((row) => filters.every((f) => f(row)));
        return { data: match ?? null, error: null };
      },
      insert: (row: Row) => {
        const inserted = { id: `link-${++idCounter}`, ...row };
        db.links.push(inserted);
        return {
          select: () => ({
            single: async () => ({ data: { id: inserted.id }, error: null }),
          }),
        };
      },
    };
    return builder;
  }

  function pendingEvidenceQuery() {
    const filters: Filter[] = [];
    const builder = {
      select: () => builder,
      eq: (column: string, value: unknown) => {
        filters.push((row) => row[column] === value);
        return builder;
      },
      in: (column: string, values: unknown[]) => {
        filters.push((row) => values.includes(row[column]));
        return builder;
      },
      not: (column: string, op: string, value: unknown) => {
        if (op === "is" && value === null) {
          filters.push((row) => row[column] !== null && row[column] !== undefined);
        }
        return builder;
      },
      update: (patch: Row) => ({
        eq: async (_column: string, id: unknown) => {
          db.evidenceUpdates.push({ id: id as string, patch });
          return { error: null };
        },
      }),
      then: (resolve: (value: { data: Row[]; error: null }) => void) =>
        resolve({
          data: db.evidence.filter((row) => filters.every((f) => f(row))),
          error: null,
        }),
    };
    return builder;
  }

  function pendingEvidenceSignalsQuery() {
    const filters: Filter[] = [];
    const builder = {
      select: () => builder,
      eq: (column: string, value: unknown) => {
        filters.push((row) => row[column] === value);
        return builder;
      },
      then: (resolve: (value: { data: Row[]; error: null }) => void) =>
        resolve({
          data: db.evidenceSignals.filter((row) => filters.every((f) => f(row))),
          error: null,
        }),
    };
    return builder;
  }

  function capturesQuery() {
    const filters: Filter[] = [];
    const builder = {
      select: () => builder,
      eq: (column: string, value: unknown) => {
        filters.push((row) => row[column] === value);
        return builder;
      },
      maybeSingle: async () => {
        const match = db.captures.find((row) => filters.every((f) => f(row)));
        return { data: match ?? null, error: null };
      },
    };
    return builder;
  }

  /** Shared read+insert builder for people/organizations/work lookups. */
  function directoryQuery(rows: Row[], idPrefix: string) {
    const filters: Filter[] = [];
    const builder = {
      select: () => builder,
      eq: (column: string, value: unknown) => {
        filters.push((row) => row[column] === value);
        return builder;
      },
      in: (column: string, values: unknown[]) => {
        filters.push((row) => values.includes(row[column]));
        return builder;
      },
      is: (column: string, value: unknown) => {
        filters.push((row) => (row[column] ?? null) === value);
        return builder;
      },
      ilike: (column: string, value: unknown) => {
        filters.push(
          (row) =>
            typeof row[column] === "string" &&
            (row[column] as string).toLowerCase() ===
              String(value).toLowerCase(),
        );
        return builder;
      },
      limit: () => builder,
      maybeSingle: async () => {
        const match = rows.find((row) => filters.every((f) => f(row)));
        return { data: match ?? null, error: null };
      },
      insert: (row: Row) => {
        const inserted = { id: `${idPrefix}-${++idCounter}`, ...row };
        rows.push(inserted);
        return {
          select: () => ({
            single: async () => ({ data: { id: inserted.id }, error: null }),
          }),
        };
      },
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
        if (table === "meetings") return meetingsQuery();
        if (table === "resources") return filesQuery();
        if (table === "billing_records") return billingQuery();
        if (table === "entity_links") return linksQuery();
        if (table === "pending_evidence") return pendingEvidenceQuery();
        if (table === "pending_evidence_signals") return pendingEvidenceSignalsQuery();
        if (table === "people") return directoryQuery(db.people, "person");
        if (table === "person_emails") return directoryQuery(db.personEmails, "pe");
        if (table === "organizations") return directoryQuery(db.organizations, "org");
        if (table === "work") return directoryQuery(db.work, "work");
        if (table === "capture_events") return capturesQuery();
        throw new Error(`unexpected table ${table}`);
      },
    };
  }

  function resetDb() {
    db.meetings.length = 0;
    db.files.length = 0;
    db.billing.length = 0;
    db.links.length = 0;
    db.people.length = 0;
    db.personEmails.length = 0;
    db.organizations.length = 0;
    db.work.length = 0;
    db.evidence.length = 0;
    db.evidenceSignals.length = 0;
    db.evidenceUpdates.length = 0;
    db.captures.length = 0;
    idCounter = 0;
  }

  const recordSaltLearningSpy = vi.fn(async (_input: unknown) => ({
    id: "learn-1",
  }));

  const analyzeResourceContentSpy = vi.fn(async (_input: unknown) => ({
    analyzed: false,
    reason: "no-content",
    written: [] as string[],
  }));
  const propagateStoredWorkTermsSpy = vi.fn(
    async (_input: unknown) => "no-analysis" as const,
  );

  // Default null: the deterministic naming path stays the default unless a
  // test opts into an LLM proposal.
  const proposeWorkNameSpy = vi.fn(
    async (_input: unknown) => null as { name: string; confidence: number } | null,
  );

  const operatorIdentity = {
    emails: new Set<string>(),
    names: new Set<string>(),
    domains: new Set<string>(),
  };

  function resetOperatorIdentity() {
    operatorIdentity.emails.clear();
    operatorIdentity.names.clear();
    operatorIdentity.domains.clear();
  }

  return {
    db,
    resetDb,
    fakeSupabase,
    recordSaltLearningSpy,
    operatorIdentity,
    resetOperatorIdentity,
    analyzeResourceContentSpy,
    propagateStoredWorkTermsSpy,
    proposeWorkNameSpy,
  };
});

vi.mock("@/app/_lib/supabase/admin", () => ({
  createAdminClient: () => h.fakeSupabase(),
}));

vi.mock("@/app/_lib/identity/operator", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/app/_lib/identity/operator")>();
  return {
    ...actual,
    getOperatorIdentity: async () => h.operatorIdentity,
  };
});

vi.mock("@/app/_lib/learning/salt-learnings", () => ({
  recordSaltLearning: (input: unknown) => h.recordSaltLearningSpy(input),
}));

vi.mock("@/app/_features/resources/services/content-analysis", () => ({
  analyzeResourceContent: (input: unknown) => h.analyzeResourceContentSpy(input),
  propagateStoredWorkTerms: (input: unknown) => h.propagateStoredWorkTermsSpy(input),
}));

vi.mock("./name-work", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./name-work")>();
  return {
    ...actual,
    proposeWorkName: (input: unknown) => h.proposeWorkNameSpy(input),
  };
});

import { autoCreateRecord, type AutoCreateRecordInput } from "./auto-create-record";
import type { ExtractedFieldValue } from "./types";

function field(value: string): ExtractedFieldValue {
  return { value, confidence: 95, sources: ["cap-1"] };
}

function meetingInput(
  fields: Record<string, string>,
  overrides: Partial<AutoCreateRecordInput> = {}
): AutoCreateRecordInput {
  const extractedFields: Record<string, ExtractedFieldValue> = {};
  for (const [key, value] of Object.entries(fields)) {
    extractedFields[key] = field(value);
  }
  return {
    workspaceId: "ws-1",
    evidenceId: "ev-1",
    entityType: "meeting",
    identifier: "googlecalendar:event-123",
    confidence: 97,
    extractedFields,
    signalCount: 1,
    captureId: "cap-1",
    ...overrides,
  };
}

const baseFields = {
  title: "Kickoff: Brand Refresh",
  start_time: "2026-08-10T17:00:00.000Z",
  end_time: "2026-08-10T17:30:00.000Z",
};

beforeEach(() => {
  h.resetDb();
  h.resetOperatorIdentity();
  h.recordSaltLearningSpy.mockClear();
  h.analyzeResourceContentSpy.mockClear();
  h.propagateStoredWorkTermsSpy.mockClear();
  h.proposeWorkNameSpy.mockClear();
  h.proposeWorkNameSpy.mockResolvedValue(null);
});

describe("autoCreateRecord — operator self-exclusion", () => {
  it("refuses to birth a person holding the operator's own email", async () => {
    h.operatorIdentity.emails.add("hello@createdbysalt.com");

    const result = await autoCreateRecord(
      meetingInput(
        { email: "hello@createdbysalt.com", name: "Gabriella Martins" },
        { entityType: "person", identifier: "hello@createdbysalt.com" }
      )
    );

    expect(result.ok).toBe(false);
    expect((result as { error: string }).error).toMatch(/operator/i);
    expect(h.db.people).toHaveLength(0);
    expect(h.recordSaltLearningSpy).not.toHaveBeenCalled();
  });

  it("refuses to birth a person whose name is the operator's", async () => {
    h.operatorIdentity.names.add("gabriella martins");

    const result = await autoCreateRecord(
      meetingInput(
        { name: "Gabriella Martins" },
        { entityType: "person", identifier: "gabriella martins" }
      )
    );

    expect(result.ok).toBe(false);
    expect(h.db.people).toHaveLength(0);
  });

  it("refuses to birth an org on the operator's own domain", async () => {
    h.operatorIdentity.domains.add("createdbysalt.com");

    const result = await autoCreateRecord(
      meetingInput(
        { name: "Createdbysalt", domain: "createdbysalt.com" },
        { entityType: "organization", identifier: "createdbysalt.com" }
      )
    );

    expect(result.ok).toBe(false);
    expect((result as { error: string }).error).toMatch(/operator/i);
  });

  it("refuses to birth an org named after the workspace", async () => {
    h.operatorIdentity.names.add("salt studio");

    const result = await autoCreateRecord(
      meetingInput(
        { name: "Salt Studio" },
        { entityType: "organization", identifier: "salt studio" }
      )
    );

    expect(result.ok).toBe(false);
  });

  it("still births an unrelated person (no false positives)", async () => {
    h.operatorIdentity.emails.add("hello@createdbysalt.com");
    h.operatorIdentity.names.add("gabriella martins");
    h.operatorIdentity.domains.add("createdbysalt.com");

    const result = await autoCreateRecord(
      meetingInput(
        { name: "Jane Client", email: "jane@acme.com" },
        { entityType: "person", identifier: "jane@acme.com" }
      )
    );

    expect(result.ok).toBe(true);
    expect(h.db.people).toHaveLength(1);
  });
});

describe("autoCreateRecord — Handled birth logging", () => {
  it("logs a record birth to salt_learnings on a clean insert", async () => {
    const result = await autoCreateRecord(
      meetingInput({ ...baseFields, external_event_id: "event-xyz" })
    );

    expect(result.ok).toBe(true);
    expect(h.recordSaltLearningSpy).toHaveBeenCalledTimes(1);
    expect(h.recordSaltLearningSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: "ws-1",
        entityType: "meeting",
        entityId: h.db.meetings[0].id,
        entityLabel: "Kickoff: Brand Refresh",
        fieldPath: "record",
        newValue: "Kickoff: Brand Refresh",
        confidence: 97,
        playbookSlug: "capture-intake",
      })
    );
  });

  it("still creates the record when learning logging throws", async () => {
    h.recordSaltLearningSpy.mockRejectedValueOnce(new Error("db down"));

    const result = await autoCreateRecord(meetingInput(baseFields));

    expect(result.ok).toBe(true);
    expect(h.db.meetings).toHaveLength(1);
  });

  it("does not log a learning when creation fails closed", async () => {
    const result = await autoCreateRecord(
      meetingInput({ title: "No time" })
    );

    expect(result.ok).toBe(false);
    expect(h.recordSaltLearningSpy).not.toHaveBeenCalled();
  });
});

describe("autoCreateRecord — person name fallback", () => {
  it("parks the candidate when the email local part only yields a junk name", async () => {
    // Deliberately reversed: pedro.h.261107@ used to birth "Pedro H 261107".
    // Digit-bearing local parts are parsing debris, not names — no person is
    // born and the evidence stays parked for review.
    const result = await autoCreateRecord(
      meetingInput(
        { email: "daniel.r.261107@gmail.com" },
        {
          entityType: "person",
          identifier: "daniel.r.261107@gmail.com",
        }
      )
    );

    expect(result.ok).toBe(false);
    expect(h.db.people).toHaveLength(0);
  });

  it("derives the name from a clean email identifier when no name was extracted", async () => {
    const result = await autoCreateRecord(
      meetingInput(
        { email: "daniel.r@gmail.com" },
        {
          entityType: "person",
          identifier: "daniel.r@gmail.com",
        }
      )
    );

    expect(result.ok).toBe(true);
    expect(h.db.people[0]).toMatchObject({
      workspace_id: "ws-1",
      name: "Pedro H",
      email: "daniel.r@gmail.com",
    });
    expect(h.db.evidenceUpdates[0].patch.status).toBe("created");
  });

  it("parks the candidate when the extracted name is a role word", async () => {
    const result = await autoCreateRecord(
      meetingInput(
        { name: "Customer", email: "customer@shopifystore.com" },
        { entityType: "person", identifier: "customer@shopifystore.com" }
      )
    );

    expect(result.ok).toBe(false);
    expect(h.db.people).toHaveLength(0);
  });

  it("still fails closed when there is no name and the identifier is not an email", async () => {
    const result = await autoCreateRecord(
      meetingInput({}, { entityType: "person", identifier: "unknown" })
    );

    expect(result.ok).toBe(false);
    expect(h.db.people).toHaveLength(0);
  });
});

describe("autoCreateRecord — birth provenance", () => {
  it("stamps evidence-born people as Salt extractions, never user-created", async () => {
    const result = await autoCreateRecord(
      meetingInput(
        { name: "Pedro Henrique", email: "pedro@example.com" },
        { entityType: "person", identifier: "pedro@example.com" }
      )
    );

    expect(result.ok).toBe(true);
    expect(h.db.people[0]).toMatchObject({
      source_origin: "extracted",
      capture_event_id: "cap-1",
    });
  });

  it("stamps evidence-born organizations as Salt extractions", async () => {
    const result = await autoCreateRecord(
      meetingInput(
        { name: "Acme Studio", domain: "acme.com" },
        { entityType: "organization", identifier: "acme.com" }
      )
    );

    expect(result.ok).toBe(true);
    expect(h.db.organizations[0]).toMatchObject({
      source_origin: "extracted",
      capture_event_id: "cap-1",
    });
  });

  it("stamps evidence-born work as Salt extractions", async () => {
    const result = await autoCreateRecord(
      meetingInput(
        { name: "Brand Photography" },
        { entityType: "work", identifier: "work:client@acme.com:brand photography" }
      )
    );

    expect(result.ok).toBe(true);
    expect(h.db.work[0]).toMatchObject({
      source_origin: "extracted",
      capture_event_id: "cap-1",
    });
  });
});

describe("autoCreateRecord — meeting dedupe guard", () => {
  it("links to an existing meeting with the same external_event_id (no insert)", async () => {
    h.db.meetings.push({
      id: "mtg-existing",
      workspace_id: "ws-1",
      external_event_id: "event-123",
      deleted_at: null,
    });

    const result = await autoCreateRecord(
      meetingInput({ ...baseFields, external_event_id: "event-123" })
    );

    expect(result).toEqual({ ok: true, recordId: "mtg-existing" });
    expect(h.db.meetings).toHaveLength(1);
    // Evidence is marked created against the EXISTING record
    expect(h.db.evidenceUpdates[0].patch).toMatchObject({
      status: "created",
      created_record_id: "mtg-existing",
    });
  });

  it("links to a cal-booking-processor row via cal_booking_id", async () => {
    h.db.meetings.push({
      id: "mtg-cal",
      workspace_id: "ws-1",
      cal_booking_id: "bk-99",
      deleted_at: null,
    });

    const result = await autoCreateRecord(
      meetingInput(
        { ...baseFields, external_event_id: "bk-99", provider: "calcom" },
        { identifier: "calcom:bk-99" }
      )
    );

    expect(result).toEqual({ ok: true, recordId: "mtg-cal" });
    expect(h.db.meetings).toHaveLength(1);
  });

  it("links on a tight title + start_time fuzzy match (±2 min)", async () => {
    h.db.meetings.push({
      id: "mtg-fuzzy",
      workspace_id: "ws-1",
      title: "kickoff: brand refresh",
      start_time: "2026-08-10T17:01:00.000Z",
      deleted_at: null,
    });

    const result = await autoCreateRecord(meetingInput(baseFields));

    expect(result).toEqual({ ok: true, recordId: "mtg-fuzzy" });
    expect(h.db.meetings).toHaveLength(1);
  });

  it("ignores fuzzy candidates outside the time window and inserts", async () => {
    h.db.meetings.push({
      id: "mtg-other",
      workspace_id: "ws-1",
      title: "Kickoff: Brand Refresh",
      start_time: "2026-08-10T17:10:00.000Z",
      deleted_at: null,
    });

    const result = await autoCreateRecord(meetingInput(baseFields));

    expect(result.ok).toBe(true);
    expect(h.db.meetings).toHaveLength(2);
    expect((result as { recordId: string }).recordId).not.toBe("mtg-other");
  });
});

describe("autoCreateRecord — meeting insert enrichment", () => {
  it("sets external ids, provenance, attendees, and provider on a clean insert", async () => {
    const result = await autoCreateRecord(
      meetingInput({
        ...baseFields,
        location: "123 Main St",
        meeting_url: "https://meet.google.com/abc-defg-hij",
        attendees: JSON.stringify(["client@acme.com"]),
        external_event_id: "event-123",
        provider: "googlecalendar",
      })
    );

    expect(result.ok).toBe(true);
    const inserted = h.db.meetings[0];
    expect(inserted).toMatchObject({
      workspace_id: "ws-1",
      title: "Kickoff: Brand Refresh",
      start_time: "2026-08-10T17:00:00.000Z",
      end_time: "2026-08-10T17:30:00.000Z",
      address: "123 Main St",
      meeting_url: "https://meet.google.com/abc-defg-hij",
      attendees: ["client@acme.com"],
      external_event_id: "event-123",
      source_external_id: "event-123",
      external_provider: "googlecalendar",
      provider: "google-calendar",
      capture_event_id: "cap-1",
      origin: "google",
      source_origin: "found",
    });
  });

  it("defaults end_time to start + 30 minutes when absent", async () => {
    const result = await autoCreateRecord(
      meetingInput({
        title: "Quick sync",
        start_time: "2026-08-10T17:00:00.000Z",
      })
    );

    expect(result.ok).toBe(true);
    expect(h.db.meetings[0].end_time).toBe("2026-08-10T17:30:00.000Z");
  });

  it("still fails closed without title or start_time", async () => {
    const result = await autoCreateRecord(
      meetingInput({ title: "No time" })
    );

    expect(result.ok).toBe(false);
    expect(h.db.meetings).toHaveLength(0);
  });
});

describe("autoCreateRecord — resource creation", () => {
  const fileFields = {
    title: "Contract for Acme project",
    category: "contract",
    document_type: "contract",
  };

  it("creates the files row from the evidence path (no acting user, uploaded_by null)", async () => {
    const result = await autoCreateRecord(
      meetingInput(fileFields, {
        entityType: "resource",
        identifier: "file:client@acme.com:contract for acme project",
      })
    );

    expect(result.ok).toBe(true);
    expect(h.db.files[0]).toMatchObject({
      workspace_id: "ws-1",
      file_name: "Contract for Acme project",
      category: "contract",
      document_type: "contract",
      capture_event_id: "cap-1",
      source: "capture",
    });
    expect(h.db.files[0].uploaded_by).toBeUndefined();
    expect(h.db.evidenceUpdates[0].patch.status).toBe("created");
  });

  it("drops a category that is not a valid file_category enum", async () => {
    const result = await autoCreateRecord(
      meetingInput(
        { title: "Mystery doc", category: "not-a-category" },
        {
          entityType: "resource",
          identifier: "file:a@b.com:mystery doc",
        }
      )
    );

    expect(result.ok).toBe(true);
    expect(h.db.files[0].category).toBeUndefined();
  });
});

describe("autoCreateRecord — work naming discipline", () => {
  function workInput(
    fields: Record<string, string>,
    overrides: Partial<AutoCreateRecordInput> = {},
  ) {
    return meetingInput(fields, {
      entityType: "work",
      identifier: "work:client@acme.com:sam-example",
      ...overrides,
    });
  }

  it("never christens a work record with a known person's name", async () => {
    h.db.people.push({
      id: "person-frank",
      workspace_id: "ws-1",
      name: "Sam Example",
      email: "frank@acme.com",
      deleted_at: null,
    });

    const result = await autoCreateRecord(workInput({ name: "Sam Example" }));

    expect(result.ok).toBe(true);
    expect(h.db.work[0].name).toBe("Sam Example — Project");
    expect(h.db.work[0].slug).toBe("sam-example-project");
  });

  it("never christens a work record with a known organization's name", async () => {
    h.db.organizations.push({
      id: "org-acme",
      workspace_id: "ws-1",
      name: "Acme Studio",
      deleted_at: null,
    });

    const result = await autoCreateRecord(workInput({ name: "Acme Studio" }));

    expect(result.ok).toBe(true);
    expect(h.db.work[0].name).toBe("Acme Studio — Project");
  });

  it("anchors the placeholder to the counterparty when the name is missing", async () => {
    const result = await autoCreateRecord(
      workInput({ counterparty: "Jane Doe" }),
    );

    expect(result.ok).toBe(true);
    expect(h.db.work[0].name).toBe("Jane Doe — Project");
  });

  it("keeps a substantive project name even when a counterparty rides along", async () => {
    h.db.people.push({
      id: "person-frank",
      workspace_id: "ws-1",
      name: "Sam Example",
      deleted_at: null,
    });

    const result = await autoCreateRecord(
      workInput({ name: "Brand Photography", counterparty: "Sam Example" }),
    );

    expect(result.ok).toBe(true);
    expect(h.db.work[0].name).toBe("Brand Photography");
  });

  it("treats a name identical to the counterparty as a thread artifact", async () => {
    const result = await autoCreateRecord(
      workInput({ name: "sam-example", counterparty: "Sam Example" }),
    );

    expect(result.ok).toBe(true);
    expect(h.db.work[0].name).toBe("Sam Example — Project");
  });

  it("still fails closed when neither name nor counterparty exists", async () => {
    const result = await autoCreateRecord(workInput({}));

    expect(result.ok).toBe(false);
    expect(h.db.work).toHaveLength(0);
  });

  it("LLM proposal wins over a person-flavored subject", async () => {
    h.db.captures.push({
      id: "cap-1",
      workspace_id: "ws-1",
      extracted_data: {
        sender_email: "barrett@thestudio.com",
        subject: "Barrett on the Studio",
        snippet: "Attached is the signed service agreement.",
        attachments: [{ name: "Playground Website Service Agreement.pdf" }],
      },
      raw_payload: {},
    });
    h.proposeWorkNameSpy.mockResolvedValueOnce({
      name: "Playground Website",
      confidence: 92,
    });

    const result = await autoCreateRecord(
      workInput({ name: "Barrett on the Studio" }),
    );

    expect(result.ok).toBe(true);
    expect(h.db.work[0].name).toBe("Playground Website");
    expect(h.db.work[0].slug).toBe("playground-website");
    // The birth log carries the LLM-chosen label, not the subject.
    expect(h.recordSaltLearningSpy).toHaveBeenCalledWith(
      expect.objectContaining({ newValue: "Playground Website" }),
    );
  });

  it("passes the capture's email context to the naming read", async () => {
    h.db.captures.push({
      id: "cap-1",
      workspace_id: "ws-1",
      extracted_data: {
        from: "Barrett <barrett@thestudio.com>",
        subject: "Barrett on the Studio",
        snippet: "Attached is the signed service agreement.",
        attachments: [{ name: "Playground Website Service Agreement.pdf" }],
      },
      raw_payload: {},
    });

    await autoCreateRecord(
      workInput({ name: "Barrett on the Studio", counterparty: "Barrett" }),
    );

    expect(h.proposeWorkNameSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: "ws-1",
        subject: "Barrett on the Studio",
        bodyExcerpt: "Attached is the signed service agreement.",
        attachmentNames: ["Playground Website Service Agreement.pdf"],
        senderName: "Barrett",
        counterparty: "Barrett",
      }),
    );
  });

  it("falls back to the deterministic subject when the LLM has no proposal", async () => {
    h.db.captures.push({
      id: "cap-1",
      workspace_id: "ws-1",
      extracted_data: { subject: "Brand Photography" },
      raw_payload: {},
    });

    const result = await autoCreateRecord(workInput({ name: "Brand Photography" }));

    expect(result.ok).toBe(true);
    expect(h.db.work[0].name).toBe("Brand Photography");
  });

  it("falls back to deterministic naming when the LLM read throws", async () => {
    h.db.captures.push({
      id: "cap-1",
      workspace_id: "ws-1",
      extracted_data: { subject: "Brand Photography" },
      raw_payload: {},
    });
    h.proposeWorkNameSpy.mockRejectedValueOnce(new Error("llm down"));

    const result = await autoCreateRecord(workInput({ name: "Brand Photography" }));

    expect(result.ok).toBe(true);
    expect(h.db.work[0].name).toBe("Brand Photography");
  });

  it("rejects an LLM proposal that exactly names a known person", async () => {
    h.db.people.push({
      id: "person-frank",
      workspace_id: "ws-1",
      name: "Sam Example",
      deleted_at: null,
    });
    h.db.captures.push({
      id: "cap-1",
      workspace_id: "ws-1",
      extracted_data: { subject: "Sam Example" },
      raw_payload: {},
    });
    h.proposeWorkNameSpy.mockResolvedValueOnce({
      name: "Sam Example",
      confidence: 95,
    });

    const result = await autoCreateRecord(workInput({ name: "Sam Example" }));

    expect(result.ok).toBe(true);
    expect(h.db.work[0].name).toBe("Sam Example — Project");
  });

  it("never calls the naming read without a capture", async () => {
    const result = await autoCreateRecord(
      workInput({ name: "Brand Photography" }, { captureId: undefined }),
    );

    expect(result.ok).toBe(true);
    expect(h.db.work[0].name).toBe("Brand Photography");
    expect(h.proposeWorkNameSpy).not.toHaveBeenCalled();
  });

  it("links resources born from the same thread and re-propagates their terms", async () => {
    // The SOW birthed a resource from an earlier email on the same thread.
    h.db.files.push({
      id: "file-sow",
      workspace_id: "ws-1",
      file_name: "SOW.pdf",
      deleted_at: null,
    });
    h.db.evidence.push({
      id: "ev-resource",
      workspace_id: "ws-1",
      entity_type: "file",
      identifier: "file:client@acme.com:sam-example",
      status: "created",
      created_record_id: "file-sow",
    });

    const result = await autoCreateRecord(
      workInput(
        { name: "Brand Photography" },
        { identifier: "work:client@acme.com:sam-example" },
      ),
    );

    expect(result.ok).toBe(true);
    expect(h.db.links[0]).toMatchObject({
      source_type: "resource",
      source_id: "file-sow",
      target_type: "work",
      target_id: h.db.work[0].id,
      relation_type: "attachment",
    });
    // No stored analysis on the resource → a fresh read is triggered.
    expect(h.propagateStoredWorkTermsSpy).toHaveBeenCalledWith({
      workspaceId: "ws-1",
      resourceId: "file-sow",
    });
    expect(h.analyzeResourceContentSpy).toHaveBeenCalledWith({
      workspaceId: "ws-1",
      resourceId: "file-sow",
    });
  });
});

describe("autoCreateRecord — resource birth enrichment", () => {
  it("stores the source excerpt and links the sender when known", async () => {
    h.db.people.push({
      id: "person-frank",
      workspace_id: "ws-1",
      name: "Sam Example",
      email: "frank@acme.com",
      deleted_at: null,
    });

    const result = await autoCreateRecord(
      meetingInput(
        {
          title: "Contract for Acme project",
          category: "contract",
          from: "Sam Example <frank@acme.com>",
          source_excerpt: "Attached is the contract for the brand photography project…",
        },
        {
          entityType: "resource",
          identifier: "file:frank@acme.com:contract for acme project",
        },
      ),
    );

    expect(result.ok).toBe(true);
    expect(h.db.files[0]).toMatchObject({
      person_id: "person-frank",
      // Evidence-born rows carry no file bytes — valid_file_data exempts
      // system-authored resources.
      created_by_system: true,
      extracted_data: {
        source_excerpt: "Attached is the contract for the brand photography project…",
      },
    });
    expect(h.analyzeResourceContentSpy).toHaveBeenCalledWith({
      workspaceId: "ws-1",
      resourceId: h.db.files[0].id,
    });
  });

  it("links the resource to a work record born from the same capture", async () => {
    h.db.work.push({
      id: "work-1",
      workspace_id: "ws-1",
      name: "Brand Photography",
      deleted_at: null,
    });
    h.db.evidence.push({
      id: "ev-work",
      workspace_id: "ws-1",
      entity_type: "work",
      identifier: "work:frank@acme.com:sow",
      status: "created",
      created_record_id: "work-1",
    });
    h.db.evidenceSignals.push({
      evidence_id: "ev-work",
      capture_id: "cap-1",
      signal: "proposal_or_sow_attached",
    });

    const result = await autoCreateRecord(
      meetingInput(
        { title: "SOW.pdf", category: "proposal", document_type: "sow" },
        { entityType: "resource", identifier: "file:frank@acme.com:sow" },
      ),
    );

    expect(result.ok).toBe(true);
    expect(h.db.links[0]).toMatchObject({
      source_type: "resource",
      source_id: h.db.files[0].id,
      target_type: "work",
      target_id: "work-1",
    });
  });

  it("still births the resource when enrichment throws", async () => {
    h.analyzeResourceContentSpy.mockRejectedValueOnce(new Error("llm down"));

    const result = await autoCreateRecord(
      meetingInput(
        { title: "Contract.pdf", category: "contract" },
        { entityType: "resource", identifier: "file:a@b.com:contract" },
      ),
    );

    expect(result.ok).toBe(true);
    expect(h.db.files).toHaveLength(1);
  });
});

describe("autoCreateRecord — billing artifact-first", () => {
  const billingFields = {
    amount_cents: "175000",
    direction: "receivable",
    number: "SALT-0044",
  };

  function billingInput(
    fields: Record<string, string>,
    overrides: Partial<AutoCreateRecordInput> = {},
  ) {
    return meetingInput(fields, {
      entityType: "billing",
      identifier: "stripe:in_1PZq8c",
      ...overrides,
    });
  }

  it("attaches a link resource when app_url evidence is present", async () => {
    const result = await autoCreateRecord(
      billingInput({
        ...billingFields,
        app_url: "https://invoice.stripe.com/i/acct_test/in_1PZq8c",
      })
    );

    expect(result.ok).toBe(true);
    // app_url stays on the record as a projection of the attached Resource.
    expect(h.db.billing[0]).toMatchObject({
      workspace_id: "ws-1",
      amount_cents: 175000,
      direction: "receivable",
      number: "SALT-0044",
      app_url: "https://invoice.stripe.com/i/acct_test/in_1PZq8c",
    });
    expect(h.db.files[0]).toMatchObject({
      workspace_id: "ws-1",
      file_type: "link",
      external_url: "https://invoice.stripe.com/i/acct_test/in_1PZq8c",
      file_name: "Invoice SALT-0044",
      created_by_system: true,
      uploaded_by: null,
      capture_event_id: "cap-1",
    });
    expect(h.db.links[0]).toMatchObject({
      workspace_id: "ws-1",
      source_type: "resource",
      source_id: h.db.files[0].id,
      target_type: "billing",
      target_id: h.db.billing[0].id,
      relation_type: "attachment",
    });
  });

  it("creates no artifact without app_url evidence", async () => {
    const result = await autoCreateRecord(billingInput(billingFields));

    expect(result.ok).toBe(true);
    expect(h.db.billing).toHaveLength(1);
    expect(h.db.files).toHaveLength(0);
    expect(h.db.links).toHaveLength(0);
  });

  it("carries a source key so the NULLS NOT DISTINCT constraint never bites", async () => {
    const result = await autoCreateRecord(billingInput(billingFields));

    expect(result.ok).toBe(true);
    expect(h.db.billing[0]).toMatchObject({
      source: "salt_inferred",
      source_external_id: "in_1PZq8c",
    });
  });

  it("dedupes on the provider source key (producer-born records)", async () => {
    // The factual producer path (Stripe/QuickBooks) births billing records
    // directly under the bare external id. Proposal-lane evidence crossing
    // the bar for the same charge must link to it — never double-create.
    const first = await autoCreateRecord(billingInput(billingFields));
    expect(first.ok).toBe(true);
    const billingId = h.db.billing[0].id;

    const second = await autoCreateRecord(billingInput(billingFields));
    expect(second.ok).toBe(true);
    if (second.ok) expect(second.recordId).toBe(billingId);
    expect(h.db.billing).toHaveLength(1);
  });

  it("dedupes on the invoice number when the source keys differ", async () => {
    const first = await autoCreateRecord(billingInput(billingFields));
    expect(first.ok).toBe(true);
    const billingId = h.db.billing[0].id;

    // Email-classified evidence for the same invoice carries no provider
    // id — the number match still prevents a double-create.
    const second = await autoCreateRecord(
      billingInput(billingFields, {
        identifier: "SALT-0044",
        evidenceId: "ev-2",
      }),
    );
    expect(second.ok).toBe(true);
    if (second.ok) expect(second.recordId).toBe(billingId);
    expect(h.db.billing).toHaveLength(1);
  });

  it("dedupes on the hosted page URL when the number is absent", async () => {
    const { number: _omitted, ...withoutNumber } = billingFields;
    const fields = {
      ...withoutNumber,
      app_url: "https://invoice.stripe.com/i/acct_test/in_1PZq8c",
    };
    const first = await autoCreateRecord(billingInput(fields));
    expect(first.ok).toBe(true);

    const second = await autoCreateRecord(
      billingInput(fields, { identifier: "invoice-email-1", evidenceId: "ev-2" }),
    );
    expect(second.ok).toBe(true);
    if (second.ok) expect(second.recordId).toBe(h.db.billing[0].id);
    expect(h.db.billing).toHaveLength(1);
    // The linked path attaches no duplicate artifact.
    expect(h.db.files).toHaveLength(1);
    expect(h.db.links).toHaveLength(1);
  });

  it("artifacts auto-create alongside a record — and standalone resources too", async () => {
    // Alongside a billing record, from a background path: the artifact
    // resource is created.
    const alongside = await autoCreateRecord(
      billingInput({
        ...billingFields,
        app_url: "https://invoice.stripe.com/i/acct_test/in_1PZq8c",
      })
    );
    expect(alongside.ok).toBe(true);
    expect(h.db.files).toHaveLength(1);
    expect(h.db.files[0].created_by_system).toBe(true);

    // Standalone resource evidence creates as well — memory full autonomy
    // retired the confirm-only carve-out; the threshold is the only gate.
    const standalone = await autoCreateRecord(
      meetingInput(
        { title: "Mystery invoice PDF" },
        { entityType: "resource", identifier: "file:a@b.com:mystery invoice" }
      )
    );
    expect(standalone.ok).toBe(true);
    expect(h.db.files).toHaveLength(2);
  });
});
