import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const rpc = vi.fn();

vi.mock("@/app/_lib/supabase/admin", () => ({
  createAdminClient: () => ({ rpc }),
}));

import { getWorkspaceCogs, noteLocalSpend, resetCogsCache } from "./cogs";

const PERIOD = "2026-08-01T00:00:00.000Z";

describe("getWorkspaceCogs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetCogsCache();
    rpc.mockResolvedValue({ data: 1_000, error: null });
  });

  it("reads the ledger and reports the figure as known", async () => {
    const result = await getWorkspaceCogs("ws-1", PERIOD, null, 0);

    expect(result).toEqual({ micros: 1_000, known: true });
    expect(rpc).toHaveBeenCalledWith("workspace_cogs_micros", {
      p_workspace_id: "ws-1",
      p_since: PERIOD,
      p_until: null,
    });
  });

  it("coerces a bigint returned as a string", async () => {
    // PostgREST serialises bigint as a string once it exceeds the JS safe
    // integer range. Treating that as NaN would silently zero a large bill.
    rpc.mockResolvedValue({ data: "9007199254740993", error: null });

    const result = await getWorkspaceCogs("ws-1", PERIOD, null, 0);

    expect(result.known).toBe(true);
    expect(result.micros).toBe(9007199254740993);
  });

  it("serves the cached figure inside the TTL without re-querying", async () => {
    await getWorkspaceCogs("ws-1", PERIOD, null, 0);
    await getWorkspaceCogs("ws-1", PERIOD, null, 30_000);

    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it("re-queries once the TTL lapses", async () => {
    await getWorkspaceCogs("ws-1", PERIOD, null, 0);
    await getWorkspaceCogs("ws-1", PERIOD, null, 61_000);

    expect(rpc).toHaveBeenCalledTimes(2);
  });

  it("adds spend recorded since the snapshot, so a burst tightens the gate", async () => {
    // The case that motivates local-delta accounting: one Ask Salt turn is up
    // to twelve model calls. Without this, every admission check inside the
    // TTL would price the workspace as it was before the turn started.
    await getWorkspaceCogs("ws-1", PERIOD, null, 0);

    noteLocalSpend("ws-1", 250);
    noteLocalSpend("ws-1", 750);

    const result = await getWorkspaceCogs("ws-1", PERIOD, null, 10_000);

    expect(result.micros).toBe(2_000);
    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it("drops the local delta on refetch, because the ledger now contains it", async () => {
    await getWorkspaceCogs("ws-1", PERIOD, null, 0);
    noteLocalSpend("ws-1", 500);

    rpc.mockResolvedValue({ data: 1_500, error: null });
    const result = await getWorkspaceCogs("ws-1", PERIOD, null, 61_000);

    // 1500, not 2000 — counting the delta again would double-charge.
    expect(result.micros).toBe(1_500);
  });

  it("ignores local spend for a workspace it is not tracking", async () => {
    noteLocalSpend("ws-unknown", 5_000);

    const result = await getWorkspaceCogs("ws-unknown", PERIOD, null, 0);

    expect(result.micros).toBe(1_000);
  });

  it("rejects nonsense deltas rather than corrupting the snapshot", async () => {
    await getWorkspaceCogs("ws-1", PERIOD, null, 0);

    noteLocalSpend("ws-1", Number.NaN);
    noteLocalSpend("ws-1", -500);

    const result = await getWorkspaceCogs("ws-1", PERIOD, null, 10_000);

    expect(result.micros).toBe(1_000);
  });

  it("invalidates when the billing period rolls over", async () => {
    await getWorkspaceCogs("ws-1", PERIOD, null, 0);
    await getWorkspaceCogs("ws-1", "2026-09-01T00:00:00.000Z", null, 1_000);

    // Carrying August's spend into September would deny a workspace that just
    // got a fresh month of budget.
    expect(rpc).toHaveBeenCalledTimes(2);
  });

  it("reports unknown rather than zero when the query fails cold", async () => {
    // Zero means "this workspace has cost nothing", which would hand every
    // workspace a full budget during a database outage.
    rpc.mockResolvedValue({ data: null, error: { message: "boom" } });

    const result = await getWorkspaceCogs("ws-1", PERIOD, null, 0);

    expect(result).toEqual({ micros: 0, known: false });
  });

  it("keeps serving a stale snapshot when a refresh fails", async () => {
    await getWorkspaceCogs("ws-1", PERIOD, null, 0);
    noteLocalSpend("ws-1", 400);

    rpc.mockResolvedValue({ data: null, error: { message: "boom" } });
    const result = await getWorkspaceCogs("ws-1", PERIOD, null, 61_000);

    // An out-of-date ceiling still bounds spend; failing open does not.
    expect(result).toEqual({ micros: 1_400, known: true });
  });
});
