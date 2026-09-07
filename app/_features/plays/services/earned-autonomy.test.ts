import { beforeEach, describe, expect, it, vi } from "vitest";

interface ApprovalRow {
  id: string;
  workspace_id: string;
  playbook_slug: string;
  tool_slug: string;
  approved_count: number;
  dismissed_count: number;
  autonomy_granted_at: string | null;
  autonomy_offered_at: string | null;
  autonomy_declined_at: string | null;
  last_approved_at: string | null;
  last_dismissed_at: string | null;
}

const rows: ApprovalRow[] = [];
const inserted: Array<Record<string, unknown>> = [];
const updates: Array<{ id?: string; patch: Record<string, unknown> }> = [];
const insertedRuns: Array<Record<string, unknown>> = [];
let openOfferExists = false;

function fakeQuery(table: string) {
  const filters: Record<string, unknown> = {};
  const builder = {
    select: () => builder,
    eq: (column: string, value: unknown) => {
      filters[column] = value;
      return builder;
    },
    not: () => builder,
    order: () => builder,
    limit: () => builder,
    maybeSingle: async () => {
      if (table === "play_runs") {
        return { data: openOfferExists ? { id: "offer-run" } : null, error: null };
      }
      const match = rows.find(
        (r) =>
          r.workspace_id === filters.workspace_id &&
          r.playbook_slug === filters.playbook_slug &&
          r.tool_slug === filters.tool_slug
      );
      return { data: match ?? null, error: null };
    },
    update: (patch: Record<string, unknown>) => ({
      eq: (column: string, value: unknown) => {
        if (column === "id") {
          updates.push({ id: value as string, patch });
          return Promise.resolve({ error: null });
        }
        // grant/decline/revoke chain: .update().eq(ws).eq(slug).eq(tool)
        return {
          eq: () => ({
            eq: async () => {
              updates.push({ patch });
              return { error: null };
            },
          }),
        };
      },
    }),
    insert: async (row: Record<string, unknown>) => {
      if (table === "play_runs") {
        insertedRuns.push(row);
      } else {
        inserted.push(row);
      }
      return { error: null };
    },
    // Awaiting the builder directly (no maybeSingle) is the list-query
    // terminal used by getPlaybookApprovalRates.
    then: (resolve: (value: { data: ApprovalRow[]; error: null }) => void) => {
      resolve({
        data: rows.filter((r) => r.workspace_id === filters.workspace_id),
        error: null,
      });
    },
  };
  return builder;
}

vi.mock("@/app/_lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: (table: string) => fakeQuery(table) }),
}));

import {
  EARNED_AUTONOMY_THRESHOLD,
  declineAutonomyOffer,
  getPlaybookApprovalRates,
  grantAutonomy,
  hasEarnedAutonomy,
  recordActionApproval,
  recordActionDismissal,
  revokeAutonomy,
} from "./earned-autonomy";

function makeRow(overrides: Partial<ApprovalRow> = {}): ApprovalRow {
  return {
    id: "a1",
    workspace_id: "ws-1",
    playbook_slug: "email-triage",
    tool_slug: "GMAIL_ARCHIVE",
    approved_count: 0,
    dismissed_count: 0,
    autonomy_granted_at: null,
    autonomy_offered_at: null,
    autonomy_declined_at: null,
    last_approved_at: null,
    last_dismissed_at: null,
    ...overrides,
  };
}

beforeEach(() => {
  rows.length = 0;
  inserted.length = 0;
  updates.length = 0;
  insertedRuns.length = 0;
  openOfferExists = false;
});

describe("hasEarnedAutonomy", () => {
  it("is false with no approval history", async () => {
    expect(await hasEarnedAutonomy("ws-1", "email-triage", "GMAIL_ARCHIVE")).toBe(false);
  });

  it("is false at the threshold without a grant — offers never flip silently", async () => {
    rows.push(
      makeRow({ approved_count: EARNED_AUTONOMY_THRESHOLD, autonomy_offered_at: "2026-08-08" })
    );
    expect(await hasEarnedAutonomy("ws-1", "email-triage", "GMAIL_ARCHIVE")).toBe(false);
  });

  it("is true only once the user grants the offer", async () => {
    rows.push(
      makeRow({
        approved_count: EARNED_AUTONOMY_THRESHOLD,
        autonomy_granted_at: "2026-08-08",
      })
    );
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
    rows.push(makeRow({ approved_count: 4 }));

    await recordActionApproval("ws-1", "email-triage", "GMAIL_ARCHIVE");

    expect(updates).toHaveLength(1);
    expect(updates[0].patch.approved_count).toBe(5);
  });

  it("creates an autonomy offer when the count crosses the threshold", async () => {
    rows.push(makeRow({ approved_count: EARNED_AUTONOMY_THRESHOLD - 1 }));

    await recordActionApproval("ws-1", "email-triage", "GMAIL_ARCHIVE");

    expect(insertedRuns).toHaveLength(1);
    expect(insertedRuns[0]).toMatchObject({
      workspace_id: "ws-1",
      state: "queued",
      source_context: expect.objectContaining({ playbook_slug: "email-triage" }),
    });
    const evidence = (insertedRuns[0] as { trigger_evidence: Record<string, unknown> })
      .trigger_evidence;
    expect(evidence.kind).toBe("autonomy_offer");
    expect(evidence.tool_slug).toBe("GMAIL_ARCHIVE");
  });

  it("does not create an offer below the threshold", async () => {
    rows.push(makeRow({ approved_count: 3 }));

    await recordActionApproval("ws-1", "email-triage", "GMAIL_ARCHIVE");

    expect(insertedRuns).toHaveLength(0);
  });

  it("does not offer when autonomy is already granted", async () => {
    rows.push(
      makeRow({
        approved_count: EARNED_AUTONOMY_THRESHOLD * 2 - 1,
        autonomy_granted_at: "2026-08-01",
      })
    );

    await recordActionApproval("ws-1", "email-triage", "GMAIL_ARCHIVE");

    expect(insertedRuns).toHaveLength(0);
  });

  it("dedups while an offer is still open", async () => {
    rows.push(makeRow({ approved_count: EARNED_AUTONOMY_THRESHOLD - 1 }));
    openOfferExists = true;

    await recordActionApproval("ws-1", "email-triage", "GMAIL_ARCHIVE");

    expect(insertedRuns).toHaveLength(0);
  });

  it("suppresses the offer when dismissals outnumber approvals", async () => {
    rows.push(
      makeRow({
        approved_count: EARNED_AUTONOMY_THRESHOLD - 1,
        dismissed_count: EARNED_AUTONOMY_THRESHOLD + 1,
      })
    );

    await recordActionApproval("ws-1", "email-triage", "GMAIL_ARCHIVE");

    expect(insertedRuns).toHaveLength(0);
  });

  it("still offers when approvals keep pace with dismissals", async () => {
    rows.push(
      makeRow({
        approved_count: EARNED_AUTONOMY_THRESHOLD - 1,
        dismissed_count: EARNED_AUTONOMY_THRESHOLD,
      })
    );

    await recordActionApproval("ws-1", "email-triage", "GMAIL_ARCHIVE");

    expect(insertedRuns).toHaveLength(1);
  });
});

