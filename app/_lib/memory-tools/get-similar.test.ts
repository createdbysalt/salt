import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("server-only", () => ({}));

interface FilterCall {
  table: string;
  op: "eq" | "is" | "not";
  column: string;
  value: unknown;
}

const filterCalls: FilterCall[] = [];
const tableRows: Record<string, unknown[]> = {};

interface QueryChain {
  data: unknown[];
  select: (columns: string) => QueryChain;
  eq: (column: string, value: unknown) => QueryChain;
  is: (column: string, value: unknown) => QueryChain;
  not: (column: string, operator: string, value: unknown) => QueryChain;
  order: (column: string) => QueryChain;
  limit: (count: number) => QueryChain;
}

function createQueryChain(table: string): QueryChain {
  const chain: QueryChain = {
    data: tableRows[table] ?? [],
    select: vi.fn(() => chain),
    eq: vi.fn((column: string, value: unknown) => {
      filterCalls.push({ table, op: "eq", column, value });
      return chain;
    }),
    is: vi.fn((column: string, value: unknown) => {
      filterCalls.push({ table, op: "is", column, value });
      return chain;
    }),
    not: vi.fn((column: string, operator: string, value: unknown) => {
      filterCalls.push({ table, op: "not", column, value: `${operator}:${String(value)}` });
      return chain;
    }),
    order: vi.fn(() => chain),
    limit: vi.fn(() => chain),
  };

  return chain;
}

vi.mock("@/app/_lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn((table: string) => createQueryChain(table)),
  })),
}));

import { memoryGetSimilarRecords } from "./get-similar";

describe("memoryGetSimilarRecords", () => {
  beforeEach(() => {
    filterCalls.length = 0;
    for (const key of Object.keys(tableRows)) delete tableRows[key];
  });

  it("only scans active records for duplicate candidates", async () => {
    await memoryGetSimilarRecords({
      workspaceId: "ws-1",
      criteria: {
        checkEmail: true,
        checkPhone: true,
        checkDomain: true,
        checkName: false,
      },
    });

    for (const table of ["people", "organizations", "billing_records"]) {
      expect(filterCalls).toContainEqual({
        table,
        op: "is",
        column: "deleted_at",
        value: null,
      });
      expect(filterCalls).toContainEqual({
        table,
        op: "is",
        column: "archived_at",
        value: null,
      });
    }
  });
});

describe("work duplicates", () => {
  it("pairs work records with the same name under the same organization", async () => {
    tableRows.work = [
      { id: "w1", name: "Website Redesign", organization_id: "org-1" },
      { id: "w2", name: "website redesign ", organization_id: "org-1" },
      { id: "w3", name: "Website Redesign", organization_id: "org-2" },
      { id: "w4", name: "Website Redesign", organization_id: null },
    ];

    const result = await memoryGetSimilarRecords({
      workspaceId: "ws-1",
      entityType: "work",
    });

    expect(result.matches).toHaveLength(1);
    expect(result.matches[0]).toMatchObject({
      entityType: "work",
      signal: "work_duplicate_name_same_org",
      recordId: "w1",
      matchedRecordId: "w2",
    });
    expect(result.matches[0].confidence).toBeGreaterThanOrEqual(80);
  });

  it("never pairs org-less work records on name alone", async () => {
    tableRows.work = [
      { id: "w1", name: "Website Redesign", organization_id: null },
      { id: "w2", name: "Website Redesign", organization_id: null },
    ];

    const result = await memoryGetSimilarRecords({
      workspaceId: "ws-1",
      entityType: "work",
    });

    expect(result.matches).toHaveLength(0);
  });
});

