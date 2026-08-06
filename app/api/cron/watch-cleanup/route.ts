import { NextResponse } from "next/server";
import { expireOldWatches, expireOverTriggeredWatches } from "@/app/_lib/learning";
import { expireStaleWatches } from "@/app/_features/capture/services/intelligence/record-capture-outcome";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startTime = Date.now();

  try {
    // Entity watches (signal-based)
    const expiredCount = await expireOldWatches();
    const overTriggeredCount = await expireOverTriggeredWatches();

    // Watch expressions (capture-based pending contacts)
    const staleWatchExpressions = await expireStaleWatches();

    return NextResponse.json({
      success: true,
      expiredWatches: expiredCount,
      overTriggeredWatches: overTriggeredCount,
      staleWatchExpressions,
      durationMs: Date.now() - startTime,
    });
  } catch (error) {
    console.error("[watch-cleanup] Cron failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        durationMs: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}
