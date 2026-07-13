/**
 * Entity Watch System
 *
 * "When X happens, start watching for Y"
 *
 * Watches enable reactive cross-entity signals. For example:
 * - When a person is created, watch for emails from that person
 * - When work starts, watch for blockers mentioning that work
 * - When an invoice is sent, watch for payment confirmations
 *
 * Watches are checked against incoming captures in the capture
 * intelligence pipeline. When a match is found, a derived signal
 * is emitted for the watched entity.
 */

import { createAdminClient } from "@/app/_lib/supabase/admin";
import { emitEntitySignal } from "./emit-signal";
import type { SignalSurface } from "./types";

export interface EntityWatch {
  id: string;
  workspaceId: string;
  watchedEntityType: SignalSurface;
  watchedEntityId: string;
  watchForSignals: string[];
  filterCriteria: Record<string, unknown>;
  onMatchSignal: string;
  onMatchExtraEvidence?: Record<string, unknown>;
  expiresAt: Date | null;
  createdAt: Date;
  triggeredAt: Date | null;
  triggerCount: number;
}

export interface RegisterWatchInput {
  workspaceId: string;
  watchedEntity: {
    type: SignalSurface;
    id: string;
  };
  watchForSignals: string[];
  filterCriteria: Record<string, unknown>;
  onMatch: {
    signal: string;
    extraEvidence?: Record<string, unknown>;
  };
  expiresInDays?: number;
}

export interface RegisterWatchResult {
  success: boolean;
  watchId?: string;
  error?: string;
  alreadyExists?: boolean;
}

/**
 * Register a watch for an entity.
 *
 * @example
 * ```ts
 * // When a person is created, watch for emails from that person
 * await registerEntityWatch({
 *   workspaceId,
 *   watchedEntity: { type: "person", id: person.id },
 *   watchForSignals: ["capture_email_received"],
 *   filterCriteria: { from_email: person.email },
 *   onMatch: {
 *     signal: "person_email_received",
 *     extraEvidence: { relationship: "first_contact" },
 *   },
 *   expiresInDays: 90,
 * });
 * ```
 */
export async function registerEntityWatch(
  input: RegisterWatchInput
): Promise<RegisterWatchResult> {
  const admin = createAdminClient();

  const expiresAt = input.expiresInDays
    ? new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000)
    : null;

  const { data, error } = await admin
    .from("entity_watches")
    .upsert(
      {
        workspace_id: input.workspaceId,
        watched_entity_type: input.watchedEntity.type,
        watched_entity_id: input.watchedEntity.id,
        watch_for_signals: input.watchForSignals,
        filter_criteria: input.filterCriteria,
        on_match_signal: input.onMatch.signal,
        on_match_extra_evidence: input.onMatch.extraEvidence ?? null,
        expires_at: expiresAt?.toISOString() ?? null,
      },
      {
        onConflict: "workspace_id,watched_entity_type,watched_entity_id,on_match_signal",
        ignoreDuplicates: false,
      }
    )
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { success: true, alreadyExists: true };
    }
    console.error("[watches] Failed to register watch:", error);
    return { success: false, error: error.message };
  }

  return { success: true, watchId: data.id };
}

/**
 * Remove a watch by ID.
 */
export async function removeWatch(watchId: string): Promise<boolean> {
  const admin = createAdminClient();

  const { error } = await admin
    .from("entity_watches")
    .delete()
    .eq("id", watchId);

  if (error) {
    console.error("[watches] Failed to remove watch:", error);
    return false;
  }

  return true;
}

/**
 * Remove all watches for an entity (e.g., when entity is deleted).
 */
export async function removeWatchesForEntity(
  workspaceId: string,
  entityType: SignalSurface,
  entityId: string
): Promise<number> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("entity_watches")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("watched_entity_type", entityType)
    .eq("watched_entity_id", entityId)
    .select("id");

  if (error) {
    console.error("[watches] Failed to remove watches for entity:", error);
    return 0;
  }

  return data?.length ?? 0;
}

/**
 * Get all active watches for a workspace.
 */
export async function getActiveWatches(
  workspaceId: string
): Promise<EntityWatch[]> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("entity_watches")
    .select("*")
    .eq("workspace_id", workspaceId)
    .or("expires_at.is.null,expires_at.gt.now()")
    .lt("trigger_count", 10);

  if (error) {
    console.error("[watches] Failed to get active watches:", error);
    return [];
  }

  return (data ?? []).map(transformWatchRow);
}

