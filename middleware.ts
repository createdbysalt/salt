import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getLegacyRedirect, isLegacyRoute } from "@/app/_features/shell/routes";
import { updateSession } from "@/app/_lib/supabase/middleware";

/**
 * Next.js Middleware for Security Headers and Protection
 *
 * Applied to all routes before they're processed.
 * Handles:
 * 1. Supabase session refresh (critical for auth persistence)
 * 2. Subdomain routing (bridge.saltcore.io → /bridge)
 * 3. Legacy /dashboard/* route redirects to new /studio/*, /strategy/*, /serve/* routes
 * 4. Security headers
 */

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get("host") || "";

  // Refresh Supabase session (critical for auth persistence)
  // This must run before any redirects to ensure cookies are properly set
  const supabaseResponse = await updateSession(request);

  // Helper to copy auth cookies to redirect/rewrite responses
  const copyAuthCookies = (response: NextResponse) => {
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      response.cookies.set(cookie.name, cookie.value, cookie);
    });
    return response;
  };

  // Handle bridge subdomain: clean URLs without /bridge prefix
  // bridge.saltcore.io/login → internally serves /bridge/login
  // Also supports bridge.lvh.me for local development
  const isBridgeSubdomain =
    host.includes("bridge.saltcore") ||
    host.includes("bridge.localhost") ||
    host.includes("bridge.lvh.me");

  if (isBridgeSubdomain) {
    // If URL has /bridge prefix, redirect to remove it (keeps URLs clean)
    // bridge.saltcore.io/bridge/login → redirect to → bridge.saltcore.io/login
    if (pathname.startsWith("/bridge")) {
      const url = request.nextUrl.clone();
      url.pathname = pathname.replace(/^\/bridge/, "") || "/";
      return copyAuthCookies(NextResponse.redirect(url, 307));
    }

    // Rewrite clean URLs to internal /bridge/* paths
    // bridge.saltcore.io/login → internally serves /bridge/login
    if (!pathname.startsWith("/api") && !pathname.startsWith("/_next")) {
      const url = request.nextUrl.clone();
      url.pathname = "/bridge" + pathname;
      return copyAuthCookies(NextResponse.rewrite(url));
    }
  }

  // Handle legacy /dashboard/* route redirects
  if (isLegacyRoute(pathname)) {
    const newPath = getLegacyRedirect(pathname);
    if (newPath) {
      const url = request.nextUrl.clone();
      url.pathname = newPath;
      // Use 308 Permanent Redirect to preserve method and tell browsers/search engines
      return copyAuthCookies(NextResponse.redirect(url, 308));
    }
  }

  // Use the supabase response (has auth cookies set properly)
  const response = supabaseResponse;

  // Add pathname header for tenant context resolution
  response.headers.set("x-pathname", request.nextUrl.pathname);

  // Security Headers
  // Reference: https://securityheaders.com/

  // Prevent clickjacking
  response.headers.set("X-Frame-Options", "SAMEORIGIN");

  // Prevent MIME type sniffing
  response.headers.set("X-Content-Type-Options", "nosniff");

  // Enable browser XSS protection (legacy, but doesn't hurt)
  response.headers.set("X-XSS-Protection", "1; mode=block");

  // Referrer policy
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // Permissions Policy (formerly Feature Policy)
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );

  // Content Security Policy (CSP)
  // Note: Adjust this based on your actual needs
  // For Stripe Checkout redirect, we need to allow stripe.com
  const isDev = process.env.NODE_ENV !== "production";
  const devLogIngestOrigins = isDev
    ? "http://127.0.0.1:7242 http://localhost:7242"
    : "";

  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline' *.stripe.com", // unsafe-inline/eval needed for Next.js dev mode and some libraries
    "style-src 'self' 'unsafe-inline'", // unsafe-inline needed for styled-components, CSS-in-JS
    "img-src 'self' data: https: blob:", // Allow images from any HTTPS source
    "font-src 'self' data:",
    `connect-src 'self' *.stripe.com *.supabase.co wss://*.supabase.co ${devLogIngestOrigins}`.trim(), // Allow API calls to Stripe and Supabase (+ WebSocket for realtime)
    "frame-src 'self' *.stripe.com", // Allow Stripe iframe/redirect
    "form-action 'self' *.stripe.com", // Allow form submission to Stripe
    "base-uri 'self'",
    "object-src 'none'",
  ].join("; ");

  response.headers.set("Content-Security-Policy", csp);

  // Strict Transport Security (HTTPS only)
  // Only set this if you're using HTTPS
  if (request.nextUrl.protocol === "https:") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload"
    );
  }

  return response;
}

// Configure which routes the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/webhook (webhooks need special handling, not CSP)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api/webhook|_next/static|_next/image|favicon.ico).*)",
  ],
};
