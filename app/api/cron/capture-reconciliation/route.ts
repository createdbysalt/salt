/**
 * Capture reconciliation cron (connector-platform Phase 3.6).
 *
 * Low-frequency backfill sweep over every capture-enabled connection to
 * catch events trigger delivery missed. Envelope dedupe makes the overlap
 * windows idempotent.
 *
 * Secured with CRON_SECRET. Recommended schedule: every 6 hours (vercel.json).
 */

import { NextRequest, NextResponse } from "next/server";
import { assertInternalSecret } from "@/app/_lib/security/assert-internal-secret";
import { runCaptureReconciliation } from "@/app/_features/capture/services/capture-reconciliation";

export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const startTime = Date.now();

  const unauthorized = assertInternalSecret(req, "[Capture reconciliation cron]");
  if (unauthorized) return unauthorized;

  try {
    const result = await runCaptureReconciliation();
    if (result.failures.length > 0) {
      console.warn(
        `[Capture reconciliation cron] ${result.failures.length} failure(s):`,
        result.failures
          .map((f) => `${f.provider}@${f.workspaceId}: ${f.error}`)
          .join("; "),
      );
    }
    return NextResponse.json({
      ok: true,
      durationMs: Date.now() - startTime,
      connectionsSeen: result.connectionsSeen,
      connectionsReconciled: result.connectionsReconciled,
      capturesCreated: result.capturesCreated,
      skipped: result.skipped,
      failures: result.failures.length,
      webhookVolume: result.webhookVolume,
    });
  } catch (error) {
    console.error("[Capture reconciliation cron] Run failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Run failed" },
      { status: 500 },
    );
  }
}
