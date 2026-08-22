import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * autoCreateRecord — meeting dedupe guard + file confirm path (audit #7).
 *
 * Meetings: capture-driven creation must never double-create against the
 * existing insert paths (cal-booking-processor keys on cal_booking_id;
 * calendar events carry external_event_id / source_external_id). A match
 * links the evidence to the existing record instead of inserting.
 * Resources: creation only happens with an acting user (an explicit
 * confirm); background paths fail closed.
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
    evidenceUpdates: [] as Array<{ id: string; patch: Row }>,
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
    return {
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
    return {
      update: (patch: Row) => ({
        eq: async (_column: string, id: unknown) => {
          db.evidenceUpdates.push({ id: id as string, patch });
          return { error: null };
        },
      }),
    };
  }

  function peopleQuery() {
    return {
      insert: (row: Row) => {
        const inserted = { id: `person-${++idCounter}`, ...row };
        db.people.push(inserted);
        return {
          select: () => ({
            single: async () => ({ data: { id: inserted.id }, error: null }),
          }),
        };
      },
    };
  }

  function fakeSupabase() {
    return {
      from: (table: string) => {
        if (table === "meetings") return meetingsQuery();
        if (table === "resources") return filesQuery();
        if (table === "billing_records") return billingQuery();
        if (table === "entity_links") return linksQuery();
        if (table === "pending_evidence") return pendingEvidenceQuery();
        if (table === "people") return peopleQuery();
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
    db.evidenceUpdates.length = 0;
    idCounter = 0;
  }

  const recordSaltLearningSpy = vi.fn(async (_input: unknown) => ({
    id: "learn-1",
  }));

  return { db, resetDb, fakeSupabase, recordSaltLearningSpy };
});

vi.mock("@/app/_lib/supabase/admin", () => ({
  createAdminClient: () => h.fakeSupabase(),
}));

vi.mock("@/app/_lib/learning/salt-learnings", () => ({
  recordSaltLearning: (input: unknown) => h.recordSaltLearningSpy(input),
}));

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
  h.recordSaltLearningSpy.mockClear();
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

  it("labels user-confirmed births as confirmed", async () => {
    const result = await autoCreateRecord(
      meetingInput(
        { title: "Contract", category: "contract" },
        {
          entityType: "resource",
          identifier: "file:a@b.com:contract",
          actingUserId: "user-1",
        }
      )
    );

    expect(result.ok).toBe(true);
    const call = h.recordSaltLearningSpy.mock.calls[0][0] as {
      evidenceSummary: string;
    };
    expect(call.evidenceSummary).toContain("You confirmed");
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
  it("derives the name from the email identifier when no name was extracted", async () => {
    const result = await autoCreateRecord(
      meetingInput(
        { email: "daniel.r.261107@gmail.com" },
        {
          entityType: "person",
          identifier: "daniel.r.261107@gmail.com",
        }
      )
    );

    expect(result.ok).toBe(true);
    expect(h.db.people[0]).toMatchObject({
      workspace_id: "ws-1",
      name: "Pedro H 261107",
      email: "daniel.r.261107@gmail.com",
    });
    expect(h.db.evidenceUpdates[0].patch.status).toBe("created");
  });

  it("still fails closed when there is no name and the identifier is not an email", async () => {
    const result = await autoCreateRecord(
      meetingInput({}, { entityType: "person", identifier: "unknown" })
    );

    expect(result.ok).toBe(false);
    expect(h.db.people).toHaveLength(0);
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

describe("autoCreateRecord — file confirm path", () => {
  const fileFields = {
    title: "Contract for Acme project",
    category: "contract",
    document_type: "contract",
  };

  it("creates the files row with the confirming user as uploaded_by", async () => {
    const result = await autoCreateRecord(
      meetingInput(fileFields, {
        entityType: "resource",
        identifier: "file:client@acme.com:contract for acme project",
        actingUserId: "user-1",
      })
    );

    expect(result.ok).toBe(true);
    expect(h.db.files[0]).toMatchObject({
      workspace_id: "ws-1",
      file_name: "Contract for Acme project",
      uploaded_by: "user-1",
      category: "contract",
      document_type: "contract",
      capture_event_id: "cap-1",
      source: "capture",
    });
    expect(h.db.evidenceUpdates[0].patch.status).toBe("created");
  });

  it("fails closed without an acting user (background paths)", async () => {
    const result = await autoCreateRecord(
      meetingInput(fileFields, {
        entityType: "resource",
        identifier: "file:client@acme.com:contract for acme project",
      })
    );

    expect(result.ok).toBe(false);
    expect(h.db.files).toHaveLength(0);
    expect(h.db.evidenceUpdates).toHaveLength(0);
  });

  it("drops a category that is not a valid file_category enum", async () => {
    const result = await autoCreateRecord(
      meetingInput(
        { title: "Mystery doc", category: "not-a-category" },
        {
          entityType: "resource",
          identifier: "file:a@b.com:mystery doc",
          actingUserId: "user-1",
        }
      )
    );

    expect(result.ok).toBe(true);
    expect(h.db.files[0].category).toBeUndefined();
  });
});

describe("autoCreateRecord — billing artifact-first", () => {
  const billingFields = {
    amount_cents: "175000",
    direction: "receivable",
    number: "SALT-0044",
  };

  function billingInput(fields: Record<string, string>) {
    return meetingInput(fields, {
      entityType: "billing",
      identifier: "stripe:in_1PZq8c",
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

  it("is idempotent across a retried capture (same URL, same record)", async () => {
    const fields = {
      ...billingFields,
      app_url: "https://invoice.stripe.com/i/acct_test/in_1PZq8c",
    };
    const first = await autoCreateRecord(billingInput(fields));
    expect(first.ok).toBe(true);
    const billingId = h.db.billing[0].id;

    // A second evidence row for the same invoice URL attaches to a new
    // record id in the worst case — the resource must still dedupe on URL.
    const second = await autoCreateRecord(billingInput(fields));
    expect(second.ok).toBe(true);

    expect(h.db.files).toHaveLength(1);
    expect(h.db.links).toHaveLength(2);
    expect(h.db.links.map((l) => l.source_id)).toEqual([
      h.db.files[0].id,
      h.db.files[0].id,
    ]);
    expect(h.db.links[0].target_id).toBe(billingId);
  });

  it("carve-out scope: artifacts auto-create alongside a record, never standalone", async () => {
    // Alongside a billing record, from a background path (no acting user):
    // the artifact resource is created.
    const alongside = await autoCreateRecord(
      billingInput({
        ...billingFields,
        app_url: "https://invoice.stripe.com/i/acct_test/in_1PZq8c",
      })
    );
    expect(alongside.ok).toBe(true);
    expect(h.db.files).toHaveLength(1);
    expect(h.db.files[0].created_by_system).toBe(true);

    // Standalone, from the same kind of background path: fail closed.
    const standalone = await autoCreateRecord(
      meetingInput(
        { title: "Mystery invoice PDF" },
        { entityType: "resource", identifier: "file:a@b.com:mystery invoice" }
      )
    );
    expect(standalone.ok).toBe(false);
    expect(h.db.files).toHaveLength(1);
  });
});
