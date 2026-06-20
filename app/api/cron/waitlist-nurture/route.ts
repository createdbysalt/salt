/**
 * Waitlist nurture cron — sends signup-relative sequence emails (2–4) via Resend.
 *
 * Secured with CRON_SECRET. Recommended schedule: daily (see vercel.json).
 */

import { processDueWaitlistNurtureEmails } from "@/app/_features/marketing/waitlist-nurture";
import { NextRequest, NextResponse } from "next/server";

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(req: NextRequest) {
  const startTime = Date.now();

  if (!CRON_SECRET) {
    console.error("[Waitlist nurture cron] CRON_SECRET not configured");
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!token || token !== CRON_SECRET) {
    console.warn("[Waitlist nurture cron] Unauthorized request attempt");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await processDueWaitlistNurtureEmails({ limit: 200 });

    return NextResponse.json({
      success: result.errors.length === 0,
      message: `Sent ${result.sent}, skipped ${result.skipped}, errors ${result.errors.length}`,
      ...result,
      executionTimeMs: Date.now() - startTime,
    });
  } catch (error) {
    console.error("[Waitlist nurture cron] Unexpected error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
        executionTimeMs: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
