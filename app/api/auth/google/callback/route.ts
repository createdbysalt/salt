import { NextRequest, NextResponse } from "next/server";
import { connectorsPageUrl } from "@/app/_features/connectors/constants";

/**
 * Legacy Google OAuth callback — redirects to Composio-backed integrations settings.
 */
export async function GET(request: NextRequest) {
  return NextResponse.redirect(
    new URL(
      connectorsPageUrl({ google_error: "legacy_oauth_disabled" }),
      request.url,
    ),
  );
}
