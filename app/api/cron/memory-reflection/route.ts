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
import { runWeeklyReflectionScan } from "@/app/_features/memory/care/scheduler";

const CRON_SECRET = process.env.CRON_SECRET;

export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const startTime = Date.now();

  if (!CRON_SECRET) {
    console.error("[Memory reflection cron] CRON_SECRET not configured");
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!token || token !== CRON_SECRET) {
    console.warn("[Memory reflection cron] Unauthorized request attempt");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
