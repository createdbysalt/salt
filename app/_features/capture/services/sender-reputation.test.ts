import { beforeEach, describe, expect, it, vi } from "vitest";

interface FakeProfileRow {
  id: string;
  workspace_id: string;
  sender_key: string;
  sender_key_type: string;
  capture_count: number | null;
  user_replied_count: number | null;
  reputation_score: number | null;
  response_rate: number | null;
  avg_response_time_hours: number | null;
  user_archived_count: number | null;
  last_calculated_at: string | null;
}

const rows: FakeProfileRow[] = [];
const inserted: Array<Record<string, unknown>> = [];
const updates: Array<{ id: string; patch: Record<string, unknown> }> = [];

function fakeQuery() {
  const filters: Record<string, unknown> = {};
  const builder = {
    select: () => builder,
    eq: (column: string, value: unknown) => {
      filters[column] = value;
      return builder;
    },
    maybeSingle: async () => {
      const match = rows.find(
        (r) =>
          (filters.workspace_id === undefined || r.workspace_id === filters.workspace_id) &&
          (filters.sender_key === undefined || r.sender_key === filters.sender_key) &&
          (filters.sender_key_type === undefined ||
            r.sender_key_type === filters.sender_key_type)
      );
      return { data: match ?? null, error: null };
    },
    update: (patch: Record<string, unknown>) => ({
      eq: async (_column: string, id: unknown) => {
        updates.push({ id: id as string, patch });
        return { error: null };
      },
    }),
    insert: async (row: Record<string, unknown>) => {
      inserted.push(row);
      return { error: null };
    },
  };
  return builder;
}

vi.mock("@/app/_lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: () => fakeQuery() }),
}));

import { loadSenderReputation, recordOutboundReplies } from "./sender-reputation";

beforeEach(() => {
  rows.length = 0;
  inserted.length = 0;
  updates.length = 0;
});

describe("loadSenderReputation", () => {
  it("maps a stored profile onto the classifier's SenderReputation shape", async () => {
    rows.push({
      id: "p1",
      workspace_id: "ws-1",
      sender_key: "anna@studio.com",
      sender_key_type: "email",
      capture_count: 12,
      user_replied_count: 9,
      user_archived_count: 1,
      reputation_score: 78,
      response_rate: 0.75,
      avg_response_time_hours: 4,
      last_calculated_at: "2026-08-01T00:00:00Z",
    });

    const reputation = await loadSenderReputation("ws-1", "Anna@Studio.com");

    expect(reputation).toEqual({
      responseRate: 0.75,
      avgResponseTimeHours: 4,
      captureCount: 12,
      archivedCount: 1,
      repliedCount: 9,
      reputationScore: 78,
      lastCalculatedAt: "2026-08-01T00:00:00Z",
    });
  });

  it("returns null for unknown senders — classifier treats it as first contact", async () => {
    expect(await loadSenderReputation("ws-1", "new@person.com")).toBeNull();
  });
});

describe("recordOutboundReplies", () => {
  it("seeds a profile for recipients Salt has never seen", async () => {
    await recordOutboundReplies("ws-1", ["New@Person.com"]);

    expect(inserted).toHaveLength(1);
    expect(inserted[0]).toMatchObject({
      workspace_id: "ws-1",
      sender_key: "new@person.com",
      sender_key_type: "email",
      kind: "client",
      user_replied_count: 1,
      reputation_score: 55,
    });
  });

  it("bumps replied count, reputation, and response rate on existing profiles", async () => {
    rows.push({
      id: "p1",
      workspace_id: "ws-1",
      sender_key: "anna@studio.com",
      sender_key_type: "email",
      capture_count: 10,
      user_replied_count: 4,
      user_archived_count: 0,
      reputation_score: 60,
      response_rate: 0.4,
      avg_response_time_hours: null,
      last_calculated_at: null,
    });

    await recordOutboundReplies("ws-1", ["anna@studio.com"]);

    expect(updates).toHaveLength(1);
    expect(updates[0].id).toBe("p1");
    expect(updates[0].patch).toMatchObject({
      user_replied_count: 5,
      reputation_score: 65,
      response_rate: 0.5,
    });
  });

  it("caps reputation at 100 and ignores malformed recipients", async () => {
    rows.push({
      id: "p1",
      workspace_id: "ws-1",
      sender_key: "anna@studio.com",
      sender_key_type: "email",
      capture_count: 0,
      user_replied_count: 0,
      user_archived_count: 0,
      reputation_score: 98,
      response_rate: null,
      avg_response_time_hours: null,
      last_calculated_at: null,
    });

    await recordOutboundReplies("ws-1", ["anna@studio.com", "not-an-email", ""]);

    expect(updates).toHaveLength(1);
    expect(updates[0].patch.reputation_score).toBe(100);
    expect(inserted).toHaveLength(0);
  });
});
