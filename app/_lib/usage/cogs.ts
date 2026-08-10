import "server-only";

import { createAdminClient } from "@/app/_lib/supabase/admin";

/**
 * Month-to-date vendor COGS for a workspace, in micro-USD.
 *
 * This is the input to `canSpend()`, which means it sits in front of every
 * paid vendor call in the product. It has to be both accurate enough to gate
 * on and cheap enough that nobody is tempted to skip it.
 *
 * ## Why there is a cache, and why in-memory is defensible here
 *
 * `app/_lib/usage/ask-salt-usage.ts` argues at length that in-memory state is
 * useless for a spend *ceiling*: one bucket per warm serverless instance means
 * the real allowance is the limit times the number of instances, and a cold
 * start hands out a fresh one. That reasoning is right, and it does not apply
 * to a read cache.
 *
 * The difference is what the memory holds. A counter in memory *is* the limit,
 * so duplicating it multiplies the allowance. A cache holds a copy of a number
 * the database owns; duplicating it does not change the number, it only means
 * a given instance may be reading one up to `CACHE_TTL_MS` old. The failure
 * mode is bounded staleness on every instance, not an unbounded allowance.
 *
 * ## Why the cache tracks local spend on top of the snapshot
 *
 * A plain TTL cache would be worst exactly where the gate matters most. One
 * Ask Salt turn is up to twelve model steps; a workspace could run several
 * turns inside a 60-second window and every `canSpend` call would read the
 * same pre-turn figure. So the snapshot is a floor, not the answer:
 * `noteLocalSpend` adds spend this instance has recorded since the fetch, and
 * the effective figure is the sum. Within one instance the gate then tightens
 * in real time; across instances it converges on the next refetch, which reads
 * a database that already contains everyone's writes.
 *
 * This only ever *over*-counts relative to the database, and only briefly (if
 * a refetch lands before a sibling instance's write commits). Over-counting
 * errs toward degrading a workspace slightly early, which is the safe
 * direction for a cost control.
 */

/**
 * How stale a spend decision may be. Sixty seconds bounds the unthrottled
 * window after a workspace crosses a threshold on an instance that has not
 * refetched; local-delta accounting covers the same instance's own spend
 * inside that window, so the real exposure is other instances' concurrent
 * spend, not this one's.
 */
const CACHE_TTL_MS = 60_000;

/**
 * Ceiling on tracked workspaces per instance. A serverless instance serves a
 * bounded number of tenants before recycling, so this is a safety net against
 * unbounded growth rather than a tuned working set. Eviction is insertion-order
 * FIFO: entries are cheap to rebuild and a wrong eviction costs one query.
 */
const MAX_CACHE_ENTRIES = 5_000;

interface CogsSnapshot {
  /** Ledger sum as of `fetchedAt`. */
  baseMicros: number;
  /** Spend recorded by this instance since `fetchedAt`. */
  localMicros: number;
  fetchedAt: number;
  /** Snapshots are period-scoped; a rollover invalidates rather than drifts. */
  periodStart: string;
}

const cache = new Map<string, CogsSnapshot>();

function evictIfFull(): void {
  if (cache.size < MAX_CACHE_ENTRIES) return;
  const oldest = cache.keys().next();
  if (!oldest.done) cache.delete(oldest.value);
}

/**
 * Fetch the ledger sum for a period.
 *
 * Returns null rather than 0 on failure. Zero is a real, meaningful value —
 * "this workspace has cost nothing" — and conflating it with "we could not
 * find out" would make a database outage look like a pristine account and
 * hand every workspace a full budget.
 */
async function fetchCogsMicros(
  workspaceId: string,
  periodStart: string,
  periodEnd: string | null
): Promise<number | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase.rpc("workspace_cogs_micros", {
    p_workspace_id: workspaceId,
    p_since: periodStart,
    // The SQL parameter defaults to NULL; omitting it and passing null agree.
    p_until: periodEnd ?? undefined,
  });

  if (error) {
    console.error(
      "[usage] COGS aggregate failed for workspace",
      workspaceId,
      ":",
      error.message,
    );
    return null;
  }

  const value = typeof data === "string" ? Number(data) : data;
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export interface WorkspaceCogs {
  micros: number;
  /** False when the ledger could not be read and the caller must fail open. */
  known: boolean;
}

/**
 * Month-to-date COGS for a workspace, cached with local-delta accounting.
 *
 * `known: false` means the figure is unavailable, not zero. Callers must treat
 * that as "no basis for a decision" and allow, never as "nothing spent".
 */
export async function getWorkspaceCogs(
  workspaceId: string,
  periodStart: string,
  periodEnd: string | null = null,
  now: number = Date.now()
): Promise<WorkspaceCogs> {
  const cached = cache.get(workspaceId);

  if (cached && cached.periodStart === periodStart && now - cached.fetchedAt < CACHE_TTL_MS) {
    return { micros: cached.baseMicros + cached.localMicros, known: true };
  }

  const baseMicros = await fetchCogsMicros(workspaceId, periodStart, periodEnd);

  if (baseMicros === null) {
    // Keep serving a stale snapshot over failing open, if one exists. An
    // out-of-date ceiling still bounds spend; no ceiling does not.
    if (cached && cached.periodStart === periodStart) {
      return { micros: cached.baseMicros + cached.localMicros, known: true };
    }
    return { micros: 0, known: false };
  }

  cache.delete(workspaceId);
  evictIfFull();
  cache.set(workspaceId, {
    baseMicros,
    localMicros: 0,
    fetchedAt: now,
    periodStart,
  });

  return { micros: baseMicros, known: true };
}

/**
 * Add spend this instance just recorded to the live snapshot.
 *
 * Called from the ledger write path so a decision made moments later reflects
 * it. A no-op when nothing is cached: the next read fetches from the database,
 * which already contains the write.
 */
export function noteLocalSpend(workspaceId: string, micros: number): void {
  if (!Number.isFinite(micros) || micros <= 0) return;

  const cached = cache.get(workspaceId);
  if (!cached) return;

  cached.localMicros += micros;
}

/** Test seam. Snapshots are process-local, so suites would otherwise bleed. */
export function resetCogsCache(): void {
  cache.clear();
}
