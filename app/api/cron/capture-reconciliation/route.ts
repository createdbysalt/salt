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
import { runCaptureReconciliation } from "@/app/_features/capture/services/capture-reconciliation";

const CRON_SECRET = process.env.CRON_SECRET;

export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const startTime = Date.now();

  if (!CRON_SECRET) {
    console.error("[Capture reconciliation cron] CRON_SECRET not configured");
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 },
    );
  }

  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!token || token !== CRON_SECRET) {
    console.warn("[Capture reconciliation cron] Unauthorized request attempt");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
      failures: result.failures.length,
    });
  } catch (error) {
    console.error("[Capture reconciliation cron] Run failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Run failed" },
      { status: 500 },
    );
  }
}
