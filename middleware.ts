import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getLegacyRedirect, isLegacyRoute } from "@/app/_features/shell/routes";
import {
  getProductAuthRedirectPath,
  isProductAuthEnabled,
  shouldBlockProductAccess,
} from "@/app/_lib/env/product-auth";
import { updateSession } from "@/app/_lib/supabase/middleware";

/**
 * Next.js Middleware for Security Headers and Protection
 *
 * Applied to all routes before they're processed.
 * Handles:
 * 1. Supabase session refresh (critical for auth persistence)
 * 2. Subdomain routing (app.usesalt.io → /hq)
 * 3. Legacy table/bridge subdomain redirects to Spaces
 * 4. Legacy /dashboard/*, /studio/*, /clients/*, /relationships/*, /work/* redirects
 * 5. Security headers
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

  // Handle app subdomain
  // Routes are at root level (/hq, /people, /work)
  // Also supports app.lvh.me for local development
  const isAppSubdomain =
    host.includes("app.usesalt") ||
    host.includes("app.staging.usesalt") ||
    host.includes("app.localhost") ||
    host.includes("app.lvh.me");

  if (isAppSubdomain) {
    if (pathname === "/") {
      const url = request.nextUrl.clone();
      url.pathname = isProductAuthEnabled()
        ? "/hq"
        : getProductAuthRedirectPath();
      return copyAuthCookies(NextResponse.redirect(url, 307));
    }
  }

  if (shouldBlockProductAccess(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = getProductAuthRedirectPath();
    return copyAuthCookies(NextResponse.redirect(url, 307));
  }

  if (
    pathname === "/dev-login" ||
    pathname.startsWith("/dev-login/") ||
    pathname.startsWith("/email-preview")
  ) {
    const url = request.nextUrl.clone();
    url.pathname = getProductAuthRedirectPath();
    return copyAuthCookies(NextResponse.redirect(url, 307));
  }

  // Handle retired client portal subdomains — land on Work.
  const isLegacyBridgeSubdomain =
    host.includes("bridge.usesalt") ||
    host.includes("bridge.localhost") ||
    host.includes("bridge.lvh.me");
  const isTableSubdomain =
    host.includes("table.usesalt") ||
    host.includes("table.localhost") ||
    host.includes("table.lvh.me");

  if (isLegacyBridgeSubdomain || isTableSubdomain) {
    const url = request.nextUrl.clone();
    url.pathname = "/work";
    return copyAuthCookies(NextResponse.redirect(url, 308));
  }

  // Handle legacy /dashboard/* route redirects
  if (isLegacyRoute(pathname)) {
    const newPath = getLegacyRedirect(pathname, request.nextUrl.searchParams);
    if (newPath) {
      const url = request.nextUrl.clone();
      const queryIndex = newPath.indexOf("?");
      if (queryIndex >= 0) {
        url.pathname = newPath.slice(0, queryIndex);
        url.search = newPath.slice(queryIndex);
      } else {
        url.pathname = newPath;
        url.search = "";
      }
      // Use 308 Permanent Redirect to preserve method and tell browsers/search engines
      return copyAuthCookies(NextResponse.redirect(url, 308));
    }
  }

  // Use the supabase response (has auth cookies set properly)
  const response = supabaseResponse;

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
    ? "http://127.0.0.1:7242 http://localhost:7242 http://127.0.0.1:7443 http://localhost:7443"
    : "";

  const csp = [
    "default-src 'self'",
    // GTM / GA4 / Meta Pixel — see tracking handoff §0 (usesalt.io marketing analytics)
    "script-src 'self' 'unsafe-eval' 'unsafe-inline' *.stripe.com https://*.googletagmanager.com https://connect.facebook.net",
    "style-src 'self' 'unsafe-inline'", // unsafe-inline needed for styled-components, CSS-in-JS
    "img-src 'self' data: https: blob:", // Allow images from any HTTPS source (GA4/Meta pixel beacons)
    "font-src 'self' data:",
    "media-src 'self' blob: data:", // Allow audio/video from blob and data URLs (briefing audio)
    `connect-src 'self' *.stripe.com *.supabase.co wss://*.supabase.co *.sanity.io https://*.googletagmanager.com https://*.google-analytics.com https://*.analytics.google.com https://connect.facebook.net https://*.facebook.com ${devLogIngestOrigins}`.trim(),
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
     * - edit (Sanity Studio has its own auth)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api/webhook|api/sanity|api/auth/callback|edit|_next/static|_next/image|favicon.ico).*)",
  ],
};
