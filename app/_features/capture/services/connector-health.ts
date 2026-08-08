import "server-only";

/**
 * Connector Health Check (Captures V2 Phase 4; truthful-status rework,
 * Sources plan 2.1).
 *
 * Diagnoses why connectors aren't producing captures:
 * 1. Connection status (is_active, capture_enabled)
 * 2. Trigger subscription status (captureTriggerIds in config)
 * 3. Recent capture production (context, never a verdict)
 *
 * Two truth rules (from the 2026-08-07 interview, non-negotiable):
 *
 * - **Expectations come from the DB, not code.** The provider list is the
 *   workspace's actual integrations; expected triggers come from
 *   `connector_trigger_types.enabled_for_capture` (getCaptureTriggerSpecs).
 *   Connector #16 is a DB row, not a code change.
 * - **Never infer "broken" from silence.** A quiet connector and a dead one
 *   look identical from outside. "Unhealthy" requires a POSITIVE signal:
 *   an inactive/expired connection or trigger subscriptions confirmed
 *   missing. A valid connection with registered triggers and zero captures
 *   is healthy-and-quiet — crying wolf kills trust as fast as lying.
 */

import { createAdminClient } from "@/app/_lib/supabase/admin";
import { getConnectionStatus } from "@/app/_lib/composio/connections";
import { getCaptureTriggerSpecs } from "@/app/_lib/composio/trigger-subscriptions";
import { adapterForToolkit } from "../adapters/registry";

export interface ConnectorHealthStatus {
  provider: string;
  hasAdapter: boolean;
  connectionStatus: {
    connected: boolean;
    isActive: boolean;
    captureEnabled: boolean;
    composioConnectionId: string | null;
  };
  triggerStatus: {
    triggerSlugs: readonly string[];
    registeredTriggerIds: string[];
    triggersExpected: number;
    triggersRegistered: number;
    healthy: boolean;
  };
  captureStats: {
    last24h: number;
    last7d: number;
    lastCaptureAt: string | null;
  };
  diagnosis: string[];
}

export interface WorkspaceHealthReport {
  workspaceId: string;
  checkedAt: string;
  connectors: ConnectorHealthStatus[];
  summary: {
    total: number;
    healthy: number;
    unhealthy: number;
    captureDisabled: number;
    notConnected: number;
  };
}

