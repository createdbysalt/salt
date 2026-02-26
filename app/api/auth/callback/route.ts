import { NextResponse, NextRequest } from "next/server";
import { createClient } from "@/app/_lib/supabase/server";
import config from "@/config";
import { updateClientUserStatusToActive } from "@/app/_lib/utils/update-client-user-status";
import { encryptToken } from "@/app/_lib/gmail/crypto";

export const dynamic = "force-dynamic";

// This route is called after a successful login. It exchanges the code for a session and redirects to the callback URL (see config.js).
export async function GET(req: NextRequest) {
  const requestUrl = new URL(req.url);
  const code = requestUrl.searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { data } = await supabase.auth.exchangeCodeForSession(code);

    // Update client user status to 'active' on first sign-in (if they were pending)
    if (data.user) {
      await updateClientUserStatusToActive(data.user.id);
    }

    // Determine where to redirect based on user type
    if (data.user) {
      const userId = data.user.id;
      const session = data.session;

      // Determine Bridge URL based on environment.
      // Avoid hardcoded cleartext HTTP URLs (even in dev) to keep security scanners happy.
      const bridgeUrl =
        process.env.NEXT_PUBLIC_BRIDGE_URL ??
        (process.env.NODE_ENV === "development"
          ? new URL("/bridge", requestUrl.origin).toString()
          : "https://bridge.saltcore.io");

      // Check if this is a client user
      const { data: clientMember } = await supabase
        .from("client_users")
        .select("id")
        .eq("user_id", userId)
        .single();

      // Check if this is a studio member
      const { data: studioMember } = await supabase
        .from("studio_members")
        .select("studio_id")
        .eq("user_id", userId)
        .single();

      // Auto-save Google connection if user signed in with Google and has tokens
      if (
        studioMember &&
        session?.provider_token &&
        session?.provider_refresh_token &&
        data.user.app_metadata?.provider === "google"
      ) {
        try {
          const userEmail = data.user.email;
          if (userEmail && process.env.GMAIL_ENCRYPTION_KEY) {
            await supabase.from("gmail_connections").upsert(
              {
                user_id: userId,
                studio_id: studioMember.studio_id,
                email: userEmail,
                access_token_encrypted: encryptToken(session.provider_token),
                refresh_token_encrypted: encryptToken(session.provider_refresh_token),
                token_expires_at: new Date(Date.now() + 3600 * 1000).toISOString(), // 1 hour from now
                scopes: [
                  "https://www.googleapis.com/auth/gmail.send",
                  "https://www.googleapis.com/auth/gmail.readonly",
                  "https://www.googleapis.com/auth/gmail.modify",
                  "https://www.googleapis.com/auth/calendar.readonly",
                  "https://www.googleapis.com/auth/calendar.events",
                ],
              },
              { onConflict: "user_id,studio_id" }
            );
            console.log("Auto-saved Google connection for user:", userId);
          }
        } catch (error) {
          // Don't block login if Gmail connection fails
          console.error("Failed to auto-save Google connection:", error);
        }
      }

      // Client-only users ALWAYS go to Bridge
      if (clientMember && !studioMember) {
        return NextResponse.redirect(bridgeUrl);
      }

      // Studio members go to the studio dashboard
      if (studioMember) {
        return NextResponse.redirect(requestUrl.origin + config.auth.callbackUrl);
      }
    }
  }

  // URL to redirect to after sign in process completes
  return NextResponse.redirect(requestUrl.origin + config.auth.callbackUrl);
}
