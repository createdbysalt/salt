import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/_lib/supabase/server";
import {
  checkRateLimit,
  RateLimitPresets,
  getClientIp,
  createRateLimitKey,
} from "@/app/_lib/rate-limit";

/**
 * DEV-ONLY: Password-based login for automated testing
 *
 * This route only works in development mode and allows logging in
 * with email/password for browser testing automation.
 *
 * Security: Protected by NODE_ENV check AND explicit ENABLE_DEV_LOGIN flag.
 *
 * Usage:
 *   POST /api/auth/dev-login
 *   Body: { "email": "test@example.com", "password": "password123" }
 */
export async function POST(request: NextRequest) {
  // Double protection: NODE_ENV must be development AND ENABLE_DEV_LOGIN must be set
  // This prevents accidental exposure if NODE_ENV is misconfigured
  const isDev = process.env.NODE_ENV === "development";
  const isExplicitlyEnabled = process.env.ENABLE_DEV_LOGIN === "true";

  if (!isDev || !isExplicitlyEnabled) {
    return NextResponse.json(
      { error: "This endpoint is only available in development mode" },
      { status: 403 }
    );
  }

  // Rate limiting to prevent brute force attacks even in dev
  const ip = getClientIp(request);
  const rateLimitKey = createRateLimitKey("dev-login", ip);
  const rateLimitResult = checkRateLimit(rateLimitKey, RateLimitPresets.STRICT);

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: "Too many login attempts. Please try again later." },
      { status: 429 }
    );
  }

  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error("[dev-login] Auth error:", error.message);
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      );
    }

    if (!data.session) {
      return NextResponse.json(
        { error: "No session returned" },
        { status: 401 }
      );
    }

    // Create response with success message
    const response = NextResponse.json({
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
      },
    });

    return response;
  } catch (err) {
    console.error("[dev-login] Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
