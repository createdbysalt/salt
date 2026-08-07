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
import { runCaptureIntelligenceScan } from "@/app/_features/capture/services/capture-intelligence-cron";

const CRON_SECRET = process.env.CRON_SECRET;

export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const startTime = Date.now();

  if (!CRON_SECRET) {
    console.error("[Capture intelligence cron] CRON_SECRET not configured");
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!token || token !== CRON_SECRET) {
    console.warn("[Capture intelligence cron] Unauthorized request attempt");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
