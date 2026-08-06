/**
 * Trigger Reconciliation Cron (connector-platform Phase 3.7)
 *
 * Verifies Composio triggers still exist and repairs stale ones.
 * Prevents "silent capture death" where triggers expire without notice.
 *
 * Secured with CRON_SECRET. Recommended schedule: daily at 3am (vercel.json).
 *
 * Alerts on persistent failures so ops can investigate OAuth issues.
 */

import { NextRequest, NextResponse } from "next/server";
import { runTriggerReconciliation } from "@/app/_lib/composio/trigger-reconciliation";

const CRON_SECRET = process.env.CRON_SECRET;

export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const startTime = Date.now();

  if (!CRON_SECRET) {
    console.error("[Trigger reconciliation cron] CRON_SECRET not configured");
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 },
    );
  }

  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!token || token !== CRON_SECRET) {
    console.warn("[Trigger reconciliation cron] Unauthorized request attempt");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runTriggerReconciliation();

    // Log summary
    console.log(
      `[Trigger reconciliation cron] Complete: ${result.connectionsSeen} connections, ` +
        `${result.instancesSeen} instances seen, ${result.triggersCreated} created, ` +
        `${result.orphansDeleted} orphans deleted, ${result.configsUpdated} configs updated, ` +
        `${result.failures.length} failures`,
    );

    // Log failures for alerting
    if (result.failures.length > 0) {
      console.error(
        `[Trigger reconciliation cron] ${result.failures.length} failure(s):`,
        result.failures
          .map((f) => `${f.provider}@${f.workspaceId} (${f.detail}): ${f.error}`)
          .join("; "),
      );
    }

    return NextResponse.json({
      ok: true,
      durationMs: Date.now() - startTime,
      ...result,
    });
  } catch (error) {
    console.error("[Trigger reconciliation cron] Run failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Run failed" },
      { status: 500 },
    );
  }
}
