import { NextResponse } from "next/server";
import { expireOldWatches, expireOverTriggeredWatches } from "@/app/_lib/learning";

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
    const expiredCount = await expireOldWatches();
    const overTriggeredCount = await expireOverTriggeredWatches();

    return NextResponse.json({
      success: true,
      expiredWatches: expiredCount,
      overTriggeredWatches: overTriggeredCount,
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
