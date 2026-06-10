/**
 * Cal.com OAuth Callback Handler
 *
 * Handles the redirect from Cal.com after user authorization.
 * Exchanges the authorization code for tokens and stores them.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/_lib/supabase/server";
import { encryptToken } from "@repo/security";
import {
  exchangeCalcomCode,
  getCalcomUserProfile,
} from "@/app/_lib/calcom/oauth";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  // Handle OAuth errors
  if (error) {
    console.error("Cal.com OAuth error:", error);
    return NextResponse.redirect(
      new URL("/settings/connectors?error=calcom_denied", req.url)
    );
  }

  // Validate required parameters
  if (!code || !state) {
    console.error("Missing code or state in Cal.com callback");
    return NextResponse.redirect(
      new URL("/settings/connectors?error=calcom_invalid", req.url)
    );
  }

  // Parse state to get studioId
  let studioId: string;
  try {
    const stateData = JSON.parse(Buffer.from(state, "base64").toString());
    studioId = stateData.studioId;
    if (!studioId) throw new Error("Missing studioId in state");
  } catch (err) {
    console.error("Invalid state parameter:", err);
    return NextResponse.redirect(
      new URL("/settings/connectors?error=calcom_invalid_state", req.url)
    );
  }

  try {
    // Get current user
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(
        new URL("/signin?redirect=/settings/connectors", req.url)
      );
    }

    // Verify user has access to this studio
    const { data: membership } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", studioId)
      .eq("user_id", user.id)
      .single();

    if (!membership || !["owner", "admin"].includes(membership.role)) {
      return NextResponse.redirect(
        new URL("/settings/connectors?error=calcom_unauthorized", req.url)
      );
    }

    // Exchange code for tokens
    const tokens = await exchangeCalcomCode(code);

    // Get user profile to store username
    const profile = await getCalcomUserProfile(tokens.access_token);

    // Encrypt tokens
    const encryptedAccessToken = encryptToken(tokens.access_token);
    const encryptedRefreshToken = encryptToken(tokens.refresh_token);

    // Calculate token expiry
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    // Store integration
    const { data: existing } = await supabase
      .from("workspace_integrations")
      .select("id")
      .eq("workspace_id", studioId)
      .eq("provider", "calcom")
      .single();

    const integrationData = {
      api_key_encrypted: encryptedAccessToken, // Store access token
      config: {
        username: profile.username,
        refreshToken: encryptedRefreshToken,
        tokenExpiresAt: expiresAt.toISOString(),
        userId: profile.id,
        email: profile.email,
      },
      is_active: true,
      connected_at: new Date().toISOString(),
      connected_by: user.id,
      last_error: null,
    };

    if (existing) {
      const { error: updateError } = await supabase
        .from("workspace_integrations")
        .update(integrationData)
        .eq("id", existing.id);

      if (updateError) {
        console.error("Failed to update Cal.com integration:", updateError);
        throw new Error(`Database update failed: ${updateError.message}`);
      }
    } else {
      const { error: insertError } = await supabase
        .from("workspace_integrations")
        .insert({
          workspace_id: studioId,
          provider: "calcom",
          ...integrationData,
        });

      if (insertError) {
        console.error("Failed to insert Cal.com integration:", insertError);
        throw new Error(`Database insert failed: ${insertError.message}`);
      }
    }

    // Redirect back to settings with success
    return NextResponse.redirect(
      new URL("/settings/connectors?success=calcom", req.url)
    );
  } catch (err) {
    console.error("Cal.com OAuth callback error:", err);
    return NextResponse.redirect(
      new URL("/settings/connectors?error=calcom_failed", req.url)
    );
  }
}
