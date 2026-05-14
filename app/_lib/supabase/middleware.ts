import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Use getSession() instead of getUser() for performance.
  // getSession() reads from the local cookie (no network call).
  // getUser() makes a network call to Supabase Auth on every request.
  // The actual user verification happens in protected routes via getUser().
  const { data: { session } } = await supabase.auth.getSession();

  // Only refresh token if session exists and is close to expiry (within 60 seconds)
  if (session?.expires_at) {
    const expiresAt = session.expires_at * 1000; // Convert to milliseconds
    const now = Date.now();
    const timeUntilExpiry = expiresAt - now;

    // Refresh if expiring within 60 seconds
    if (timeUntilExpiry < 60000 && timeUntilExpiry > 0) {
      await supabase.auth.refreshSession();
    }
  }

  return supabaseResponse;
}
