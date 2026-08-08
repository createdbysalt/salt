/**
 * Signal scan cron (Phase 2.7 trigger dispatch).
 *
 * Periodic sweep that detects signal-firing conditions (overdue billing,
 * completed meetings, silent contacts) and dispatches to playbooks that
 * declare those signals as triggers.
 *
 * Secured with CRON_SECRET. Recommended schedule: every hour (vercel.json).
 */

import { NextRequest, NextResponse } from "next/server";
import { runSignalScanAllWorkspaces } from "@/app/_features/plays/services/signal-scanner";
import { assertInternalSecret } from "@/app/_lib/security/assert-internal-secret";

export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const startTime = Date.now();

  const unauthorized = assertInternalSecret(req, "[Signal scan cron]");
  if (unauthorized) return unauthorized;

  try {
    const { results, totalPlaysCreated } = await runSignalScanAllWorkspaces();

    const summary = {
      workspacesScanned: results.length,
      billingSignalsFired: results.reduce((sum, r) => sum + r.billingSignalsFired, 0),
      meetingSignalsFired: results.reduce((sum, r) => sum + r.meetingSignalsFired, 0),
      personSignalsFired: results.reduce((sum, r) => sum + r.personSignalsFired, 0),
      orgSignalsFired: results.reduce((sum, r) => sum + r.orgSignalsFired, 0),
      playsCreated: totalPlaysCreated,
      errors: results.flatMap((r) => r.errors).length,
    };

    if (summary.errors > 0) {
      console.warn(
        `[Signal scan cron] ${summary.errors} error(s) across workspaces`
      );
    }

    return NextResponse.json({
      ok: true,
      durationMs: Date.now() - startTime,
      ...summary,
    });
  } catch (error) {
    console.error("[Signal scan cron] Run failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Run failed" },
      { status: 500 }
    );
  }
}
