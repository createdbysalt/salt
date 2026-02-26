import { NextRequest, NextResponse } from "next/server";
import { completeGmailConnection } from "@/app/actions/gmail/connect";

/**
 * Google OAuth callback route
 * Handles the redirect from Google after user authorizes
 */
export async function GET(request: NextRequest) {
  console.log("[Google Callback] Starting...");
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  console.log("[Google Callback] Params:", { hasCode: !!code, hasState: !!state, error });

  // Handle OAuth errors
  if (error) {
    console.error("[Google Callback] OAuth error:", error);
    return NextResponse.redirect(
      new URL(`/settings/integrations?google_error=${encodeURIComponent(error)}`, request.url)
    );
  }

  // Validate required params
  if (!code || !state) {
    console.error("[Google Callback] Missing params");
    return NextResponse.redirect(
      new URL("/settings/integrations?google_error=missing_params", request.url)
    );
  }

  try {
    console.log("[Google Callback] Calling completeGmailConnection...");
    const result = await completeGmailConnection(code, state);
    console.log("[Google Callback] Result:", result);

    if (!result.success) {
      console.error("[Google Callback] Connection failed:", result.error);
      return NextResponse.redirect(
        new URL(`/settings/integrations?google_error=${encodeURIComponent(result.error || "unknown_error")}`, request.url)
      );
    }

    console.log("[Google Callback] Success! Redirecting to:", result.returnUrl);
    // Redirect to return URL with success
    return NextResponse.redirect(
      new URL(`${result.returnUrl}?google_connected=true`, request.url)
    );
  } catch (error) {
    console.error("[Google Callback] Exception:", error);
    return NextResponse.redirect(
      new URL("/settings/integrations?google_error=callback_failed", request.url)
    );
  }
}
