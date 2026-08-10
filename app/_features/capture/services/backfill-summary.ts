import "server-only";

/**
 * Sync summary entries (Connector Rules & Learning, P5).
 *
 * Every capture backfill run (connect bootstrap, manual sync, reconciliation
 * cron) logs ONE summary execution row with outcome counts — "34 found ·
 * 8 added · 2 kept out" — so the connector Activity tab answers "what
 * happened" without the user paging through per-page fetch rows. The
 * per-page rows remain in workspace_tool_executions (audit intact); the
 * renderer collapses them.
 *
 * Slug is synthetic (`capture_backfill:<provider>`) with an explicit provider
 * so the detail pane's provider-scoped query picks it up.
 */

import { logToolExecution } from "@/app/_lib/composio/execution-log";

export interface BackfillSummaryCounts {
  /** Items the provider returned. */
  found: number;
  /** Captures admitted to the stream. */
  added: number;
  /** Items the gate kept out (noise + dropped). */
  keptOut: number;
}

export async function logBackfillSummaryExecution(
  workspaceId: string,
  provider: string,
  counts: BackfillSummaryCounts,
): Promise<void> {
  await logToolExecution({
    workspaceId,
    toolSlug: `capture_backfill:${provider}`,
    provider,
    risk: "read",
    source: "background",
    status: "success",
    args: { result: counts },
  });
}
