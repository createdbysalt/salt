/**
 * HQ daily briefing cron.
 *
 * Runs hourly. The weekday 9am America/Toronto window is decided in
 * `isDailyBriefingDue` — the route itself is an hourly tick so DST and
 * timezone stay correct without a fixed UTC cron.
 *
 * Secured with CRON_SECRET. Schedule: hourly (vercel.json).
 */

import { NextRequest, NextResponse } from "next/server";
import { assertInternalSecret } from "@/app/_lib/security/assert-internal-secret";
import { runDailyBriefingCron } from "@/app/_features/hq/briefing/run-daily-briefing-cron";

export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const startTime = Date.now();

  const unauthorized = assertInternalSecret(req, "[Daily briefing cron]");
  if (unauthorized) return unauthorized;

  try {
    const result = await runDailyBriefingCron();

    console.log(
      `[Daily briefing cron] Complete: due=${result.due}, ` +
        `${result.workspaces} workspaces, ${result.created} created, ` +
        `${result.alreadyExists} already existed, ${result.skippedEmpty} empty, ` +
        `${Date.now() - startTime}ms`,
    );

    return NextResponse.json({
      ok: true,
      durationMs: Date.now() - startTime,
      ...result,
    });
  } catch (error) {
    console.error("[Daily briefing cron] Run failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Run failed" },
      { status: 500 },
    );
  }
}