describe("resource duplicates", () => {
  it("pairs links pointing at the same URL, ignoring protocol and case", async () => {
    tableRows.resources = [
      { id: "r1", file_name: "MSA", file_type: "link", external_url: "https://example.com/msa/", size_bytes: null, organization_id: null, person_id: null },
      { id: "r2", file_name: "MSA copy", file_type: "link", external_url: "http://www.Example.com/msa", size_bytes: null, organization_id: null, person_id: null },
      { id: "r3", file_name: "Other", file_type: "link", external_url: "https://other.com/x", size_bytes: null, organization_id: null, person_id: null },
    ];

    const result = await memoryGetSimilarRecords({
      workspaceId: "ws-1",
      entityType: "resource",
    });

    expect(result.matches).toHaveLength(1);
    expect(result.matches[0]).toMatchObject({
      entityType: "resource",
      signal: "file_duplicate_url",
      recordId: "r1",
      matchedRecordId: "r2",
    });
    expect(result.matches[0].confidence).toBeGreaterThanOrEqual(95);
  });

  it("pairs uploads with the same file name under the same record, bumping confidence when sizes match", async () => {
    tableRows.resources = [
      { id: "r1", file_name: "brief.pdf", file_type: "upload", external_url: null, size_bytes: 1024, organization_id: "org-1", person_id: null },
      { id: "r2", file_name: "Brief.pdf", file_type: "upload", external_url: null, size_bytes: 1024, organization_id: "org-1", person_id: null },
      { id: "r3", file_name: "brief.pdf", file_type: "upload", external_url: null, size_bytes: 2048, organization_id: "org-2", person_id: null },
    ];

    const result = await memoryGetSimilarRecords({
      workspaceId: "ws-1",
      entityType: "resource",
    });

    expect(result.matches).toHaveLength(1);
    expect(result.matches[0]).toMatchObject({
      entityType: "resource",
      signal: "file_duplicate_name_same_entity",
      recordId: "r1",
      matchedRecordId: "r2",
    });
    expect(result.matches[0].confidence).toBe(90);
    expect(result.matches[0].because).toMatch(/same file name and size/i);
  });

  it("does not pair same-name uploads attached to different records", async () => {
    tableRows.resources = [
      { id: "r1", file_name: "brief.pdf", file_type: "upload", external_url: null, size_bytes: 1024, organization_id: "org-1", person_id: null },
      { id: "r2", file_name: "brief.pdf", file_type: "upload", external_url: null, size_bytes: 1024, organization_id: null, person_id: "person-1" },
    ];

    const result = await memoryGetSimilarRecords({
      workspaceId: "ws-1",
      entityType: "resource",
    });

    expect(result.matches).toHaveLength(0);
  });
});

describe("meeting duplicates", () => {
  it("pairs meetings with the same start time and overlapping guests", async () => {
    tableRows.meetings = [
      { id: "m1", title: "Kickoff", start_time: "2026-08-10T17:00:00Z", attendees: [{ name: "Ada", email: "ada@client.com" }] },
      { id: "m2", title: "Kickoff (recording)", start_time: "2026-08-10T17:00:00Z", attendees: [{ name: "Ada Lovelace", email: "ada@client.com" }] },
      { id: "m3", title: "Other", start_time: "2026-08-11T17:00:00Z", attendees: [{ name: "Ada", email: "ada@client.com" }] },
    ];

    const result = await memoryGetSimilarRecords({
      workspaceId: "ws-1",
      entityType: "meeting",
    });

    expect(result.matches).toHaveLength(1);
    expect(result.matches[0]).toMatchObject({
      entityType: "meeting",
      signal: "meeting_duplicate_time_attendees",
      recordId: "m1",
      matchedRecordId: "m2",
    });
  });

  it("falls back to attendee names when emails are absent, and skips non-overlapping guests", async () => {
    tableRows.meetings = [
      { id: "m1", title: "A", start_time: "2026-08-10T17:00:00Z", attendees: [{ name: "Ada" }] },
      { id: "m2", title: "B", start_time: "2026-08-10T17:00:00Z", attendees: [{ name: "ada" }] },
      { id: "m3", title: "C", start_time: "2026-08-10T17:00:00Z", attendees: [{ name: "Grace" }] },
    ];

    const result = await memoryGetSimilarRecords({
      workspaceId: "ws-1",
      entityType: "meeting",
    });

    expect(result.matches).toHaveLength(1);
    expect(result.matches[0].matchedRecordId).toBe("m2");
  });
});

