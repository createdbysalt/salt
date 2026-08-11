import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * linkUrlToMeeting — artifact-first meeting notes (Phase 7).
 *
 * "Link URL" on a meeting creates a link Resource (gdrive_doc, fireflies
 * transcript, …) plus an attachment edge — no more meeting_sources
 * kind='linked_file' rows for user-linked URLs.
 */

type Row = Record<string, unknown>;

const h = vi.hoisted(() => {
  const db = {
    meetings: [] as Row[],
    resources: [] as Row[],
    links: [] as Row[],
  };
  let seq = 0;

  type Filter = (row: Row) => boolean;

  function filteredQuery(rows: Row[]) {
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
      maybeSingle: async () => ({
        data: rows.find((row) => filters.every((f) => f(row))) ?? null,
        error: null,
      }),
      single: async () => ({
        data: rows.find((row) => filters.every((f) => f(row))) ?? null,
        error: null,
      }),
      insert: (row: Row) => {
        const inserted = { id: `id-${++seq}`, ...row };
        rows.push(inserted);
        return {
          select: () => ({
            single: async () => ({ data: { id: inserted.id }, error: null }),
          }),
        };
      },
    };
    return builder;
  }

  const supabase = {
    from: (table: string) => {
      if (table === "meetings") return filteredQuery(db.meetings);
      if (table === "resources") return filteredQuery(db.resources);
      if (table === "entity_links") return filteredQuery(db.links);
      throw new Error(`unexpected table ${table}`);
    },
  };

  function reset() {
    db.meetings.length = 0;
    db.resources.length = 0;
    db.links.length = 0;
    db.meetings.push({ id: "11111111-1111-4111-8111-111111111111", workspace_id: "ws-1" });
    seq = 0;
  }

  return { db, supabase, reset };
});

vi.mock("@/app/_lib/supabase/server", () => ({
  createClient: vi.fn(async () => h.supabase),
}));

vi.mock("@/app/_lib/tenancy", () => ({
  getTenantContext: vi.fn(async () => ({
    context: { userId: "user-1", workspaceId: "ws-1" },
  })),
}));

vi.mock("@/app/_lib/tenancy/guards", () => ({
  requireWorkspaceMember: vi.fn((context: { workspaceId: string }) => ({
    id: context.workspaceId,
  })),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { linkUrlToMeeting } from "./meeting-content";

beforeEach(() => {
  h.reset();
});

describe("linkUrlToMeeting", () => {
  it("creates a gdrive_doc resource and attachment edge for a Google Doc URL", async () => {
    const result = await linkUrlToMeeting({
      meetingId: "11111111-1111-4111-8111-111111111111",
      url: "https://docs.google.com/document/d/1ABC123xyz/edit",
      displayName: "Q3 Kickoff notes",
    });

    expect(result.ok).toBe(true);
    expect(h.db.resources).toHaveLength(1);
    expect(h.db.resources[0]).toMatchObject({
      workspace_id: "ws-1",
      file_name: "Q3 Kickoff notes",
      external_url: "https://docs.google.com/document/d/1ABC123xyz/edit",
      resource_type: "gdrive_doc",
      uploaded_by: "user-1",
      created_by_system: false,
    });
    expect(h.db.links[0]).toMatchObject({
      workspace_id: "ws-1",
      source_type: "resource",
      source_id: h.db.resources[0].id,
      target_type: "meeting",
      target_id: "11111111-1111-4111-8111-111111111111",
      relation_type: "attachment",
    });
  });

  it("is idempotent when the same URL is linked again", async () => {
    const input = {
      meetingId: "11111111-1111-4111-8111-111111111111",
      url: "https://otter.ai/u/abc123def456",
    };

    const first = await linkUrlToMeeting(input);
    const second = await linkUrlToMeeting(input);

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    expect(h.db.resources).toHaveLength(1);
    expect(h.db.resources[0].resource_type).toBe("otter_transcript");
    expect(h.db.links).toHaveLength(1);
  });

  it("rejects non-http URLs", async () => {
    const result = await linkUrlToMeeting({
      meetingId: "11111111-1111-4111-8111-111111111111",
      url: "javascript:alert(1)",
    });

    expect(result.ok).toBe(false);
    expect(h.db.resources).toHaveLength(0);
  });

  it("returns NOT_FOUND for meetings outside the workspace", async () => {
    const result = await linkUrlToMeeting({
      meetingId: "22222222-2222-4222-8222-222222222222",
      url: "https://docs.google.com/document/d/1ABC123xyz/edit",
    });

    expect(result.ok).toBe(false);
    expect(h.db.resources).toHaveLength(0);
  });
});