/**
 * Check if a capture event matches any active watches and emit signals.
 *
 * Called from the capture intelligence pipeline when new captures arrive.
 */
export async function processCaptureAgainstWatches(input: {
  workspaceId: string;
  captureId: string;
  captureSignals: string[];
  captureData: Record<string, unknown>;
}): Promise<{ matchedWatches: string[]; signalsEmitted: string[] }> {
  const { workspaceId, captureId, captureSignals, captureData } = input;

  const activeWatches = await getActiveWatches(workspaceId);
  const matchedWatches: string[] = [];
  const signalsEmitted: string[] = [];

  for (const watch of activeWatches) {
    const signalMatch = watch.watchForSignals.some((s) =>
      captureSignals.includes(s)
    );
    if (!signalMatch) continue;

    const filterMatch = matchesFilter(captureData, watch.filterCriteria);
    if (!filterMatch) continue;

    matchedWatches.push(watch.id);

    emitEntitySignal({
      workspaceId,
      surface: watch.watchedEntityType,
      entityId: watch.watchedEntityId,
      signal: watch.onMatchSignal,
      evidence: {
        ...(watch.onMatchExtraEvidence ?? {}),
        matched_watch_id: watch.id,
        capture_id: captureId,
        capture_signals: captureSignals,
      },
    });

    signalsEmitted.push(watch.onMatchSignal);

    await incrementWatchTriggerCount(watch.id);
  }

  return { matchedWatches, signalsEmitted };
}

/**
 * Expire old watches. Called by cleanup cron.
 */
export async function expireOldWatches(): Promise<number> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("entity_watches")
    .delete()
    .lt("expires_at", new Date().toISOString())
    .not("expires_at", "is", null)
    .select("id");

  if (error) {
    console.error("[watches] Failed to expire old watches:", error);
    return 0;
  }

  return data?.length ?? 0;
}

/**
 * Expire watches that have triggered too many times.
 */
export async function expireOverTriggeredWatches(): Promise<number> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("entity_watches")
    .delete()
    .gte("trigger_count", 10)
    .select("id");

  if (error) {
    console.error("[watches] Failed to expire over-triggered watches:", error);
    return 0;
  }

  return data?.length ?? 0;
}

async function incrementWatchTriggerCount(watchId: string): Promise<void> {
  const admin = createAdminClient();

  await admin.rpc("increment_watch_trigger_count", { watch_id: watchId });
}

function matchesFilter(
  data: Record<string, unknown>,
  filter: Record<string, unknown>
): boolean {
  for (const [key, expected] of Object.entries(filter)) {
    const actual = data[key];

    if (typeof expected === "object" && expected !== null) {
      if ("$contains" in expected) {
        if (typeof actual !== "string") return false;
        if (!actual.toLowerCase().includes(String(expected.$contains).toLowerCase())) {
          return false;
        }
        continue;
      }
      if ("$startsWith" in expected) {
        if (typeof actual !== "string") return false;
        if (!actual.toLowerCase().startsWith(String(expected.$startsWith).toLowerCase())) {
          return false;
        }
        continue;
      }
      if ("$in" in expected) {
        if (!Array.isArray(expected.$in)) return false;
        if (!expected.$in.includes(actual)) return false;
        continue;
      }
    }

    if (actual !== expected) return false;
  }

  return true;
}

function transformWatchRow(row: Record<string, unknown>): EntityWatch {
  return {
    id: row.id as string,
    workspaceId: row.workspace_id as string,
    watchedEntityType: row.watched_entity_type as SignalSurface,
    watchedEntityId: row.watched_entity_id as string,
    watchForSignals: row.watch_for_signals as string[],
    filterCriteria: (row.filter_criteria as Record<string, unknown>) ?? {},
    onMatchSignal: row.on_match_signal as string,
    onMatchExtraEvidence: row.on_match_extra_evidence as Record<string, unknown> | undefined,
    expiresAt: row.expires_at ? new Date(row.expires_at as string) : null,
    createdAt: new Date(row.created_at as string),
    triggeredAt: row.triggered_at ? new Date(row.triggered_at as string) : null,
    triggerCount: row.trigger_count as number,
  };
}
