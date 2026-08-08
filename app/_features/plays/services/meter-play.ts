import "server-only";

import { recordPlayExecution } from "@/app/_lib/usage/record-play-usage";

/**
 * Meter a play that reached `ran` without executing any connector tool.
 *
 * Memory Care applies, intake records, and log-only approvals all finish
 * outside `executePlayRun`. None of them touch an external system, so every one of
 * them meters `billable: false` — they are never invoiced. They are recorded
 * anyway because G10 requires LEARN-layer spend to stay visible to the margin
 * monitor; a play that costs money and bills nothing is exactly the kind of
 * work that erodes margin silently.
 *
 * Never throws. These call sites have already committed their state change,
 * and a ledger failure must not turn a completed action into an error toast.
 * `recordUsageEvent` is idempotent on the run id, so a retry or a backfill
 * lands exactly once.
 */
export async function meterInternalPlay(
  workspaceId: string,
  playRunId: string,
): Promise<void> {
  try {
    await recordPlayExecution({
      workspaceId,
      playRunId,
      toolSlugs: [],
    });
  } catch (error) {
    console.error("[usage] failed to meter internal play", playRunId, error);
  }
}
