import "server-only";

import { createAdminClient } from "@/app/_lib/supabase/admin";
import { getComposioClient } from "@/app/_lib/composio/client";

/**
 * Automatic live verification for quiet connections (Connectors surface).
 *
 * The staleness heuristic (no captures for a week) decides WHEN to spend a
 * live check; this module produces the VERDICT the user actually sees:
 * connected, or not. It reads Composio's account status — STRICTLY
 * read-only. Never call connectedAccounts.refresh() here: despite the name
 * it initiates a NEW auth flow and flips ACTIVE accounts to INITIATED,
 * breaking tool execution until the user completes re-auth (verified
 * 2026-08-03 against @composio/core 0.10.0).
 *
 * Status mapping for a connection that has been quiet for a week+:
 * - ACTIVE → working (Composio's own trigger polling marks accounts
 *   FAILED/EXPIRED on auth errors, so ACTIVE is meaningful for exactly the
 *   trigger-based providers we verify)
 * - FAILED / EXPIRED / REVOKED / INACTIVE → broken
 * - INITIATED / INITIALIZING → broken (an abandoned or pending re-auth
 *   cannot execute tools — proven by direct tool execution)
 *
 * A broken verdict writes composio_status = "expired", which flips
 * getConnectionStatus().connected to false everywhere — rail, detail pane,
 * and the HQ reconnect banner all show the existing "Reconnect needed"
 * state with no extra UI. Verdicts are cached in config.connectionCheck so
 * page loads don't hammer Composio.
 */

export type ConnectionVerdict = "working" | "broken" | "inconclusive";

const CHECK_TTL_MS = 60 * 60 * 1000;
const CHECK_TIMEOUT_MS = 4000;
const BROKEN_STATUSES = new Set([
  "FAILED",
  "EXPIRED",
  "REVOKED",
  "INACTIVE",
  "INITIATED",
  "INITIALIZING",
]);

interface ConnectionCheckCache {
  verdict: ConnectionVerdict;
  checkedAt: string;
}

export interface VerifyConnectionInput {
  integrationId: string;
  connectionId: string;
  /** Current workspace_integrations.config, for cache read + merge-back. */
  config: Record<string, unknown> | null;
  /** Injectable clock for tests. */
  now?: number;
}

export function readConnectionCheckCache(
  config: Record<string, unknown> | null,
  now: number,
): ConnectionVerdict | null {
  const check = config?.connectionCheck as ConnectionCheckCache | undefined;
  if (!check?.verdict || typeof check.checkedAt !== "string") return null;
  const checkedMs = new Date(check.checkedAt).getTime();
  if (Number.isNaN(checkedMs) || now - checkedMs > CHECK_TTL_MS) return null;
  if (
    check.verdict !== "working" &&
    check.verdict !== "broken" &&
    check.verdict !== "inconclusive"
  ) {
    return null;
  }
  return check.verdict;
}

function withTimeout<T>(promise: Promise<T>): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("verification timeout")), CHECK_TIMEOUT_MS),
    ),
  ]);
}

async function persistVerdict(
  input: VerifyConnectionInput,
  verdict: ConnectionVerdict,
  detail?: string,
): Promise<void> {
  const admin = createAdminClient();
  const config = {
    ...(input.config ?? {}),
    connectionCheck: {
      verdict,
      checkedAt: new Date(input.now ?? Date.now()).toISOString(),
    },
  };
  const update: Record<string, unknown> = { config };
  if (verdict === "broken") {
    update.composio_status = "expired";
    update.last_error = detail ?? "Connection verification failed — reconnect required";
  }
  await admin
    .from("workspace_integrations")
    .update(update as never)
    .eq("id", input.integrationId);
}

/**
 * Verify a suspect connection against Composio. Returns the cached verdict
 * when fresh; otherwise checks live and persists the result. Never throws —
 * a page load must not die on a verification hiccup.
 */
export async function verifySuspectConnection(
  input: VerifyConnectionInput,
): Promise<ConnectionVerdict> {
  const now = input.now ?? Date.now();
  const cached = readConnectionCheckCache(input.config, now);
  if (cached) return cached;

  const composio = getComposioClient();

  let status: string;
  try {
    const account = await withTimeout(composio.connectedAccounts.get(input.connectionId));
    status = String((account as { status?: string }).status ?? "UNKNOWN");
  } catch {
    // Can't reach Composio — don't cache, don't alarm; try again next load.
    return "inconclusive";
  }

  if (BROKEN_STATUSES.has(status)) {
    await persistVerdict(
      input,
      "broken",
      `Provider reports connection ${status.toLowerCase()}`,
    );
    return "broken";
  }

  if (status === "ACTIVE") {
    await persistVerdict(input, "working");
    return "working";
  }

  // Unknown status value — don't alarm, don't cache long-term claims.
  await persistVerdict(input, "inconclusive");
  return "inconclusive";
}
