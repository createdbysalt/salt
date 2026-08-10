/**
 * Capture Intelligence Cron
 *
 * Automated intelligence scan for all workspaces with capture-enabled connections.
 * Processes awaiting_scan captures → creates findings → routes to plays queues.
 *
 * This completes the LEARN → ACT pipeline by ensuring captures don't sit in
 * "awaiting_scan" state indefinitely.
 *
 * Secured with CRON_SECRET. Recommended schedule: every 30 minutes (vercel.json).
 */

import { NextRequest, NextResponse } from "next/server";
import { assertInternalSecret } from "@/app/_lib/security/assert-internal-secret";
import { runCaptureIntelligenceScan } from "@/app/_features/capture/services/capture-intelligence-cron";

export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const startTime = Date.now();

  const unauthorized = assertInternalSecret(req, "[Capture intelligence cron]");
  if (unauthorized) return unauthorized;

  try {
    const result = await runCaptureIntelligenceScan();

    if (result.failures.length > 0) {
      console.warn(
        `[Capture intelligence cron] ${result.failures.length} failure(s):`,
        result.failures
          .slice(0, 5)
          .map((f) => `${f.workspaceId}: ${f.error}`)
          .join("; ")
      );
    }

    console.log(
      `[Capture intelligence cron] Complete: ${result.workspacesProcessed} workspaces, ` +
        `${result.totalEmailsProcessed} emails, ${result.totalFindingsCreated} findings, ` +
        `${result.durationMs}ms`
    );

    return NextResponse.json({
      ok: true,
      durationMs: Date.now() - startTime,
      workspacesProcessed: result.workspacesProcessed,
      workspacesSkipped: result.workspacesSkipped,
      emailsProcessed: result.totalEmailsProcessed,
      findingsCreated: result.totalFindingsCreated,
      peopleResolved: result.totalPeopleResolved,
      sendersPromoted: result.totalSendersPromoted,
      sendersNeedingConfirmation: result.totalSendersNeedingConfirmation,
      discoverySkippedCadence: result.discoverySkippedCadence,
      budgetExhausted: result.budgetExhausted,
      failures: result.failures.length,
    });
  } catch (error) {
    console.error("[Capture intelligence cron] Run failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Run failed" },
      { status: 500 }
    );
  }
}
