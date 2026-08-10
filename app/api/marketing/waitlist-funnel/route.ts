import { NextResponse } from "next/server";
import { createAdminClient } from "@/app/_lib/supabase/admin";
import type { Json } from "@/app/_lib/supabase/database.types";
import {
  getConsentFromCookieHeader,
  hasAnalyticsConsent,
} from "@/app/_lib/consent/cookie-consent";

const ALLOWED_EVENTS = new Set([
  "homepage_view",
  "waitlist_partial",
  "waitlist_submit",
  "waitlist_success",
]);

export async function POST(request: Request) {
  try {
    const consent = getConsentFromCookieHeader(request.headers.get("cookie"));
    if (!hasAnalyticsConsent(consent)) {
      return NextResponse.json({ ok: true });
    }

    const body = (await request.json()) as {
      event?: string;
      path?: string;
      metadata?: Record<string, unknown>;
    };

    const event = body.event?.trim();
    if (!event || !ALLOWED_EVENTS.has(event)) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { error } = await supabase.from("marketing_funnel_events").insert({
      event,
      path: body.path?.trim() || "/",
      metadata: (body.metadata ?? {}) as Json,
    });

    if (error) {
      console.error("marketing_funnel_events insert failed:", error);
      return NextResponse.json({ ok: false }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("waitlist-funnel route error:", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
