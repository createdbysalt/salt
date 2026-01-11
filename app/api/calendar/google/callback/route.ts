import { NextRequest, NextResponse } from "next/server";

/**
 * Handle Google Calendar OAuth callback
 * GET /api/calendar/google/callback?code=...&state=userId
 *
 * Note: This feature requires the 'googleapis' package to be installed
 * npm install googleapis
 */
export async function GET(request: NextRequest) {
  const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin;
  const url = new URL("/dashboard/settings", appBaseUrl);
  url.searchParams.set("error", "calendar_not_configured");
  url.searchParams.set("message", "Google Calendar integration requires the googleapis package to be installed");
  return NextResponse.redirect(url);
}
