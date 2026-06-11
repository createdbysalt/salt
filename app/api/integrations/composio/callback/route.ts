import { NextRequest, NextResponse } from "next/server";
import { connectorsPageUrl } from "@/app/_features/connectors/constants";
import { handleConnectionCallback } from "@/app/_lib/composio/connections";

/**
 * Composio OAuth callback — persists connected account to workspace_integrations.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const connectedAccountId = searchParams.get("connectedAccountId");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      new URL(
        connectorsPageUrl({ google_error: error }),
        request.url,
      ),
    );
  }

  if (!connectedAccountId || !state) {
    return NextResponse.redirect(
      new URL(connectorsPageUrl({ google_error: "missing_params" }), request.url),
    );
  }

  const result = await handleConnectionCallback(connectedAccountId, state);

  if (!result.success) {
    return NextResponse.redirect(
      new URL(
        connectorsPageUrl({ google_error: result.error }),
        request.url,
      ),
    );
  }

  const redirectTarget = new URL(result.returnUrl, request.url);
  redirectTarget.searchParams.set("google_connected", "true");
  redirectTarget.searchParams.set("connected_provider", result.provider);
  if (result.email) {
    redirectTarget.searchParams.set("google_email", result.email);
  }

  return NextResponse.redirect(redirectTarget);
}
