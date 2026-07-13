import "server-only";

/**
 * Connector Health Check (Captures V2 Phase 4).
 *
 * Diagnoses why connectors aren't producing captures:
 * 1. Connection status (is_active, capture_enabled)
 * 2. Trigger subscription status (captureTriggerIds in config)
 * 3. Recent capture production (captures in last 24h)
 * 4. Backfill capability test (dry-run fetch)
 */

import { createAdminClient } from "@/app/_lib/supabase/admin";
import { getConnectionStatus } from "@/app/_lib/composio/connections";
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

const CAPTURE_PROVIDERS = ["gmail", "googlecalendar", "googledrive", "stripe", "cal"] as const;

export async function checkConnectorHealth(
  workspaceId: string,
  provider: string
): Promise<ConnectorHealthStatus> {
  const diagnosis: string[] = [];
  const adapter = adapterForToolkit(provider);

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

  const triggerStatus = {
    triggerSlugs: adapter.triggerSlugs,
    registeredTriggerIds,
    triggersExpected: adapter.triggerSlugs.length,
    triggersRegistered: registeredTriggerIds.length,
    healthy:
      adapter.triggerSlugs.length === 0 ||
      registeredTriggerIds.length === adapter.triggerSlugs.length,
  };

  if (adapter.triggerSlugs.length > 0 && registeredTriggerIds.length === 0) {
    diagnosis.push(
      `No trigger subscriptions registered (expected ${adapter.triggerSlugs.length})`
    );
    diagnosis.push(`Expected triggers: ${adapter.triggerSlugs.join(", ")}`);
  } else if (registeredTriggerIds.length < adapter.triggerSlugs.length) {
    diagnosis.push(
      `Missing triggers: ${registeredTriggerIds.length}/${adapter.triggerSlugs.length} registered`
    );
  }

  if (adapter.triggerSlugs.length === 0) {
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

  if (connectionStatus.captureEnabled && captureStats.last7d === 0) {
    diagnosis.push("Capture enabled but no captures in last 7 days - check triggers or backfill");
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

export async function checkWorkspaceConnectorHealth(
  workspaceId: string
): Promise<WorkspaceHealthReport> {
  const connectors: ConnectorHealthStatus[] = [];

  for (const provider of CAPTURE_PROVIDERS) {
    const status = await checkConnectorHealth(workspaceId, provider);
    connectors.push(status);
  }

  const summary = {
    total: connectors.length,
    healthy: connectors.filter((c) => {
      if (!c.connectionStatus.captureEnabled) return false;
      if (!c.triggerStatus.healthy) return false;
      // Backfill-only connectors (no triggers) are healthy if enabled
      if (c.triggerStatus.triggersExpected === 0) return true;
      // Real-time connectors need captures
      return c.captureStats.last7d > 0;
    }).length,
    unhealthy: connectors.filter((c) => {
      if (!c.connectionStatus.connected) return false;
      if (!c.connectionStatus.captureEnabled) return false;
      // Backfill-only connectors are never "unhealthy"
      if (c.triggerStatus.triggersExpected === 0) return false;
      // Real-time connectors are unhealthy if no captures or bad triggers
      return c.captureStats.last7d === 0 || !c.triggerStatus.healthy;
    }).length,
    captureDisabled: connectors.filter(
      (c) => c.connectionStatus.connected && !c.connectionStatus.captureEnabled
    ).length,
    notConnected: connectors.filter((c) => !c.connectionStatus.connected).length,
  };

  return {
    workspaceId,
    checkedAt: new Date().toISOString(),
    connectors,
    summary,
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
  if (health.captureStats.last7d > 0 && health.triggerStatus.healthy) {
    return {
      status: "healthy",
      message: `${health.captureStats.last24h} captures today`,
    };
  }
  return {
    status: "unhealthy",
    message: health.diagnosis[0] ?? "Check configuration",
  };
}
