import { NextRequest, NextResponse } from "next/server";
import { handleConnectionCallback } from "@/app/_lib/composio/connections";

/**
 * Composio OAuth callback — persists connected account to studio_integrations.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const connectedAccountId = searchParams.get("connectedAccountId");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      new URL(
        `/settings/integrations?google_error=${encodeURIComponent(error)}`,
        request.url,
      ),
    );
  }

  if (!connectedAccountId || !state) {
    return NextResponse.redirect(
      new URL(
        "/settings/integrations?google_error=missing_params",
        request.url,
      ),
    );
  }

  const result = await handleConnectionCallback(connectedAccountId, state);

  if (!result.success) {
    return NextResponse.redirect(
      new URL(
        `/settings/integrations?google_error=${encodeURIComponent(result.error)}`,
        request.url,
      ),
    );
  }

  const redirectTarget = new URL(result.returnUrl, request.url);
  redirectTarget.searchParams.set("google_connected", "true");
  if (result.email) {
    redirectTarget.searchParams.set("google_email", result.email);
  }

  return NextResponse.redirect(redirectTarget);
}
