import "server-only";

/**
 * Capture reconciliation (connector-platform Phase 3.6).
 *
 * Composio trigger delivery can miss events (polling gaps, webhook outages,
 * providers with no trigger coverage yet). This low-frequency sweep runs the
 * provider backfill for every capture-enabled connection over a short
 * overlap window; envelope dedupe keys make replays idempotent, so overlap
 * is safety, not duplication.
 *
 * This is the production successor to the manual "Sync & Scan" affordance,
 * which is demoted to a dev-build debug button.
 */

import { createAdminClient } from "@/app/_lib/supabase/admin";
import { backfillGmailCaptures } from "./gmail-backfill";
import { createLlmCall } from "./capture-intelligence-cron";
import type { LlmCall } from "./generic-signal-extractor";
import {
  getWebhookVolumeMetrics,
  type WebhookVolumeMetrics,
} from "./webhook-volume";
import {
  backfillCalBookings,
  backfillCalendarCaptures,
  backfillCalendlyEvents,
  backfillDriveCaptures,
  backfillDropboxCaptures,
  backfillOutlookCaptures,
  backfillQuickbooksCaptures,
  backfillStripeCaptures,
} from "./connector-backfills";

/** Short overlap windows — wide enough to bridge missed deliveries. */
const RECONCILE_WINDOWS = {
  gmailLookbackDays: 2,
  gmailMaxPerQuery: 100,
  calendarLookbackDays: 7,
  calendarLimit: 50,
  stripeLimit: 20,
  calendlyLookbackDays: 7,
  calendlyLimit: 50,
  dropboxLookbackDays: 7,
  dropboxLimit: 100,
  outlookLookbackDays: 2,
  outlookLimit: 50,
} as const;

type ReconcilableProvider =
  | "gmail"
  | "googlecalendar"
  | "googledrive"
  | "stripe"
  | "cal"
  | "calendly"
  | "dropbox"
  | "quickbooks"
  | "outlook";

const RECONCILERS: Record<
  ReconcilableProvider,
  (
    workspaceId: string,
    llmCall: LlmCall | null,
  ) => Promise<{ success: boolean; capturesCreated: number; error?: string }>
> = {
  gmail: (workspaceId) =>
    backfillGmailCaptures(workspaceId, {
      lookbackDays: RECONCILE_WINDOWS.gmailLookbackDays,
      maxMessagesPerQuery: RECONCILE_WINDOWS.gmailMaxPerQuery,
    }),
  googlecalendar: (workspaceId, llmCall) =>
    backfillCalendarCaptures(workspaceId, {
      lookbackDays: RECONCILE_WINDOWS.calendarLookbackDays,
      limit: RECONCILE_WINDOWS.calendarLimit,
      llmCall,
    }),
  googledrive: (workspaceId, llmCall) => backfillDriveCaptures(workspaceId, { llmCall }),
  stripe: (workspaceId, llmCall) =>
    backfillStripeCaptures(workspaceId, {
      limit: RECONCILE_WINDOWS.stripeLimit,
      llmCall,
    }),
  // Cal.com, Calendly, Dropbox, and QuickBooks have zero Composio trigger
  // types — this cron IS their ingestion (capture-pipeline repair Phase 4).
  cal: (workspaceId, llmCall) => backfillCalBookings(workspaceId, { llmCall }),
  calendly: (workspaceId, llmCall) =>
    backfillCalendlyEvents(workspaceId, {
      lookbackDays: RECONCILE_WINDOWS.calendlyLookbackDays,
      limit: RECONCILE_WINDOWS.calendlyLimit,
      llmCall,
    }),
  dropbox: (workspaceId, llmCall) =>
    backfillDropboxCaptures(workspaceId, {
      lookbackDays: RECONCILE_WINDOWS.dropboxLookbackDays,
      limit: RECONCILE_WINDOWS.dropboxLimit,
      llmCall,
    }),
  quickbooks: (workspaceId, llmCall) =>
    backfillQuickbooksCaptures(workspaceId, { llmCall }),
  // Outlook is webhook-first; this is the missed-delivery repair path (the
  // same role the Gmail backfill plays for Gmail).
  outlook: (workspaceId, llmCall) =>
    backfillOutlookCaptures(workspaceId, {
      lookbackDays: RECONCILE_WINDOWS.outlookLookbackDays,
      limit: RECONCILE_WINDOWS.outlookLimit,
      llmCall,
    }),
};

function isReconcilable(provider: string): provider is ReconcilableProvider {
  return provider in RECONCILERS;
}

/**
 * "Reprocess window W against playbook P" (Phase 5.3) — the retention-stance
 * counterpart: there is no local archive to replay, so reprocessing history
 * is a paginated Composio fetch pushed back through adapter → ingestEnvelope
 * → signal absorption. Dedupe makes capture rows idempotent; signal
 * absorption runs for duplicates too, so a NEW playbook's fill-rules see the
 * whole window without re-ingesting anything.
 */
