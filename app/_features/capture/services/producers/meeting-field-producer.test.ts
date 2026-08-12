import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRunCareForSignal = vi.fn();
const mockMemoryUpdateField = vi.fn();

type Filter = [string, string, unknown];
type Query = { table: string; filters: Filter[] };
type Resolver = (query: Query) => { data: unknown };

let resolver: Resolver;
const mockUpdate = vi.fn(() => ({
  eq: vi.fn(async () => ({ error: null })),
}));
const mockFrom = vi.fn((table: string) => {
  const filters: Filter[] = [];
  const builder = {
    select: () => builder,
    eq: (f: string, v: unknown) => {
      filters.push(["eq", f, v]);
      return builder;
    },
    is: (f: string, v: unknown) => {
      filters.push(["is", f, v]);
      return builder;
    },
    ilike: (f: string, v: unknown) => {
      filters.push(["ilike", f, v]);
      return builder;
    },
    gte: (f: string, v: unknown) => {
      filters.push(["gte", f, v]);
      return builder;
    },
    lte: (f: string, v: unknown) => {
      filters.push(["lte", f, v]);
      return builder;
    },
    order: () => builder,
    limit: () => builder,
    update: mockUpdate,
    maybeSingle: async () => resolver({ table, filters }),
    then: (resolve: (value: { data: unknown }) => void) =>
      resolve(resolver({ table, filters })),
  };
  return builder;
});

vi.mock("@/app/_lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockFrom }),
}));
vi.mock("@/app/_features/memory/care/scheduler", () => ({
  runCareForSignal: (...args: unknown[]) => mockRunCareForSignal(...args),
}));
vi.mock("@/app/_lib/memory-tools", () => ({
  memoryUpdateField: (...args: unknown[]) => mockMemoryUpdateField(...args),
}));

import { produceMeetingFieldSignals } from "./meeting-field-producer";

const WS = "ws-1";
const MEETING = { id: "mtg-1", title: "Kickoff — Acme rebrand" };
const OCCURRED = "2025-08-06T17:06:40.000Z";

const FIELDS = {
  signalValues: {
    meeting_type_inferred: "kickoff",
    meeting_summary_extracted: "Aligned on rebrand scope.",
  },
  attendanceEvidence: true,
  attendees: [
    { name: "You", email: "you@usesalt.io", role: "team" as const },
    { name: "Grace Chen", email: "grace@acmecreative.co", role: "client" as const },
  ],
  title: "Kickoff — Acme rebrand",
  occurredAt: OCCURRED,
};

describe("produceMeetingFieldSignals", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRunCareForSignal.mockResolvedValue([]);
    mockMemoryUpdateField.mockResolvedValue({ action: "applied" });
    resolver = () => ({ data: null });
  });

  it("matches by fireflies_meeting_id and dispatches type, summary, and attendance", async () => {
    resolver = ({ filters }) => {
      const byFirefliesId = filters.some(
        ([op, f]) => op === "eq" && f === "fireflies_meeting_id",
      );
      return { data: byFirefliesId ? MEETING : null };
    };

    const result = await produceMeetingFieldSignals({
      workspaceId: WS,
      externalId: "tr-abc123",
      fields: FIELDS,
      source: "fireflies",
    });

    expect(result.meetingId).toBe("mtg-1");
    expect(result.dispatched.sort()).toEqual([
      "meeting_has_attendance_evidence",
      "meeting_summary_extracted",
      "meeting_type_inferred",
    ]);
    expect(mockRunCareForSignal).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: "meeting",
        entityId: "mtg-1",
        signalKey: "meeting_type_inferred",
        evidence: expect.objectContaining({
          signalValues: { meeting_type_inferred: "kickoff" },
        }),
      }),
    );
    expect(mockRunCareForSignal).toHaveBeenCalledWith(
      expect.objectContaining({
        signalKey: "meeting_has_attendance_evidence",
        evidence: expect.objectContaining({
          signalValues: { meeting_has_attendance_evidence: true },
        }),
      }),
    );
  });

  it("writes attendees directly with fill-rule provenance", async () => {
    resolver = () => ({ data: MEETING });

    const result = await produceMeetingFieldSignals({
      workspaceId: WS,
      externalId: "tr-abc123",
      fields: FIELDS,
      source: "fireflies",
    });

    expect(result.attendeesWritten).toBe(true);
    expect(mockMemoryUpdateField).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: "meeting",
        entityId: "mtg-1",
        field: "attendees",
        value: FIELDS.attendees,
        confidence: 95,
        sourceDetails: expect.objectContaining({
          ruleId: "meeting-attendees-meeting_attendees_extracted",
        }),
      }),
    );
  });

  it("falls back to title + start-time window and stamps the routing key", async () => {
    resolver = ({ filters }) => {
      const byFirefliesId = filters.some(
        ([op, f]) => op === "eq" && f === "fireflies_meeting_id",
      );
      const byTitle = filters.some(([op, f]) => op === "ilike" && f === "title");
      if (byFirefliesId) return { data: null };
      if (byTitle) return { data: [MEETING] };
      return { data: null };
    };

    const result = await produceMeetingFieldSignals({
      workspaceId: WS,
      externalId: "tr-abc123",
      fields: FIELDS,
      source: "fireflies",
    });

    expect(result.meetingId).toBe("mtg-1");
    expect(mockUpdate).toHaveBeenCalledWith({ fireflies_meeting_id: "tr-abc123" });
  });

  it("returns null when no meeting matches", async () => {
    resolver = () => ({ data: null });

    const result = await produceMeetingFieldSignals({
      workspaceId: WS,
      externalId: "tr-unknown",
      fields: FIELDS,
      source: "fireflies",
    });

    expect(result.meetingId).toBeNull();
    expect(mockRunCareForSignal).not.toHaveBeenCalled();
    expect(mockMemoryUpdateField).not.toHaveBeenCalled();
  });

  it("refuses to guess when the time window matches multiple meetings", async () => {
    resolver = ({ filters }) => {
      const byTitle = filters.some(([op, f]) => op === "ilike" && f === "title");
      if (byTitle) return { data: [MEETING, { ...MEETING, id: "mtg-2" }] };
      return { data: null };
    };

    const result = await produceMeetingFieldSignals({
      workspaceId: WS,
      externalId: "tr-abc123",
      fields: FIELDS,
      source: "otter",
    });

    expect(result.meetingId).toBeNull();
    expect(mockRunCareForSignal).not.toHaveBeenCalled();
  });
});
