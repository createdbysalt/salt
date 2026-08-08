import "server-only";

import type { checkConnectionHealth } from "./connections";

export type ConnectionHealthVerdict = Awaited<
  ReturnType<typeof checkConnectionHealth>
>;

/**
 * Sources plan 3.6: Ask Salt ran a live `connectedAccounts.get` per connected
 * toolkit per chat message. Health verdicts change on the order of minutes
 * (token expiry, disconnect), not milliseconds, so cache them in-process for
 * 10 minutes. Invalidated eagerly on connect/disconnect callbacks so a user
 * who just reconnected never sees a stale "reconnect needed".
 */

const HEALTH_CACHE_TTL_MS = 10 * 60 * 1000;
const MAX_ENTRIES = 500;

interface CacheEntry {
  verdict: ConnectionHealthVerdict;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

function key(workspaceId: string, provider: string): string {
  return `${workspaceId}:${provider}`;
}

function evictExpired(now: number): void {
  if (cache.size < MAX_ENTRIES) return;
  for (const [k, entry] of cache) {
    if (entry.expiresAt <= now) cache.delete(k);
  }
}

export function getCachedConnectionHealth(
  workspaceId: string,
  provider: string,
): ConnectionHealthVerdict | null {
  const entry = cache.get(key(workspaceId, provider));
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    cache.delete(key(workspaceId, provider));
    return null;
  }
  return entry.verdict;
}

export function setCachedConnectionHealth(
  workspaceId: string,
  provider: string,
  verdict: ConnectionHealthVerdict,
): void {
  const now = Date.now();
  evictExpired(now);
  cache.set(key(workspaceId, provider), {
    verdict,
    expiresAt: now + HEALTH_CACHE_TTL_MS,
  });
}

export function invalidateConnectionHealth(
  workspaceId: string,
  provider?: string,
): void {
  if (provider) {
    cache.delete(key(workspaceId, provider));
    return;
  }
  const prefix = `${workspaceId}:`;
  for (const k of cache.keys()) {
    if (k.startsWith(prefix)) cache.delete(k);
  }
}
