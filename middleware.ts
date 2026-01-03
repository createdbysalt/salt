import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Next.js Middleware for Security Headers and Protection
 * 
 * Applied to all routes before they're processed.
 * Adds security headers and can implement rate limiting, CSP, etc.
 */

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  
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
    `connect-src 'self' *.stripe.com *.supabase.co ${devLogIngestOrigins}`.trim(), // Allow API calls to Stripe and Supabase (+ debug logging in dev)
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