describe("recordActionDismissal", () => {
  it("seeds the dismissal counter on first dismissal", async () => {
    await recordActionDismissal("ws-1", "email-triage", "GMAIL_ARCHIVE");

    expect(inserted).toHaveLength(1);
    expect(inserted[0]).toMatchObject({
      workspace_id: "ws-1",
      playbook_slug: "email-triage",
      tool_slug: "GMAIL_ARCHIVE",
      approved_count: 0,
      dismissed_count: 1,
      last_dismissed_at: expect.any(String),
    });
  });

  it("increments an existing counter without touching approvals", async () => {
    rows.push(makeRow({ approved_count: 3, dismissed_count: 2 }));

    await recordActionDismissal("ws-1", "email-triage", "GMAIL_ARCHIVE");

    expect(updates).toHaveLength(1);
    expect(updates[0].patch.dismissed_count).toBe(3);
    expect(updates[0].patch.approved_count).toBeUndefined();
  });
});

describe("getPlaybookApprovalRates", () => {
  it("aggregates per-playbook rates across tools", async () => {
    rows.push(
      makeRow({
        id: "a1",
        approved_count: 8,
        dismissed_count: 2,
        last_approved_at: "2026-08-20",
      }),
      makeRow({
        id: "a2",
        tool_slug: "GMAIL_LABEL",
        approved_count: 2,
        dismissed_count: 0,
        autonomy_granted_at: "2026-08-21",
        last_approved_at: "2026-08-22",
      }),
      makeRow({
        id: "a3",
        playbook_slug: "payment-reconciliation",
        tool_slug: "STRIPE_LIST_CHARGES",
        approved_count: 1,
        dismissed_count: 3,
        last_dismissed_at: "2026-08-25",
      })
    );

    const rates = await getPlaybookApprovalRates("ws-1");

    expect(rates).toHaveLength(2);
    const triage = rates.find((r) => r.playbookSlug === "email-triage");
    expect(triage).toMatchObject({
      approvedCount: 10,
      dismissedCount: 2,
      grantedTools: ["GMAIL_LABEL"],
      lastApprovedAt: "2026-08-22",
    });
    expect(triage?.approvalRate).toBeCloseTo(10 / 12);
    const recon = rates.find((r) => r.playbookSlug === "payment-reconciliation");
    expect(recon?.approvalRate).toBeCloseTo(1 / 4);
    expect(recon?.lastDismissedAt).toBe("2026-08-25");
  });

  it("returns a null rate when nothing is recorded", async () => {
    rows.push(makeRow({ approved_count: 0, dismissed_count: 0 }));

    const rates = await getPlaybookApprovalRates("ws-1");

    expect(rates[0].approvalRate).toBeNull();
  });

  it("scopes to the workspace", async () => {
    rows.push(makeRow({ workspace_id: "ws-2", approved_count: 5 }));

    expect(await getPlaybookApprovalRates("ws-1")).toHaveLength(0);
  });
});

describe("grant / decline / revoke", () => {
  it("grantAutonomy sets autonomy_granted_at", async () => {
    await grantAutonomy("ws-1", "email-triage", "GMAIL_ARCHIVE");

    expect(updates).toHaveLength(1);
    expect(updates[0].patch.autonomy_granted_at).toEqual(expect.any(String));
    expect(updates[0].patch.autonomy_declined_at).toBeNull();
  });

  it("declineAutonomyOffer sets autonomy_declined_at", async () => {
    await declineAutonomyOffer("ws-1", "email-triage", "GMAIL_ARCHIVE");

    expect(updates).toHaveLength(1);
    expect(updates[0].patch.autonomy_declined_at).toEqual(expect.any(String));
  });

  it("revokeAutonomy clears the grant", async () => {
    await revokeAutonomy("ws-1", "email-triage", "GMAIL_ARCHIVE");

    expect(updates).toHaveLength(1);
    expect(updates[0].patch.autonomy_granted_at).toBeNull();
  });
});