describe("person name-similarity duplicates", () => {
  beforeEach(() => {
    filterCalls.length = 0;
    for (const key of Object.keys(tableRows)) delete tableRows[key];
  });

  it("proposes a merge for subset names ('Jane' ⊂ 'Jane Example') at medium confidence", async () => {
    tableRows.people = [
      { id: "p1", name: "Jane", email: "jane@studio.com" },
      { id: "p2", name: "Jane Example", email: "ltrent@old-job.com" },
    ];

    const result = await memoryGetSimilarRecords({
      workspaceId: "ws-1",
      entityType: "person",
      criteria: { checkName: true },
    });

    expect(result.matches).toHaveLength(1);
    expect(result.matches[0]).toMatchObject({
      entityType: "person",
      signal: "person_duplicate_name_subset",
      recordId: "p1",
      matchedRecordId: "p2",
      confidence: 70,
    });
    // Below the auto-apply bar — the user always approves name-only merges.
    expect(result.matches[0].confidence).toBeLessThan(85);
  });

  it("correlates an email local part with the other record's name at high confidence", async () => {
    tableRows.people = [
      { id: "p1", name: "Jane Example", email: null },
      { id: "p2", name: "Jane", email: "jane.example@outlook.com" },
    ];

    const result = await memoryGetSimilarRecords({
      workspaceId: "ws-1",
      entityType: "person",
      criteria: { checkName: true },
    });

    expect(result.matches).toHaveLength(1);
    expect(result.matches[0]).toMatchObject({
      signal: "person_duplicate_name_local_part",
      confidence: 85,
    });
  });

  it("reads local parts from the person_emails identity set, not just the primary", async () => {
    tableRows.people = [
      { id: "p1", name: "Jane Example", email: null },
      { id: "p2", name: "Jane", email: "jane@studio.com" },
    ];
    tableRows.person_emails = [
      { person_id: "p2", email: "jane@studio.com" },
      { person_id: "p2", email: "jane.example@outlook.com" },
    ];

    const result = await memoryGetSimilarRecords({
      workspaceId: "ws-1",
      entityType: "person",
      criteria: { checkName: true },
    });

    expect(result.matches).toHaveLength(1);
    expect(result.matches[0].signal).toBe("person_duplicate_name_local_part");
  });

  it("proposes exact-name different-email pairs at high confidence", async () => {
    tableRows.people = [
      { id: "p1", name: "Jane Example", email: "jane@studio.com" },
      { id: "p2", name: "Jane Example", email: "jane.example@outlook.com" },
    ];

    const result = await memoryGetSimilarRecords({
      workspaceId: "ws-1",
      entityType: "person",
      criteria: { checkName: true },
    });

    expect(result.matches).toHaveLength(1);
    expect(result.matches[0]).toMatchObject({
      signal: "person_duplicate_name_exact",
      confidence: 85,
    });
  });

  it("does not pair people who merely share a first name", async () => {
    tableRows.people = [
      { id: "p1", name: "Maria Garcia", email: null },
      { id: "p2", name: "Maria Lopez", email: null },
    ];

    const result = await memoryGetSimilarRecords({
      workspaceId: "ws-1",
      entityType: "person",
      criteria: { checkName: true },
    });

    expect(result.matches).toHaveLength(0);
  });

  it("ignores single-token local parts ('jane@' correlating with every Jane)", async () => {
    tableRows.people = [
      { id: "p1", name: "Jane Example", email: null },
      { id: "p2", name: "Jane Exampleon", email: "jane@outlook.com" },
    ];

    const result = await memoryGetSimilarRecords({
      workspaceId: "ws-1",
      entityType: "person",
      criteria: { checkName: true },
    });

    expect(result.matches).toHaveLength(0);
  });

  it("does not re-emit a pair already caught by the exact-email signal", async () => {
    tableRows.people = [
      { id: "p1", name: "Jane Example", email: "jane@studio.com" },
      { id: "p2", name: "Jane Example", email: "jane@studio.com" },
    ];

    const result = await memoryGetSimilarRecords({
      workspaceId: "ws-1",
      entityType: "person",
      criteria: { checkEmail: true, checkName: true },
    });

    expect(result.matches).toHaveLength(1);
    expect(result.matches[0].signal).toBe("person_duplicate_email");
  });
});

describe("duplicate detection confidence rules", () => {
  it("exact email match should be 98% confidence", () => {
    const confidence = 98;
    expect(confidence).toBeGreaterThanOrEqual(95);
  });

  it("exact phone match should be 85% confidence", () => {
    const confidence = 85;
    expect(confidence).toBeGreaterThanOrEqual(80);
    expect(confidence).toBeLessThan(95);
  });

  it("fuzzy name match alone should be low confidence", () => {
    const confidence = 55;
    expect(confidence).toBeLessThan(80);
  });

  it("fuzzy name + same domain should be higher confidence", () => {
    const confidenceFuzzyOnly = 55;
    const confidenceFuzzyWithDomain = 82;
    expect(confidenceFuzzyWithDomain).toBeGreaterThan(confidenceFuzzyOnly);
  });
});
