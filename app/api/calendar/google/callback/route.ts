import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { createClient } from "@/libs/supabase/server";
import { encryptToken } from "@/libs/calendar-encryption";
import { getTenantContext } from "@/libs/tenancy";

/**
 * Handle Google Calendar OAuth callback
 * GET /api/calendar/google/callback?code=...&state=userId
 */
export async function GET(request: NextRequest) {
  const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin;

  const redirectToMeetings = (params: Record<string, string>) => {
    const url = new URL("/dashboard/meetings", appBaseUrl);
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
    return NextResponse.redirect(url);
  };

  const safeErrorCode = (value: string) => {
    // Keep error values predictable + URL-safe (and avoid reflecting arbitrary strings)
    return /^[a-z0-9_]+$/i.test(value) ? value : "unknown";
  };

  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const state = searchParams.get("state"); // user ID
    const error = searchParams.get("error");

    if (error) {
      return redirectToMeetings({ calendar_error: safeErrorCode(error) });
    }

    if (!code || !state) {
      return redirectToMeetings({ calendar_error: "missing_params" });
    }

    const supabase = await createClient();
    
    // Verify user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id !== state) {
      return redirectToMeetings({ calendar_error: "unauthorized" });
    }

    // Exchange code for tokens
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CALENDAR_CLIENT_ID,
      process.env.GOOGLE_CALENDAR_CLIENT_SECRET,
      `${process.env.NEXT_PUBLIC_APP_URL}/api/calendar/google/callback`
    );

    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.access_token || !tokens.refresh_token) {
      return redirectToMeetings({ calendar_error: "no_tokens" });
    }

    // Get user's email from Google
    oauth2Client.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const { data: userInfo } = await oauth2.userinfo.get();

    // Get studio_id for this user
    const { context } = await getTenantContext();
    if (!context.studio) {
      return redirectToMeetings({ calendar_error: "no_studio" });
    }

    // Encrypt tokens
    const encryptedAccessToken = encryptToken(tokens.access_token);
    const encryptedRefreshToken = tokens.refresh_token
      ? encryptToken(tokens.refresh_token)
      : null;

    // Store in database
    const { error: dbError } = await supabase
      .from("calendar_connections")
      .upsert({
        user_id: user.id,
        studio_id: context.studio.id,
        provider: "google",
        provider_account_email: userInfo.email || null,
        access_token_ciphertext: encryptedAccessToken,
        refresh_token_ciphertext: encryptedRefreshToken,
        token_expires_at: tokens.expiry_date
          ? new Date(tokens.expiry_date).toISOString()
          : null,
        scopes: tokens.scope?.split(" ") || [],
        is_active: true,
      });

    if (dbError) {
      console.error("Error saving calendar connection:", dbError);
      return redirectToMeetings({ calendar_error: "db_error" });
    }

    // Redirect back to meetings page with success
    return redirectToMeetings({ calendar_connected: "1" });
  } catch (error) {
    console.error("Error handling Google OAuth callback:", error);
    return redirectToMeetings({ calendar_error: "unknown" });
  }
}

