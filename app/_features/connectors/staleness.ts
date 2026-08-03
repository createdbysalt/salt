/**
 * Connected-but-quiet detection for the Connectors surface.
 *
 * `composio_status = "expired"` only flips when Composio delivers an expiry
 * webhook. A silently dead token (Google's 7-day testing-mode expiry is the
 * canonical case) keeps reading "connected" while captures stop. Staleness
 * fills that gap: capture is on, real-time triggers exist, and nothing has
 * arrived for STALE_AFTER_DAYS.
 */

export const STALE_AFTER_DAYS = 7;

const STALE_AFTER_MS = STALE_AFTER_DAYS * 24 * 60 * 60 * 1000;

export interface StalenessInput {
  /** The connection is active per workspace_integrations. */
  connected: boolean;
  /** User opted this connection into capture. */
  captureEnabled: boolean;
  /** Adapter registers real-time triggers — flow is expected, silence is signal. */
  hasRealtimeTriggers: boolean;
  /** Most recent capture_events row for this source (ISO), null = none ever. */
  lastCaptureAt: string | null;
  /** When the integration row was created (ISO); bounds the never-captured case. */
  connectedAt: string | null;
  /** Injectable clock for tests. */
  now?: number;
}

export function isConnectionStale(input: StalenessInput): boolean {
  if (!input.connected || !input.captureEnabled || !input.hasRealtimeTriggers) {
    return false;
  }
  const now = input.now ?? Date.now();
  const reference = input.lastCaptureAt ?? input.connectedAt;
  if (!reference) {
    // No capture and no connection timestamp — not enough evidence to flag.
    return false;
  }
  const referenceMs = new Date(reference).getTime();
  if (Number.isNaN(referenceMs)) {
    return false;
  }
  return now - referenceMs > STALE_AFTER_MS;
}

/** Whole days since the given ISO timestamp, floored; null when absent. */
export function daysSince(iso: string | null | undefined, now?: number): number | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime();
  if (Number.isNaN(ms)) return null;
  return Math.max(0, Math.floor(((now ?? Date.now()) - ms) / (24 * 60 * 60 * 1000)));
}
