import { beforeEach, describe, expect, it, vi } from "vitest";

interface ApprovalRow {
  id: string;
  workspace_id: string;
  playbook_slug: string;
  tool_slug: string;
  approved_count: number;
}

const rows: ApprovalRow[] = [];
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
          r.workspace_id === filters.workspace_id &&
          r.playbook_slug === filters.playbook_slug &&
          r.tool_slug === filters.tool_slug
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

import {
  EARNED_AUTONOMY_THRESHOLD,
  hasEarnedAutonomy,
  recordActionApproval,
} from "./earned-autonomy";

beforeEach(() => {
  rows.length = 0;
  inserted.length = 0;
  updates.length = 0;
});

describe("hasEarnedAutonomy", () => {
  it("is false with no approval history", async () => {
    expect(await hasEarnedAutonomy("ws-1", "email-triage", "GMAIL_ARCHIVE")).toBe(false);
  });

  it("is false below the threshold", async () => {
    rows.push({
      id: "a1",
      workspace_id: "ws-1",
      playbook_slug: "email-triage",
      tool_slug: "GMAIL_ARCHIVE",
      approved_count: EARNED_AUTONOMY_THRESHOLD - 1,
    });
    expect(await hasEarnedAutonomy("ws-1", "email-triage", "GMAIL_ARCHIVE")).toBe(false);
  });

  it("flips true at the threshold — the step runs silently from here on", async () => {
    rows.push({
      id: "a1",
      workspace_id: "ws-1",
      playbook_slug: "email-triage",
      tool_slug: "GMAIL_ARCHIVE",
      approved_count: EARNED_AUTONOMY_THRESHOLD,
    });
    expect(await hasEarnedAutonomy("ws-1", "email-triage", "GMAIL_ARCHIVE")).toBe(true);
  });
});

describe("recordActionApproval", () => {
  it("seeds the counter on first approval", async () => {
    await recordActionApproval("ws-1", "email-triage", "GMAIL_ARCHIVE");

    expect(inserted).toHaveLength(1);
    expect(inserted[0]).toMatchObject({
      workspace_id: "ws-1",
      playbook_slug: "email-triage",
      tool_slug: "GMAIL_ARCHIVE",
      approved_count: 1,
    });
  });

  it("increments an existing counter", async () => {
    rows.push({
      id: "a1",
      workspace_id: "ws-1",
      playbook_slug: "email-triage",
      tool_slug: "GMAIL_ARCHIVE",
      approved_count: 4,
    });

    await recordActionApproval("ws-1", "email-triage", "GMAIL_ARCHIVE");

    expect(updates).toHaveLength(1);
    expect(updates[0].patch.approved_count).toBe(5);
  });
});
