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
import {
  backfillCalBookings,
  backfillCalendarCaptures,
  backfillDriveCaptures,
  backfillStripeCaptures,
} from "./connector-backfills";

/** Short overlap windows — wide enough to bridge missed deliveries. */
const RECONCILE_WINDOWS = {
  gmailLookbackDays: 2,
  gmailMaxPerQuery: 100,
  calendarLookbackDays: 7,
  calendarLimit: 50,
  stripeLimit: 20,
} as const;

type ReconcilableProvider =
  | "gmail"
  | "googlecalendar"
  | "googledrive"
  | "stripe"
  | "cal";

const RECONCILERS: Record<
  ReconcilableProvider,
  (workspaceId: string) => Promise<{ success: boolean; capturesCreated: number; error?: string }>
> = {
  gmail: (workspaceId) =>
    backfillGmailCaptures(workspaceId, {
      lookbackDays: RECONCILE_WINDOWS.gmailLookbackDays,
      maxMessagesPerQuery: RECONCILE_WINDOWS.gmailMaxPerQuery,
    }),
  googlecalendar: (workspaceId) =>
    backfillCalendarCaptures(workspaceId, {
      lookbackDays: RECONCILE_WINDOWS.calendarLookbackDays,
      limit: RECONCILE_WINDOWS.calendarLimit,
    }),
  googledrive: (workspaceId) => backfillDriveCaptures(workspaceId),
  stripe: (workspaceId) =>
    backfillStripeCaptures(workspaceId, { limit: RECONCILE_WINDOWS.stripeLimit }),
  // Cal.com has zero Composio trigger types — this cron IS its ingestion.
  cal: (workspaceId) => backfillCalBookings(workspaceId),
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
  options: { lookbackDays?: number; maxItems?: number } = {},
): Promise<{ success: boolean; capturesCreated: number; error?: string }> {
  const { lookbackDays = 30, maxItems = 500 } = options;

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
      });
    case "googledrive":
      return backfillDriveCaptures(workspaceId, {
        lookbackDays,
        limit: maxItems,
      });
    case "stripe":
      return backfillStripeCaptures(workspaceId, { limit: maxItems });
    case "cal":
      return backfillCalBookings(workspaceId);
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
}

/**
 * Sweep every capture-enabled, active connection. Per-connection failures
 * isolate — one broken account never stalls the fleet.
 */
export async function runCaptureReconciliation(): Promise<ReconciliationRunResult> {
  const admin = createAdminClient();
  const { data: integrations, error } = await admin
    .from("workspace_integrations")
    .select("workspace_id, provider")
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
  };

  for (const integration of integrations ?? []) {
    if (!isReconcilable(integration.provider)) continue;

    try {
      const run = await RECONCILERS[integration.provider](integration.workspace_id);
      if (run.success) {
        result.connectionsReconciled++;
        result.capturesCreated += run.capturesCreated;
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

  return result;
}
