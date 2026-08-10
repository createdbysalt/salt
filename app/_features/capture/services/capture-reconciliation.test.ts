import { beforeEach, describe, expect, it, vi } from "vitest";

const integrations: Array<{
  id: string;
  workspace_id: string;
  provider: string;
  config: Record<string, unknown> | null;
}> = [];
let subscriptions: Array<{ workspace_id: string; tier: string }> = [];
let owners: Array<{ workspace_id: string; user_id: string }> = [];
let triggerCoveredToolkits: string[] = [];
const configStamps: Array<{ id: string; config: unknown }> = [];

vi.mock("server-only", () => ({}));

vi.mock("@/app/_lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === "workspace_integrations") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => Promise.resolve({ data: integrations, error: null }),
            }),
          }),
          update: (payload: { config: unknown }) => ({
            eq: (_col: string, id: string) => {
              configStamps.push({ id, config: payload.config });
              return Promise.resolve({ error: null });
            },
          }),
        };
      }
      if (table === "workspace_subscriptions") {
        return {
          select: () => ({
            in: () => Promise.resolve({ data: subscriptions, error: null }),
          }),
        };
      }
      if (table === "workspace_members") {
        return {
          select: () => ({
            in: () => ({
              eq: () => Promise.resolve({ data: owners, error: null }),
            }),
          }),
        };
      }
      if (table === "connector_trigger_types") {
        return {
          select: () => ({
            eq: () => ({
              eq: () =>
                Promise.resolve({
                  data: triggerCoveredToolkits.map((slug) => ({
                    toolkit_slug: slug,
                  })),
                  error: null,
                }),
            }),
          }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  }),
}));

const gmailBackfill = vi.fn();
const calendarBackfill = vi.fn();
const driveBackfill = vi.fn();
const stripeBackfill = vi.fn();
const calBackfill = vi.fn();
const calendlyBackfill = vi.fn();
const dropboxBackfill = vi.fn();
const quickbooksBackfill = vi.fn();
const outlookBackfill = vi.fn();

vi.mock("./gmail-backfill", () => ({
  backfillGmailCaptures: (...args: unknown[]) => gmailBackfill(...args),
}));

vi.mock("./connector-backfills", () => ({
  backfillCalendarCaptures: (...args: unknown[]) => calendarBackfill(...args),
  backfillDriveCaptures: (...args: unknown[]) => driveBackfill(...args),
  backfillStripeCaptures: (...args: unknown[]) => stripeBackfill(...args),
  backfillCalBookings: (...args: unknown[]) => calBackfill(...args),
  backfillCalendlyEvents: (...args: unknown[]) => calendlyBackfill(...args),
  backfillDropboxCaptures: (...args: unknown[]) => dropboxBackfill(...args),
  backfillQuickbooksCaptures: (...args: unknown[]) => quickbooksBackfill(...args),
  backfillOutlookCaptures: (...args: unknown[]) => outlookBackfill(...args),
}));

const volumeMetrics = vi.fn(async (_hours?: number) => ({
  windowHours: 24,
  outcomes: [{ triggerSlug: "OUTLOOK_MESSAGE_TRIGGER", outcome: "declined", count: 4 }],
  captures: [{ sourceType: "outlook", count: 12 }],
  truncated: false,
}));
vi.mock("./webhook-volume", () => ({
  getWebhookVolumeMetrics: (hours?: number) => volumeMetrics(hours),
}));

// Keep the LLM machinery out of the unit test — reconciliation only needs a
// stable, identifiable call object per workspace.
vi.mock("./capture-intelligence-cron", () => ({
  createLlmCall: (workspaceId: string, userId: string) =>
    Object.assign(
      async () => "{}",
      { __workspaceId: workspaceId, __userId: userId },
    ),
}));

import { runCaptureReconciliation } from "./capture-reconciliation";

let seq = 0;
function addIntegration(
  workspaceId: string,
  provider: string,
  config: Record<string, unknown> | null = null,
) {
  seq += 1;
  integrations.push({
    id: `int-${seq}`,
    workspace_id: workspaceId,
    provider,
    config,
  });
}

