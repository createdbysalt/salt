import { beforeEach, describe, expect, it, vi } from "vitest";

const integrations: Array<{ workspace_id: string; provider: string }> = [];

vi.mock("server-only", () => ({}));

vi.mock("@/app/_lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => Promise.resolve({ data: integrations, error: null }),
        }),
      }),
    }),
  }),
}));

const gmailBackfill = vi.fn();
const calendarBackfill = vi.fn();
const driveBackfill = vi.fn();
const stripeBackfill = vi.fn();

vi.mock("./gmail-backfill", () => ({
  backfillGmailCaptures: (...args: unknown[]) => gmailBackfill(...args),
}));

vi.mock("./connector-backfills", () => ({
  backfillCalendarCaptures: (...args: unknown[]) => calendarBackfill(...args),
  backfillDriveCaptures: (...args: unknown[]) => driveBackfill(...args),
  backfillStripeCaptures: (...args: unknown[]) => stripeBackfill(...args),
}));

import { runCaptureReconciliation } from "./capture-reconciliation";

describe("runCaptureReconciliation", () => {
  beforeEach(() => {
    integrations.length = 0;
    vi.clearAllMocks();
  });

  it("dispatches each capture-enabled connection to its provider backfill", async () => {
    integrations.push(
      { workspace_id: "ws-1", provider: "gmail" },
      { workspace_id: "ws-1", provider: "googlecalendar" },
      { workspace_id: "ws-2", provider: "stripe" },
    );
    gmailBackfill.mockResolvedValue({ success: true, capturesCreated: 3 });
    calendarBackfill.mockResolvedValue({ success: true, capturesCreated: 1 });
    stripeBackfill.mockResolvedValue({ success: true, capturesCreated: 2 });

    const result = await runCaptureReconciliation();

    expect(gmailBackfill).toHaveBeenCalledWith("ws-1", expect.any(Object));
    expect(calendarBackfill).toHaveBeenCalledWith("ws-1", expect.any(Object));
    expect(stripeBackfill).toHaveBeenCalledWith("ws-2", expect.any(Object));
    expect(result.connectionsReconciled).toBe(3);
    expect(result.capturesCreated).toBe(6);
    expect(result.failures).toHaveLength(0);
  });

  it("skips providers without a reconciler", async () => {
    integrations.push({ workspace_id: "ws-1", provider: "notion" });

    const result = await runCaptureReconciliation();

    expect(result.connectionsSeen).toBe(1);
    expect(result.connectionsReconciled).toBe(0);
  });

  it("isolates per-connection failures", async () => {
    integrations.push(
      { workspace_id: "ws-1", provider: "gmail" },
      { workspace_id: "ws-2", provider: "gmail" },
    );
    gmailBackfill
      .mockRejectedValueOnce(new Error("token expired"))
      .mockResolvedValueOnce({ success: true, capturesCreated: 4 });

    const result = await runCaptureReconciliation();

    expect(result.connectionsReconciled).toBe(1);
    expect(result.capturesCreated).toBe(4);
    expect(result.failures).toEqual([
      { workspaceId: "ws-1", provider: "gmail", error: "token expired" },
    ]);
  });

  it("records backfills that report failure without throwing", async () => {
    integrations.push({ workspace_id: "ws-3", provider: "googledrive" });
    driveBackfill.mockResolvedValue({
      success: false,
      capturesCreated: 0,
      error: "googledrive not connected",
    });

    const result = await runCaptureReconciliation();

    expect(result.failures).toEqual([
      {
        workspaceId: "ws-3",
        provider: "googledrive",
        error: "googledrive not connected",
      },
    ]);
  });
});
