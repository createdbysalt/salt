import "server-only";

import { createAdminClient } from "@/app/_lib/supabase/admin";
import { getComposioClient } from "./client";
import { adapterForToolkit } from "@/app/_features/capture/adapters/registry";

/**
 * Trigger Reconciliation (connector-platform Phase 3.7)
 *
 * Verifies Composio triggers still exist and re-creates stale ones.
 * Run daily via cron to prevent trigger drift.
 *
 * Flow:
 * 1. Scan all connections with capture_enabled=true
 * 2. For each captureTriggerIds entry, verify it exists in Composio
 * 3. If missing, re-create the trigger
 * 4. Update workspace_integrations.config with new trigger IDs
 * 5. Log failures for alerting
 */

interface TriggerStatus {
  triggerId: string;
  exists: boolean;
  status?: string;
  error?: string;
}

interface ReconciliationResult {
  connectionsSeen: number;
  triggersVerified: number;
  triggersStale: number;
  triggersRepaired: number;
  failures: Array<{
    workspaceId: string;
    provider: string;
    triggerId: string;
    error: string;
  }>;
}

async function verifyTrigger(triggerId: string): Promise<TriggerStatus> {
  const composio = getComposioClient();

  try {
    // listActive returns all active triggers; we filter by ID
    const triggers = await composio.triggers.listActive({
      triggerIds: [triggerId],
    });

    const found = (triggers.items ?? []).find(
      (t: { id?: string }) => t.id === triggerId,
    );

    if (found) {
      return {
        triggerId,
        exists: true,
        status: (found as { status?: string }).status || "active",
      };
    }

    return {
      triggerId,
      exists: false,
      error: "Trigger not found in active triggers list",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      triggerId,
      exists: false,
      error: message,
    };
  }
}

async function recreateTriggers(
  workspaceId: string,
  provider: string,
  connectionId: string,
): Promise<{ ok: boolean; triggerIds: string[]; error?: string }> {
  const adapter = adapterForToolkit(provider);
  if (!adapter) {
    return { ok: true, triggerIds: [] };
  }

  const composio = getComposioClient();
  const triggers = composio.triggers as unknown as {
    create(
      userId: string,
      slug: string,
      options: { connectedAccountId?: string; triggerConfig?: Record<string, unknown> },
    ): Promise<{ triggerId: string }>;
  };

  const created: string[] = [];

  for (const slug of adapter.triggerSlugs) {
    try {
      let result: { triggerId: string };
      try {
        result = await triggers.create(workspaceId, slug, {
          connectedAccountId: connectionId,
          triggerConfig: { interval: 1 },
        });
      } catch {
        result = await triggers.create(workspaceId, slug, {
          connectedAccountId: connectionId,
        });
      }
      created.push(result.triggerId);
    } catch (error) {
      return {
        ok: false,
        triggerIds: created,
        error: error instanceof Error ? error.message : "Creation failed",
      };
    }
  }

  return { ok: true, triggerIds: created };
}

export async function runTriggerReconciliation(): Promise<ReconciliationResult> {
  const admin = createAdminClient();
  const result: ReconciliationResult = {
    connectionsSeen: 0,
    triggersVerified: 0,
    triggersStale: 0,
    triggersRepaired: 0,
    failures: [],
  };

  const { data: connections } = await admin
    .from("workspace_integrations")
    .select("id, workspace_id, provider, composio_connection_id, config")
    .eq("is_active", true)
    .eq("capture_enabled", true);

  if (!connections || connections.length === 0) {
    return result;
  }

  result.connectionsSeen = connections.length;

  for (const conn of connections) {
    const config = conn.config as Record<string, unknown> | null;
    const triggerIds = Array.isArray(config?.captureTriggerIds)
      ? (config.captureTriggerIds as unknown[]).filter(
          (id): id is string => typeof id === "string",
        )
      : [];

    if (triggerIds.length === 0) {
      // No triggers registered — this connection needs triggers created
      if (conn.composio_connection_id) {
        const recreated = await recreateTriggers(
          conn.workspace_id,
          conn.provider,
          conn.composio_connection_id,
        );

        if (recreated.ok && recreated.triggerIds.length > 0) {
          await admin
            .from("workspace_integrations")
            .update({
              config: {
                ...config,
                captureTriggerIds: recreated.triggerIds,
              } as never,
            })
            .eq("id", conn.id);

          result.triggersRepaired += recreated.triggerIds.length;
        } else if (!recreated.ok) {
          result.failures.push({
            workspaceId: conn.workspace_id,
            provider: conn.provider,
            triggerId: "none",
            error: recreated.error || "Failed to create triggers",
          });
        }
      }
      continue;
    }

    // Verify each trigger
    const staleIds: string[] = [];
    for (const triggerId of triggerIds) {
      result.triggersVerified++;
      const status = await verifyTrigger(triggerId);

      if (!status.exists) {
        result.triggersStale++;
        staleIds.push(triggerId);
      }
    }

    // If any triggers are stale, recreate all of them
    if (staleIds.length > 0 && conn.composio_connection_id) {
      const recreated = await recreateTriggers(
        conn.workspace_id,
        conn.provider,
        conn.composio_connection_id,
      );

      if (recreated.ok && recreated.triggerIds.length > 0) {
        await admin
          .from("workspace_integrations")
          .update({
            config: {
              ...config,
              captureTriggerIds: recreated.triggerIds,
            } as never,
          })
          .eq("id", conn.id);

        result.triggersRepaired += recreated.triggerIds.length;
      } else {
        for (const triggerId of staleIds) {
          result.failures.push({
            workspaceId: conn.workspace_id,
            provider: conn.provider,
            triggerId,
            error: recreated.error || "Failed to recreate",
          });
        }
      }
    }
  }

  return result;
}

/**
 * Check trigger health for a single connection.
 * Useful for debugging or on-demand verification.
 */
export async function checkConnectionTriggers(
  workspaceId: string,
  provider: string,
): Promise<{
  ok: boolean;
  triggers: TriggerStatus[];
  needsRepair: boolean;
}> {
  const admin = createAdminClient();

  const { data: conn } = await admin
    .from("workspace_integrations")
    .select("config")
    .eq("workspace_id", workspaceId)
    .eq("provider", provider)
    .maybeSingle();

  if (!conn) {
    return { ok: false, triggers: [], needsRepair: false };
  }

  const config = conn.config as Record<string, unknown> | null;
  const triggerIds = Array.isArray(config?.captureTriggerIds)
    ? (config.captureTriggerIds as unknown[]).filter(
        (id): id is string => typeof id === "string",
      )
    : [];

  const triggers: TriggerStatus[] = [];
  for (const triggerId of triggerIds) {
    triggers.push(await verifyTrigger(triggerId));
  }

  const needsRepair = triggers.some((t) => !t.exists);

  return { ok: true, triggers, needsRepair };
}
