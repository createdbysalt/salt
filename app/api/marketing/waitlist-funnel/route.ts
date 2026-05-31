import { NextResponse } from "next/server";
import { createAdminClient } from "@/app/_lib/supabase/admin";

const ALLOWED_EVENTS = new Set([
  "homepage_view",
  "waitlist_submit",
  "waitlist_success",
]);

export async function POST(request: Request) {
  try {
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
      metadata: body.metadata ?? {},
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
