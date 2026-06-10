import { createCheckout } from "@/app/_lib/stripe/stripe";
import { isAllowedLegacyCheckoutPriceId } from "@/app/_lib/stripe/checkout-allowlist";
import { safeSameOriginAbsoluteUrl } from "@/app/_lib/security/safe-url";
import { createClient } from "@/app/_lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * Legacy Stripe Checkout API route.
 * Prefer server actions; this route only accepts allowlisted price IDs.
 */
export async function POST(req: NextRequest) {
  const requestUrl = new URL(req.url);
  const body = await req.json();

  if (!body.priceId) {
    return NextResponse.json(
      { error: "Price ID is required" },
      { status: 400 },
    );
  } else if (!body.successUrl || !body.cancelUrl) {
    return NextResponse.json(
      { error: "Success and cancel URLs are required" },
      { status: 400 },
    );
  } else if (!body.mode) {
    return NextResponse.json(
      {
        error:
          "Mode is required (either 'payment' for one-time payments or 'subscription' for recurring subscription)",
      },
      { status: 400 },
    );
  }

  if (!isAllowedLegacyCheckoutPriceId(body.priceId)) {
    return NextResponse.json({ error: "Invalid price ID" }, { status: 400 });
  }

  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { priceId, mode } = body;
    const successUrl = safeSameOriginAbsoluteUrl(body.successUrl, requestUrl.origin);
    const cancelUrl = safeSameOriginAbsoluteUrl(body.cancelUrl, requestUrl.origin);

    if (!successUrl || !cancelUrl) {
      return NextResponse.json(
        { error: "Invalid return URL" },
        { status: 400 },
      );
    }

    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user?.id)
      .single();

    const stripeSessionURL = await createCheckout({
      priceId,
      mode,
      successUrl,
      cancelUrl,
      clientReferenceId: user?.id,
      user: {
        email: data?.email,
        customerId: data?.customer_id,
      },
    });

    return NextResponse.json({ url: stripeSessionURL });
  } catch (e: unknown) {
    console.error(e);
    const message = e instanceof Error ? e.message : "An unknown error occurred";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
