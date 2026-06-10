import { NextRequest, NextResponse } from "next/server";

/**
 * Legacy Google OAuth callback — redirects to Composio-backed integrations settings.
 */
export async function GET(request: NextRequest) {
  return NextResponse.redirect(
    new URL(
      "/settings/connectors?google_error=legacy_oauth_disabled",
      request.url,
    ),
  );
}