export async function reprocessCaptureWindow(
  workspaceId: string,
  provider: string,
  options: { lookbackDays?: number; maxItems?: number; llmCall?: LlmCall | null } = {},
): Promise<{ success: boolean; capturesCreated: number; error?: string }> {
  const { lookbackDays = 30, maxItems = 500, llmCall = null } = options;

  switch (provider) {
    case "gmail":
      return backfillGmailCaptures(workspaceId, {
        lookbackDays,
        maxMessagesPerQuery: maxItems,
      });
    case "googlecalendar":
      return backfillCalendarCaptures(workspaceId, {
        lookbackDays,
        limit: Math.min(maxItems, 250),
        llmCall,
      });
    case "googledrive":
      return backfillDriveCaptures(workspaceId, {
        lookbackDays,
        limit: maxItems,
        llmCall,
      });
    case "stripe":
      return backfillStripeCaptures(workspaceId, { limit: maxItems, llmCall });
    case "cal":
      return backfillCalBookings(workspaceId, { llmCall });
    case "calendly":
      return backfillCalendlyEvents(workspaceId, {
        lookbackDays,
        limit: Math.min(maxItems, 100),
        llmCall,
      });
    case "dropbox":
      return backfillDropboxCaptures(workspaceId, {
        lookbackDays,
        limit: Math.min(maxItems, 200),
        llmCall,
      });
    case "quickbooks":
      return backfillQuickbooksCaptures(workspaceId, { llmCall });
    case "outlook":
      return backfillOutlookCaptures(workspaceId, {
        lookbackDays,
        limit: Math.min(maxItems, 100),
        llmCall,
      });
    default:
      return {
        success: false,
        capturesCreated: 0,
        error: `No reprocess path for provider '${provider}'`,
      };
  }
}

export interface ReconciliationRunResult {
  connectionsSeen: number;
  connectionsReconciled: number;
  capturesCreated: number;
  failures: Array<{ workspaceId: string; provider: string; error: string }>;
  /** Per-provider webhook/capture volume over the trailing 24h (Phase 6). */
  webhookVolume: WebhookVolumeMetrics;
  /** Connections skipped by the 3.3 gates, with the reason. */
  skipped: { cadence: number; webhookHealthy: number };
}

/**
 * Tiered cadence (Sources plan 3.3): the cron fires every 6h. Starter
 * workspaces reconcile at most once a day; paid tiers every run. A missing
 * subscription row reads as starter — the cheaper cadence.
 */
const STARTER_MIN_INTERVAL_MS = 24 * 60 * 60 * 1000;

/**
 * Webhook-health gate: a BOTH-mode provider (trigger coverage AND a
 * backfill) with proven delivery inside one cron period doesn't need its
 * repair sweep — the events are already flowing. No stamp means no proof
 * (quiet and broken are indistinguishable), so the sweep runs.
 */
const WEBHOOK_HEALTH_WINDOW_MS = 6 * 60 * 60 * 1000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readTimestamp(config: Record<string, unknown>, key: string): number {
  const value = config[key];
  return typeof value === "string" ? Date.parse(value) : NaN;
}

/**
 * Sweep every capture-enabled, active connection. Per-connection failures
 * isolate — one broken account never stalls the fleet.
 */