describe("runCaptureReconciliation", () => {
  beforeEach(() => {
    integrations.length = 0;
    subscriptions = [];
    owners = [];
    triggerCoveredToolkits = [];
    configStamps.length = 0;
    seq = 0;
    vi.clearAllMocks();
  });

  it("dispatches each capture-enabled connection to its provider backfill", async () => {
    addIntegration("ws-1", "gmail");
    addIntegration("ws-1", "googlecalendar");
    addIntegration("ws-2", "stripe");
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

  it("dispatches backfill-only providers (their sole ingestion path)", async () => {
    addIntegration("ws-1", "calendly");
    addIntegration("ws-1", "dropbox");
    addIntegration("ws-1", "quickbooks");
    addIntegration("ws-1", "cal");
    calendlyBackfill.mockResolvedValue({ success: true, capturesCreated: 2 });
    dropboxBackfill.mockResolvedValue({ success: true, capturesCreated: 1 });
    quickbooksBackfill.mockResolvedValue({ success: true, capturesCreated: 3 });
    calBackfill.mockResolvedValue({ success: true, capturesCreated: 1 });

    const result = await runCaptureReconciliation();

    expect(calendlyBackfill).toHaveBeenCalledWith("ws-1", expect.any(Object));
    expect(dropboxBackfill).toHaveBeenCalledWith("ws-1", expect.any(Object));
    expect(quickbooksBackfill).toHaveBeenCalledWith("ws-1", expect.any(Object));
    expect(calBackfill).toHaveBeenCalledWith("ws-1", expect.any(Object));
    expect(result.connectionsReconciled).toBe(4);
    expect(result.capturesCreated).toBe(7);
  });

  it("threads a metered llmCall to backfills when the workspace has an owner (plan 5.4)", async () => {
    addIntegration("ws-owned", "dropbox");
    addIntegration("ws-ownerless", "dropbox");
    owners = [{ workspace_id: "ws-owned", user_id: "user-owner" }];
    dropboxBackfill.mockResolvedValue({ success: true, capturesCreated: 0 });

    await runCaptureReconciliation();

    const ownedCall = dropboxBackfill.mock.calls.find(([ws]) => ws === "ws-owned");
    const ownerlessCall = dropboxBackfill.mock.calls.find(
      ([ws]) => ws === "ws-ownerless",
    );
    const ownedLlm = ownedCall?.[1]?.llmCall as unknown as Record<string, string>;
    expect(ownedLlm.__workspaceId).toBe("ws-owned");
    expect(ownedLlm.__userId).toBe("user-owner");
    expect(ownerlessCall?.[1]?.llmCall).toBeNull();
  });

  it("dispatches outlook to the list-based repair backfill", async () => {
    addIntegration("ws-1", "outlook");
    outlookBackfill.mockResolvedValue({ success: true, capturesCreated: 2 });

    const result = await runCaptureReconciliation();

    expect(outlookBackfill).toHaveBeenCalledWith("ws-1", expect.any(Object));
    expect(result.connectionsReconciled).toBe(1);
    expect(result.capturesCreated).toBe(2);
  });

  it("attaches the 24h webhook volume rollup to the run result", async () => {
    addIntegration("ws-1", "outlook");
    outlookBackfill.mockResolvedValue({ success: true, capturesCreated: 1 });

    const result = await runCaptureReconciliation();

    expect(volumeMetrics).toHaveBeenCalledWith(24);
    expect(result.webhookVolume.captures).toEqual([
      { sourceType: "outlook", count: 12 },
    ]);
  });

  it("keeps the run result when volume metrics fail", async () => {
    addIntegration("ws-1", "outlook");
    outlookBackfill.mockResolvedValue({ success: true, capturesCreated: 1 });
    volumeMetrics.mockRejectedValueOnce(new Error("metrics down"));

    const result = await runCaptureReconciliation();

    expect(result.connectionsReconciled).toBe(1);
    expect(result.webhookVolume.outcomes).toEqual([]);
  });

  it("skips providers without a reconciler", async () => {
    addIntegration("ws-1", "notion");

    const result = await runCaptureReconciliation();

    expect(result.connectionsSeen).toBe(1);
    expect(result.connectionsReconciled).toBe(0);
  });

  it("isolates per-connection failures", async () => {
    addIntegration("ws-1", "gmail");
    addIntegration("ws-2", "gmail");
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
    addIntegration("ws-3", "googledrive");
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

  describe("tiered cadence + webhook-health gates (3.3)", () => {
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const twoDaysAgo = new Date(
      Date.now() - 48 * 60 * 60 * 1000,
    ).toISOString();

    it("skips starter workspaces reconciled within the last 24h", async () => {
      addIntegration("ws-1", "gmail", { lastReconciledAt: hourAgo });
      gmailBackfill.mockResolvedValue({ success: true, capturesCreated: 0 });

      const result = await runCaptureReconciliation();

      expect(gmailBackfill).not.toHaveBeenCalled();
      expect(result.skipped).toEqual({ cadence: 1, webhookHealthy: 0 });
    });

    it("runs starter workspaces whose last reconcile was over 24h ago", async () => {
      addIntegration("ws-1", "gmail", { lastReconciledAt: twoDaysAgo });
      gmailBackfill.mockResolvedValue({ success: true, capturesCreated: 1 });

      const result = await runCaptureReconciliation();

      expect(gmailBackfill).toHaveBeenCalled();
      expect(result.connectionsReconciled).toBe(1);
    });

    it("runs paid tiers every cron run regardless of last reconcile", async () => {
      subscriptions = [{ workspace_id: "ws-1", tier: "pro" }];
      addIntegration("ws-1", "gmail", { lastReconciledAt: hourAgo });
      gmailBackfill.mockResolvedValue({ success: true, capturesCreated: 1 });

      const result = await runCaptureReconciliation();

      expect(gmailBackfill).toHaveBeenCalled();
      expect(result.skipped.cadence).toBe(0);
    });

    it("skips trigger-covered providers with proven webhook delivery in the window", async () => {
      subscriptions = [{ workspace_id: "ws-1", tier: "pro" }];
      triggerCoveredToolkits = ["gmail"];
      addIntegration("ws-1", "gmail", { lastWebhookDeliveryAt: hourAgo });
      gmailBackfill.mockResolvedValue({ success: true, capturesCreated: 0 });

      const result = await runCaptureReconciliation();

      expect(gmailBackfill).not.toHaveBeenCalled();
      expect(result.skipped).toEqual({ cadence: 0, webhookHealthy: 1 });
    });

    it("runs trigger-covered providers whose delivery proof is stale", async () => {
      subscriptions = [{ workspace_id: "ws-1", tier: "pro" }];
      triggerCoveredToolkits = ["gmail"];
      addIntegration("ws-1", "gmail", {
        lastWebhookDeliveryAt: twoDaysAgo,
      });
      gmailBackfill.mockResolvedValue({ success: true, capturesCreated: 2 });

      const result = await runCaptureReconciliation();

      expect(gmailBackfill).toHaveBeenCalled();
      expect(result.skipped.webhookHealthy).toBe(0);
    });

    it("never skips backfill-only providers on delivery stamps (the cron is their only ingestion)", async () => {
      subscriptions = [{ workspace_id: "ws-1", tier: "pro" }];
      triggerCoveredToolkits = ["gmail"];
      addIntegration("ws-1", "calendly", {
        lastWebhookDeliveryAt: hourAgo,
      });
      calendlyBackfill.mockResolvedValue({ success: true, capturesCreated: 1 });

      const result = await runCaptureReconciliation();

      expect(calendlyBackfill).toHaveBeenCalled();
      expect(result.skipped.webhookHealthy).toBe(0);
    });

    it("stamps lastReconciledAt after a successful sweep", async () => {
      addIntegration("ws-1", "gmail");
      gmailBackfill.mockResolvedValue({ success: true, capturesCreated: 0 });

      await runCaptureReconciliation();

      expect(configStamps).toHaveLength(1);
      expect(configStamps[0].id).toBe("int-1");
      expect(
        typeof (configStamps[0].config as Record<string, unknown>)
          .lastReconciledAt,
      ).toBe("string");
    });
  });
});
