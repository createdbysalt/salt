import "server-only";

import { logToolExecution } from "./execution-log";
import type { AskSaltCapabilities } from "./ask-salt-capabilities";

/**
 * Fail-loud telemetry for capability gaps: a provider the workspace has
 * connected, but which exposes zero tools to Ask Salt this turn (every tool
 * disabled by policy, or a Composio load failure). These otherwise surface
 * only as user confusion ("Salt says it can't read my email"), so we record
 * them in the same append-only audit channel as tool executions.
 *
 * Never throws — telemetry must not break a chat turn.
 */
export async function logAskSaltCapabilityGaps(
  workspaceId: string,
  capabilities: AskSaltCapabilities,
  userId?: string,
): Promise<void> {
  const gaps = capabilities.providers.filter(
    (provider) =>
      provider.diagnostic === "connected_no_tools" ||
      provider.diagnostic === "load_failed",
  );
  if (gaps.length === 0) return;

  await Promise.all(
    gaps.map((provider) =>
      logToolExecution({
        workspaceId,
        toolSlug: `capability_gap:${provider.toolkit}`,
        risk: "read",
        source: "ask_salt",
        status: "blocked",
        userId: userId ?? null,
        error:
          provider.diagnostic === "load_failed"
            ? `${provider.label} connected but tool load failed: ${capabilities.loadError ?? "unknown error"}`
            : `${provider.label} connected but no tools enabled (read-only or disabled in connector settings)`,
      }),
    ),
  );
}
