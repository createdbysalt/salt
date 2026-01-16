import { NextResponse, NextRequest } from "next/server";
import { createClient } from "@/app/_lib/supabase/server";
import { createCustomerPortal } from "@/app/_lib/stripe/stripe";
import { safeSameOriginAbsoluteUrl } from "@/app/_lib/security/safe-url";

export async function POST(req: NextRequest) {
  try {
    const requestUrl = new URL(req.url);
    const supabase = await createClient();

    const body = await req.json();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    // User who are not logged in can't make a purchase
    if (!user) {
      return NextResponse.json(
        { error: "You must be logged in to view billing information." },
        { status: 401 }
      );
    } else if (!body.returnUrl) {
      return NextResponse.json(
        { error: "Return URL is required" },
        { status: 400 }
      );
    }

    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user?.id)
      .single();

    if (!data?.customer_id) {
      return NextResponse.json(
        {
          error: "You don't have a billing account yet. Make a purchase first.",
        },
        { status: 400 }
      );
    }

    const returnUrl = safeSameOriginAbsoluteUrl(body.returnUrl, requestUrl.origin);
    if (!returnUrl) {
      return NextResponse.json(
        { error: "Invalid return URL" },
        { status: 400 }
      );
    }

    const stripePortalUrl = await createCustomerPortal({
      customerId: data.customer_id,
      returnUrl,
    });

    return NextResponse.json({
      url: stripePortalUrl,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
