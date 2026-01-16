import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/_lib/supabase/server";

/**
 * DEV-ONLY: Password-based login for automated testing
 *
 * This route only works in development mode and allows logging in
 * with email/password for browser testing automation.
 *
 * Usage:
 *   POST /api/auth/dev-login
 *   Body: { "email": "test@example.com", "password": "password123" }
 */
export async function POST(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { error: "This endpoint is only available in development mode" },
      { status: 403 }
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
