import "server-only";

import { createAdminClient } from "@/app/_lib/supabase/admin";
import { getComposioClient } from "./client";
import {
  createCaptureTriggerInstance,
  getCaptureTriggerSpecs,
} from "./trigger-subscriptions";

/**
 * Trigger Reconciliation (capture-pipeline repair, Phase 2)
 *
 * Idempotent, self-healing pass over the whole Composio project. Run daily
 * via cron (and manually after incidents). Each pass:
 *
 * 1. Lists ALL live trigger instances in the Composio project (paginated)
 * 2. Deletes orphaned instances whose connected account no longer matches
 *    any workspace_integrations row (reconnects leave old-connection
 *    triggers firing into the void)
 * 3. For every active + capture_enabled integration, compares live
 *    instances against the enabled slugs in connector_trigger_types and
 *    creates any missing subscriptions
 * 4. Persists the refreshed set of live trigger IDs back to
 *    workspace_integrations.config.captureTriggerIds (drops dead IDs)
 *
 * Per-slug create failures are recorded and skipped — a bad slug (e.g. one
 * that 404s in Composio) must never block repair of the rest.
 */

interface TriggerInstance {
  id: string;
  connectedAccountId: string;
  triggerName: string;
}

interface TriggersApi {
  listActive(query?: {
    limit?: number;
    cursor?: string;
    triggerIds?: string[];
  }): Promise<{
    items?: Array<{
      id?: string;
      connectedAccountId?: string;
      triggerName?: string;
      status?: string;
    }>;
    nextCursor?: string | null;
  }>;
  create(
    userId: string,
    slug: string,
    options: {
      connectedAccountId?: string;
      triggerConfig?: Record<string, unknown>;
    },
  ): Promise<{ triggerId: string }>;
  delete(triggerId: string): Promise<unknown>;
}

function triggersApi(): TriggersApi {
  return getComposioClient().triggers as unknown as TriggersApi;
}

interface TriggerStatus {
  triggerId: string;
  exists: boolean;
  status?: string;
  error?: string;
}

interface ReconciliationResult {
  connectionsSeen: number;
  instancesSeen: number;
  triggersCreated: number;
  orphansDeleted: number;
  configsUpdated: number;
  created: Array<{ workspaceId: string; provider: string; slug: string }>;
  failures: Array<{
    workspaceId: string;
    provider: string;
    detail: string;
    error: string;
  }>;
}

const PAGE_LIMIT = 100;
const MAX_PAGES = 50;

async function listAllTriggerInstances(): Promise<TriggerInstance[]> {
  const triggers = triggersApi();
  const instances: TriggerInstance[] = [];
  let cursor: string | undefined;

  for (let page = 0; page < MAX_PAGES; page++) {
    const response = await triggers.listActive({
      limit: PAGE_LIMIT,
      ...(cursor ? { cursor } : {}),
    });

    for (const item of response.items ?? []) {
      if (item.id && item.connectedAccountId && item.triggerName) {
        instances.push({
          id: item.id,
          connectedAccountId: item.connectedAccountId,
          triggerName: item.triggerName,
        });
      }
    }

    cursor = response.nextCursor ?? undefined;
    if (!cursor) break;
  }

  return instances;
}

function sameIdSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((id, i) => id === sortedB[i]);
}

export async function runTriggerReconciliation(): Promise<ReconciliationResult> {
  const admin = createAdminClient();
  const triggers = triggersApi();
  const result: ReconciliationResult = {
    connectionsSeen: 0,
    instancesSeen: 0,
    triggersCreated: 0,
    orphansDeleted: 0,
    configsUpdated: 0,
    created: [],
    failures: [],
  };

  const instances = await listAllTriggerInstances();
  result.instancesSeen = instances.length;

  const { data: rows, error: rowsError } = await admin
    .from("workspace_integrations")
    .select(
      "id, workspace_id, provider, composio_connection_id, config, is_active, capture_enabled",
    );

  if (rowsError) {
    throw new Error(`Failed to list integrations: ${rowsError.message}`);
  }

  const integrations = rows ?? [];

  // Any integration row (regardless of active/capture state) claims its
  // connected account. Only instances pointing at accounts NO row references
  // are orphans — reconnect upserts a fresh connection ID, stranding the old.
  const knownConnectionIds = new Set(
    integrations
      .map((row) => row.composio_connection_id)
      .filter((id): id is string => typeof id === "string" && id.length > 0),
  );

  const liveByConnection = new Map<string, TriggerInstance[]>();

  for (const instance of instances) {
    if (!knownConnectionIds.has(instance.connectedAccountId)) {
      try {
        await triggers.delete(instance.id);
        result.orphansDeleted++;
      } catch (error) {
        result.failures.push({
          workspaceId: "unknown",
          provider: instance.triggerName,
          detail: `delete orphan ${instance.id} (account ${instance.connectedAccountId})`,
          error: error instanceof Error ? error.message : "Delete failed",
        });
      }
      continue;
    }

    const existing = liveByConnection.get(instance.connectedAccountId) ?? [];
    existing.push(instance);
    liveByConnection.set(instance.connectedAccountId, existing);
  }

  for (const row of integrations) {
    if (!row.is_active || !row.capture_enabled || !row.composio_connection_id) {
      continue;
    }

    result.connectionsSeen++;

    const enabledSpecs = await getCaptureTriggerSpecs(row.provider);
    const live = liveByConnection.get(row.composio_connection_id) ?? [];
    const liveSlugs = new Set(live.map((i) => i.triggerName.toUpperCase()));

    const createdIds: string[] = [];
    for (const spec of enabledSpecs) {
      if (liveSlugs.has(spec.slug.toUpperCase())) continue;

      try {
        const { triggerId } = await createCaptureTriggerInstance(
          row.workspace_id,
          spec,
          row.composio_connection_id,
        );
        createdIds.push(triggerId);
        result.triggersCreated++;
        result.created.push({
          workspaceId: row.workspace_id,
          provider: row.provider,
          slug: spec.slug,
        });
      } catch (error) {
        result.failures.push({
          workspaceId: row.workspace_id,
          provider: row.provider,
          detail: `create ${spec.slug}`,
          error: error instanceof Error ? error.message : "Creation failed",
        });
      }
    }

    // Refresh config.captureTriggerIds to exactly the live + newly created
    // instances — dead IDs drop out, out-of-band creations get adopted.
    const nextTriggerIds = [...live.map((i) => i.id), ...createdIds];
    const config = (row.config ?? {}) as Record<string, unknown>;
    const currentTriggerIds = Array.isArray(config.captureTriggerIds)
      ? (config.captureTriggerIds as unknown[]).filter(
          (id): id is string => typeof id === "string",
        )
      : [];

    if (!sameIdSet(currentTriggerIds, nextTriggerIds)) {
      const { error: updateError } = await admin
        .from("workspace_integrations")
        .update({
          config: { ...config, captureTriggerIds: nextTriggerIds } as never,
        })
        .eq("id", row.id);

      if (updateError) {
        result.failures.push({
          workspaceId: row.workspace_id,
          provider: row.provider,
          detail: "persist captureTriggerIds",
          error: updateError.message,
        });
      } else {
        result.configsUpdated++;
      }
    }
  }

  return result;
}

async function verifyTrigger(triggerId: string): Promise<TriggerStatus> {
  try {
    const response = await triggersApi().listActive({
      triggerIds: [triggerId],
    });

    const found = (response.items ?? []).find((t) => t.id === triggerId);

    if (found) {
      return {
        triggerId,
        exists: true,
        status: found.status || "active",
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
