/**
 * Capture Evidence Backfill Cron
 *
 * Nightly lane for captures where evidence never ran: the historical
 * bootstrap-email backlog and rows stamped `pending_backfill` at ingest
 * (bootstrap / bulk-import non-email the email-only scan can't reach).
 * Deterministic classifiers only — no LLM spend — with per-workspace and
 * per-run volume caps so large backlogs drain over multiple nights.
 * Also purges expired conversation-message bodies (90d TTL).
 *
 * Secured with CRON_SECRET. Schedule: nightly (vercel.json).
 */

import { NextRequest, NextResponse } from "next/server";
import { assertInternalSecret } from "@/app/_lib/security/assert-internal-secret";
import { runCaptureEvidenceBackfill } from "@/app/_features/capture/services/capture-evidence-backfill";

export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const startTime = Date.now();

  const unauthorized = assertInternalSecret(req, "[Capture evidence backfill cron]");
  if (unauthorized) return unauthorized;

  try {
    const result = await runCaptureEvidenceBackfill();

    if (result.failures.length > 0) {
      console.warn(
        `[Capture evidence backfill cron] ${result.failures.length} failure(s):`,
        result.failures
          .slice(0, 5)
          .map((f) => `${f.captureId}: ${f.error}`)
          .join("; ")
      );
    }

    console.log(
      `[Capture evidence backfill cron] Complete: ${result.capturesProcessed} captures, ` +
        `${result.signalsDetected} signals, ${result.bodiesPurged} bodies purged, ` +
        `${result.durationMs}ms`
    );

    return NextResponse.json({
      ok: true,
      durationMs: Date.now() - startTime,
      capturesProcessed: result.capturesProcessed,
      signalsDetected: result.signalsDetected,
      bodiesPurged: result.bodiesPurged,
      workspacesSeen: result.workspacesSeen,
      failures: result.failures.length,
    });
  } catch (error) {
    console.error("[Capture evidence backfill cron] Run failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Run failed" },
      { status: 500 }
    );
  }
}