export async function runCaptureReconciliation(): Promise<ReconciliationRunResult> {
  const admin = createAdminClient();
  const { data: integrations, error } = await admin
    .from("workspace_integrations")
    .select("id, workspace_id, provider, config")
    .eq("capture_enabled", true)
    .eq("is_active", true);

  if (error) {
    throw new Error(`Failed to list capture-enabled connections: ${error.message}`);
  }

  const result: ReconciliationRunResult = {
    connectionsSeen: integrations?.length ?? 0,
    connectionsReconciled: 0,
    capturesCreated: 0,
    failures: [],
    webhookVolume: { windowHours: 24, outcomes: [], captures: [], truncated: false },
    skipped: { cadence: 0, webhookHealthy: 0 },
  };

  const rows = integrations ?? [];
  if (rows.length === 0) return result;

  // Batch the two gate inputs instead of per-connection lookups.
  const workspaceIds = [...new Set(rows.map((row) => row.workspace_id))];
  const { data: subscriptions } = await admin
    .from("workspace_subscriptions")
    .select("workspace_id, tier")
    .in("workspace_id", workspaceIds);
  const tierByWorkspace = new Map(
    (subscriptions ?? []).map((row) => [row.workspace_id, row.tier] as const),
  );

  // Metered LLM call per workspace (Sources plan 5.4): long-tail providers
  // without hand-written parsing supplement deterministic signals with the
  // generic-signal-extractor. Metering needs a userId — attribute to the
  // workspace owner. A lookup failure degrades to deterministic-only signals.
  const { data: owners } = await admin
    .from("workspace_members")
    .select("workspace_id, user_id")
    .in("workspace_id", workspaceIds)
    .eq("role", "owner");
  const ownerByWorkspace = new Map(
    (owners ?? []).map((row) => [row.workspace_id, row.user_id] as const),
  );
  const llmCallByWorkspace = new Map<string, LlmCall>();
  for (const [wsId, userId] of ownerByWorkspace) {
    llmCallByWorkspace.set(wsId, createLlmCall(wsId, userId));
  }

  // BOTH-mode providers = trigger coverage in the DB (the seam rule:
  // connector #16 is a row, not a code change). Providers with zero trigger
  // types (cal, calendly, dropbox, quickbooks) are always reconciled — this
  // cron IS their ingestion.
  const { data: triggerRows } = await admin
    .from("connector_trigger_types")
    .select("toolkit_slug")
    .eq("enabled_for_capture", true)
    .eq("sync_status", "active");
  const triggerCovered = new Set(
    (triggerRows ?? []).map((row) => row.toolkit_slug),
  );

  const now = Date.now();

  for (const integration of rows) {
    if (!isReconcilable(integration.provider)) continue;

    const config = isRecord(integration.config) ? integration.config : {};

    // Cadence gate: starter workspaces reconcile 1×/day, not every run.
    const tier = tierByWorkspace.get(integration.workspace_id) ?? "starter";
    if (tier === "starter") {
      const last = readTimestamp(config, "lastReconciledAt");
      if (Number.isFinite(last) && now - last < STARTER_MIN_INTERVAL_MS) {
        result.skipped.cadence++;
        continue;
      }
    }

    // Webhook-health gate: proven delivery inside the window makes the
    // repair sweep redundant for trigger-covered providers.
    if (triggerCovered.has(integration.provider)) {
      const lastDelivery = readTimestamp(config, "lastWebhookDeliveryAt");
      if (
        Number.isFinite(lastDelivery) &&
        now - lastDelivery < WEBHOOK_HEALTH_WINDOW_MS
      ) {
        result.skipped.webhookHealthy++;
        continue;
      }
    }

    try {
      const run = await RECONCILERS[integration.provider](
        integration.workspace_id,
        llmCallByWorkspace.get(integration.workspace_id) ?? null,
      );
      if (run.success) {
        result.connectionsReconciled++;
        result.capturesCreated += run.capturesCreated;
        // Stamp for the cadence gate. Advisory marker — a lost update to a
        // concurrent webhook stamp costs at most one extra sweep.
        await admin
          .from("workspace_integrations")
          .update({
            config: {
              ...config,
              lastReconciledAt: new Date(now).toISOString(),
            } as never,
          })
          .eq("id", integration.id);
      } else {
        result.failures.push({
          workspaceId: integration.workspace_id,
          provider: integration.provider,
          error: run.error ?? "unknown",
        });
      }
    } catch (error) {
      result.failures.push({
        workspaceId: integration.workspace_id,
        provider: integration.provider,
        error: error instanceof Error ? error.message : "unknown",
      });
    }
  }

  // Volume monitor (Phase 6): the cron response doubles as the per-provider
  // webhook/capture volume report. A metrics failure must not fail the run.
  try {
    result.webhookVolume = await getWebhookVolumeMetrics(24);
  } catch (error) {
    console.error("[capture-reconciliation] volume metrics failed:", error);
  }

  return result;
}

export interface WorkspaceReconciliationResult {
  providers: string[];
  capturesCreated: number;
  failures: Array<{ provider: string; error: string }>;
}

/**
 * Reconcile all capture-enabled connections for a single workspace.
 * Used by the manual "Sync" button — covers all connectors, not just Gmail.
 */
export async function reconcileWorkspaceCaptures(
  workspaceId: string,
  options: { lookbackDays?: number; llmCall?: LlmCall | null } = {},
): Promise<WorkspaceReconciliationResult> {
  const { lookbackDays = 7, llmCall = null } = options;
  const admin = createAdminClient();

  const { data: integrations, error } = await admin
    .from("workspace_integrations")
    .select("provider")
    .eq("workspace_id", workspaceId)
    .eq("capture_enabled", true)
    .eq("is_active", true);

  if (error) {
    throw new Error(`Failed to list capture-enabled connections: ${error.message}`);
  }

  const result: WorkspaceReconciliationResult = {
    providers: [],
    capturesCreated: 0,
    failures: [],
  };

  for (const integration of integrations ?? []) {
    if (!isReconcilable(integration.provider)) continue;

    result.providers.push(integration.provider);

    try {
      const run = await reprocessCaptureWindow(workspaceId, integration.provider, {
        lookbackDays,
        maxItems: 200,
        llmCall,
      });
      if (run.success) {
        result.capturesCreated += run.capturesCreated;
      } else {
        result.failures.push({
          provider: integration.provider,
          error: run.error ?? "unknown",
        });
      }
    } catch (error) {
      result.failures.push({
        provider: integration.provider,
        error: error instanceof Error ? error.message : "unknown",
      });
    }
  }

  return result;
}
