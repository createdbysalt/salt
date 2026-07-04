import { NextResponse, NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Session, SupabaseClient, User } from "@supabase/supabase-js";
import config from "@/config";
import {
  getProductAuthRedirectPath,
  isProductAuthEnabled,
} from "@/app/_lib/env/product-auth";
import {
  authCallbackFailureMessage,
  buildHashForwardHtml,
  buildSignInFailureUrl,
  parseEmailOtpType,
} from "@/app/_features/auth/utils/auth-callback-fallback";

export const dynamic = "force-dynamic";

function createCallbackSupabaseClient(
  req: NextRequest,
  response: NextResponse
) {
  return createServerClient(
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
}

async function establishSessionRedirect(
  req: NextRequest,
  requestUrl: URL,
  establishSession: (
    supabase: SupabaseClient
  ) => Promise<{ user: User | null; session: Session | null; errorMessage?: string }>
): Promise<NextResponse> {
  const response = NextResponse.redirect(
    requestUrl.origin + config.auth.callbackUrl
  );
  const supabase = createCallbackSupabaseClient(req, response);
  const { user, session, errorMessage } = await establishSession(supabase);

  console.warn("[AUTH CALLBACK] Session result:", {
    hasUser: !!user,
    hasSession: !!session,
    error: errorMessage,
    cookiesSet: response.cookies.getAll().map((cookie) => cookie.name),
  });

  if (errorMessage || !session || !user) {
    return NextResponse.redirect(
      buildSignInFailureUrl(
        requestUrl.origin,
        "auth_callback_failed",
        errorMessage
          ? authCallbackFailureMessage(errorMessage)
          : "We could not establish a session from that sign-in link. Request a new magic link and open it in the same browser."
      )
    );
  }

  return response;
}

// This route is called after a successful login. It exchanges the code for a session and redirects to the callback URL (see config.js).
export async function GET(req: NextRequest) {
  if (!isProductAuthEnabled()) {
    const requestUrl = new URL(req.url);
    return NextResponse.redirect(
      new URL(getProductAuthRedirectPath(), requestUrl.origin),
      307
    );
  }

  const requestUrl = new URL(req.url);
  const code = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const otpType = parseEmailOtpType(requestUrl.searchParams.get("type"));

  if (code) {
    return establishSessionRedirect(req, requestUrl, async (supabase) => {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      return {
        user: data.user,
        session: data.session,
        errorMessage: error?.message,
      };
    });
  }

  if (tokenHash && otpType) {
    return establishSessionRedirect(req, requestUrl, async (supabase) => {
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: otpType,
      });
      return {
        user: data.user,
        session: data.session,
        errorMessage: error?.message,
      };
    });
  }

  // Hash tokens (#access_token=...) never reach the server. Forward them to /signin client-side.
  return new NextResponse(buildHashForwardHtml("/signin"), {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
