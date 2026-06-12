import { NextRequest, NextResponse } from "next/server";

/**
 * OAuth white-label proxy.
 *
 * Google's consent screen names the registrable domain of the OAuth
 * `redirect_uri`. Pointing Composio's auth configs at this route (instead of
 * `backend.composio.dev`) makes the screen read "usesalt.io wants to access
 * your Google Account" — Salt's brand, not the integration vendor's.
 *
 * This route only forwards: Google redirects here after consent with `state`
 * and `code`; we 307 straight through to Composio's real endpoint with the
 * query string intact, so Composio completes the token exchange exactly as if
 * Google had hit it directly. No state is read or stored here.
 *
 * To activate: set each Google auth config's `oauth_redirect_uri` to
 * `https://app.usesalt.io/api/integrations/composio/oauth-proxy`. The full
 * "Salt" app name + logo (no domain at all) still requires Google verification.
 *
 * Replaces the standalone `connect.usesalt.io` redirect project — fold that in
 * and tear it down once this route is deployed.
 */
const COMPOSIO_AUTH_ADD_URL =
  "https://backend.composio.dev/api/v1/auth-apps/add";

export function GET(request: NextRequest): NextResponse {
  const target = new URL(COMPOSIO_AUTH_ADD_URL);
  // Preserve every param Google appended (state, code, scope, …) verbatim.
  target.search = request.nextUrl.search;
  return NextResponse.redirect(target, { status: 307 });
}
