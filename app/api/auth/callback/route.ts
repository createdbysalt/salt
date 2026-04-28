import { NextResponse, NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import config from "@/config";
import { updateClientUserStatusToActive } from "@/app/_lib/utils/update-client-user-status";
import { encryptToken } from "@/app/_lib/gmail/crypto";

export const dynamic = "force-dynamic";

// This route is called after a successful login. It exchanges the code for a session and redirects to the callback URL (see config.js).
export async function GET(req: NextRequest) {
  const requestUrl = new URL(req.url);
  const code = requestUrl.searchParams.get("code");

  if (code) {
    // Create a response that we'll set cookies on
    let response = NextResponse.redirect(requestUrl.origin + config.auth.callbackUrl);

    // Create Supabase client with cookie handling for this response
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return req.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    console.log("[AUTH CALLBACK] Exchange result:", {
      hasUser: !!data.user,
      hasSession: !!data.session,
      error: error?.message,
      cookiesSet: response.cookies.getAll().map(c => c.name),
    });

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
          : "https://bridge.usesalt.io");

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

      // Helper to create redirect with auth cookies
      const redirectWithCookies = (url: string) => {
        const redirectResponse = NextResponse.redirect(url);
        response.cookies.getAll().forEach((cookie) => {
          redirectResponse.cookies.set(cookie.name, cookie.value, cookie);
        });
        return redirectResponse;
      };

      // Client-only users ALWAYS go to Bridge
      if (clientMember && !studioMember) {
        return redirectWithCookies(bridgeUrl);
      }

      // Studio members go to the studio dashboard (use the pre-created response with cookies)
      if (studioMember) {
        return response;
      }
    }

    // Return the default response with cookies
    return response;
  }

  // No code provided - redirect to callback URL
  return NextResponse.redirect(requestUrl.origin + config.auth.callbackUrl);
}
