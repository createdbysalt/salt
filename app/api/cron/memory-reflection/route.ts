/**
 * Memory Reflection cron.
 *
 * Runs weekly (Sunday 4am UTC). Analyzes correction patterns across all
 * workspaces to identify unreliable signal sources and adjust their
 * confidence weights.
 *
 * P8 pattern-level learning: when corrections cluster on a signal source
 * (e.g., "email signatures are often wrong for roles"), Salt learns to be
 * more cautious without blocking the source entirely.
 *
 * Secured with CRON_SECRET. Schedule: weekly (vercel.json).
 */

import { NextRequest, NextResponse } from "next/server";
import { assertInternalSecret } from "@/app/_lib/security/assert-internal-secret";
import { runWeeklyReflectionScan } from "@/app/_features/memory/care/scheduler";

export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const startTime = Date.now();

  const unauthorized = assertInternalSecret(req, "[Memory reflection cron]");
  if (unauthorized) return unauthorized;

  try {
    const result = await runWeeklyReflectionScan();

    return NextResponse.json({
      ok: true,
      durationMs: Date.now() - startTime,
      ...result,
    });
  } catch (error) {
    console.error("[Memory reflection cron] Run failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Run failed" },
      { status: 500 }
    );
  }
}