export async function checkConnectorHealth(
  workspaceId: string,
  provider: string
): Promise<ConnectorHealthStatus> {
  const diagnosis: string[] = [];
  const adapter = await adapterForToolkit(provider);

  if (!adapter) {
    return {
      provider,
      hasAdapter: false,
      connectionStatus: {
        connected: false,
        isActive: false,
        captureEnabled: false,
        composioConnectionId: null,
      },
      triggerStatus: {
        triggerSlugs: [],
        registeredTriggerIds: [],
        triggersExpected: 0,
        triggersRegistered: 0,
        healthy: false,
      },
      captureStats: { last24h: 0, last7d: 0, lastCaptureAt: null },
      diagnosis: ["No capture adapter defined for this provider"],
    };
  }

  const connection = await getConnectionStatus(provider, workspaceId);
  const admin = createAdminClient();

  const { data: integration } = await admin
    .from("workspace_integrations")
    .select("id, is_active, capture_enabled, config")
    .eq("workspace_id", workspaceId)
    .eq("provider", provider)
    .maybeSingle();

  const connectionStatus = {
    connected: connection.connected,
    isActive: integration?.is_active ?? false,
    captureEnabled: integration?.capture_enabled ?? false,
    composioConnectionId: connection.composioConnectionId ?? null,
  };

  if (!connection.connected) {
    diagnosis.push("Not connected - user needs to connect this account");
  } else if (!integration?.is_active) {
    diagnosis.push("Connection inactive - may need reconnection");
  } else if (!integration?.capture_enabled) {
    diagnosis.push("Capture disabled - user needs to enable capture toggle");
  }

  const config = integration?.config as Record<string, unknown> | null;
  const registeredTriggerIds = Array.isArray(config?.captureTriggerIds)
    ? (config.captureTriggerIds as string[])
    : [];

  // Expectations from the DB (connector_trigger_types.enabled_for_capture),
  // never from a code list — the seam rule: new connectors are DB rows.
  const expectedSlugs = (await getCaptureTriggerSpecs(provider)).map(
    (spec) => spec.slug,
  );

  const triggerStatus = {
    triggerSlugs: expectedSlugs,
    registeredTriggerIds,
    triggersExpected: expectedSlugs.length,
    triggersRegistered: registeredTriggerIds.length,
    healthy:
      expectedSlugs.length === 0 ||
      registeredTriggerIds.length === expectedSlugs.length,
  };

  if (expectedSlugs.length > 0 && registeredTriggerIds.length === 0) {
    diagnosis.push(
      `No trigger subscriptions registered (expected ${expectedSlugs.length})`
    );
    diagnosis.push(`Expected triggers: ${expectedSlugs.join(", ")}`);
  } else if (registeredTriggerIds.length < expectedSlugs.length) {
    diagnosis.push(
      `Missing triggers: ${registeredTriggerIds.length}/${expectedSlugs.length} registered`
    );
  }

  if (expectedSlugs.length === 0) {
    diagnosis.push("No triggers defined - this connector relies on backfill/reconciliation only");
  }

  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const { count: last24h } = await admin
    .from("capture_events")
    .select("*", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("source_type", adapter.sourceType)
    .gte("created_at", oneDayAgo.toISOString());

  const { count: last7d } = await admin
    .from("capture_events")
    .select("*", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("source_type", adapter.sourceType)
    .gte("created_at", sevenDaysAgo.toISOString());

  const { data: lastCapture } = await admin
    .from("capture_events")
    .select("created_at")
    .eq("workspace_id", workspaceId)
    .eq("source_type", adapter.sourceType)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const captureStats = {
    last24h: last24h ?? 0,
    last7d: last7d ?? 0,
    lastCaptureAt: lastCapture?.created_at ?? null,
  };

  // Positive-signal rule: silence is context, never a verdict. A quiet week
  // with valid auth and registered triggers is "healthy and quiet", not an
  // alarm — the alarm arms above (connection, triggers) carry the verdicts.
  if (
    connectionStatus.captureEnabled &&
    captureStats.last7d === 0 &&
    triggerStatus.healthy &&
    connection.connected
  ) {
    diagnosis.push(
      "No captures in the last 7 days — connection and triggers verified, quiet is not broken"
    );
  }

  if (diagnosis.length === 0 && connectionStatus.captureEnabled && captureStats.last24h > 0) {
    diagnosis.push("Healthy - captures flowing");
  }

  return {
    provider,
    hasAdapter: true,
    connectionStatus,
    triggerStatus,
    captureStats,
    diagnosis,
  };
}

/**
 * Positive-signal classification (pure, unit-tested). "Unhealthy" requires
 * confirmed evidence — a trigger-registration shortfall on a connected,
 * capture-enabled connector. Capture volume never appears here: a quiet
 * connector with valid auth and registered triggers is HEALTHY.
 */
export function summarizeConnectors(
  connectors: ConnectorHealthStatus[],
): WorkspaceHealthReport["summary"] {
  return {
    total: connectors.length,
    healthy: connectors.filter(
      (c) =>
        c.connectionStatus.connected &&
        c.connectionStatus.captureEnabled &&
        c.triggerStatus.healthy,
    ).length,
    unhealthy: connectors.filter(
      (c) =>
        c.connectionStatus.connected &&
        c.connectionStatus.captureEnabled &&
        !c.triggerStatus.healthy,
    ).length,
    captureDisabled: connectors.filter(
      (c) => c.connectionStatus.connected && !c.connectionStatus.captureEnabled
    ).length,
    notConnected: connectors.filter((c) => !c.connectionStatus.connected).length,
  };
}

export async function checkWorkspaceConnectorHealth(
  workspaceId: string
): Promise<WorkspaceHealthReport> {
  // The workspace's actual connections, from the DB — not a code list of
  // providers. A workspace that connected #16 sees #16 here with zero code.
  const admin = createAdminClient();
  const { data: integrations, error } = await admin
    .from("workspace_integrations")
    .select("provider")
    .eq("workspace_id", workspaceId)
    .eq("is_active", true)
    .not("composio_connection_id", "is", null);
  if (error) {
    throw new Error(`failed to load workspace integrations: ${error.message}`);
  }

  const providers = [...new Set((integrations ?? []).map((i) => i.provider))];
  const connectors: ConnectorHealthStatus[] = [];
  for (const provider of providers) {
    const status = await checkConnectorHealth(workspaceId, provider);
    connectors.push(status);
  }

  return {
    workspaceId,
    checkedAt: new Date().toISOString(),
    connectors,
    summary: summarizeConnectors(connectors),
  };
}

/**
 * Quick health check for display in UI.
 */
export async function getQuickConnectorHealth(
  workspaceId: string,
  provider: string
): Promise<{ status: "healthy" | "unhealthy" | "disabled" | "not_connected"; message: string }> {
  const health = await checkConnectorHealth(workspaceId, provider);

  if (!health.connectionStatus.connected) {
    return { status: "not_connected", message: "Not connected" };
  }
  if (!health.connectionStatus.captureEnabled) {
    return { status: "disabled", message: "Capture disabled" };
  }
  // Positive-signal rule: healthy is decided by auth + triggers, never by
  // volume. Quiet with everything verified reads as quiet, not broken.
  if (health.triggerStatus.healthy) {
    return {
      status: "healthy",
      message:
        health.captureStats.last24h > 0
          ? `${health.captureStats.last24h} captures today`
          : "Connected — quiet",
    };
  }
  return {
    status: "unhealthy",
    message: health.diagnosis[0] ?? "Check configuration",
  };
}
