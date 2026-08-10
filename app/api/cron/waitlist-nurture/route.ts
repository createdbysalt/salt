/**
 * Waitlist nurture cron — sends signup-relative sequence emails (2–4) via Resend.
 *
 * Secured with CRON_SECRET. Recommended schedule: daily (see vercel.json).
 */

import { processDueWaitlistNurtureEmails } from "@/app/_features/marketing/waitlist-nurture";
import { NextRequest, NextResponse } from "next/server";
import { assertInternalSecret } from "@/app/_lib/security/assert-internal-secret";

export async function GET(req: NextRequest) {
  const startTime = Date.now();

  const unauthorized = assertInternalSecret(req, "[Waitlist nurture cron]");
  if (unauthorized) return unauthorized;

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
