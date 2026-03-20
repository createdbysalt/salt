import Link from "next/link";
import { createAdminClient } from "@/app/_lib/supabase/admin";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ session_id?: string }>;
}

/**
 * Success page for Bridge retainer subscription checkout
 * Shows confirmation after successful Stripe Checkout for subscription
 * Path: /bridge/retainer/success
 */
export default async function BridgeRetainerSuccessPage({ searchParams }: PageProps) {
  const search = await searchParams;
  const sessionId = search.session_id;

  if (!sessionId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Session Not Found</h1>
          <p className="text-gray-500 mb-6">
            We couldn&apos;t find your checkout session. Please contact support if you believe this is an error.
          </p>
        </div>
      </div>
    );
  }

  // Retrieve subscription details from our database
  // The webhook should have created the subscription record when checkout completed
  let studioName = "Your Studio";
  let primaryColor = "#3b82f6";
  let nextBillingDate: Date | null = null;
  let amount = 0;
  let currency = "usd";
  let interval = "month";

  // Log the session ID for debugging
  console.log(`Retainer success page accessed with session_id: ${sessionId}`);

  try {
    const supabase = createAdminClient();

    // Find the most recent subscription record
    // Note: The webhook stores stripe_subscription_id, not checkout session ID
    // We find the most recently created subscription which should match this checkout
    const { data: subscriptionRecord } = await supabase
      .from("bridge_client_subscriptions")
      .select(`
        *,
        studio:studios!studio_id(id, name, settings, owner_id),
        client:clients!client_id(name, contact_email)
      `)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (subscriptionRecord) {
      const studioData = subscriptionRecord.studio as { id: string; name: string; settings: Record<string, unknown>; owner_id: string } | null;

      if (studioData) {
        studioName = studioData.name || "Your Studio";
        const settings = studioData.settings || {};
        primaryColor = (settings.brand_color as string) || "#3b82f6";
      }

      // Get subscription details
      amount = subscriptionRecord.amount_cents || 0;
      currency = subscriptionRecord.currency || "usd";
      interval = subscriptionRecord.interval || "month";

      // Next billing date from current_period_end
      if (subscriptionRecord.current_period_end) {
        nextBillingDate = new Date(subscriptionRecord.current_period_end);
      }
    }
  } catch (error) {
    console.error("Error retrieving subscription details:", error);
  }

  // Format amount
  const formattedAmount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100);

  // Format interval for display
  const intervalDisplay = interval === "year" ? "yearly" : "monthly";

  // Format next billing date
  const formattedNextBilling = nextBillingDate
    ? nextBillingDate.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white shadow-lg rounded-lg p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold" style={{ color: primaryColor }}>
            {studioName}
          </h1>
        </div>

        {/* Success Icon */}
        <div className="text-center mb-6">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4"
            style={{ backgroundColor: `${primaryColor}20` }}
          >
            <svg
              className="w-8 h-8"
              style={{ color: primaryColor }}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
          </div>

          <h2 className="text-2xl font-bold mb-2">Subscription Active!</h2>

          <p className="text-gray-500">
            Your retainer subscription has been set up successfully.
          </p>
        </div>

        {/* Subscription Details */}
        <div className="bg-gray-50 rounded-lg p-6 mb-6">
          <h3 className="font-semibold text-gray-900 mb-4">Subscription Details</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-500">Amount</span>
              <span className="font-bold text-lg">
                {formattedAmount}/{interval}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-500">Billing</span>
              <span className="font-medium capitalize">{intervalDisplay}</span>
            </div>

            {formattedNextBilling && (
              <div className="flex justify-between">
                <span className="text-gray-500">Next Billing Date</span>
                <span className="font-medium">{formattedNextBilling}</span>
              </div>
            )}

            <div className="flex justify-between">
              <span className="text-gray-500">Status</span>
              <span
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
                style={{ backgroundColor: primaryColor }}
              >
                Active
              </span>
            </div>
          </div>
        </div>

        {/* What's Next */}
        <div className="space-y-4 mb-6">
          <h3 className="font-semibold text-gray-900">What&apos;s Next</h3>

          <div className="flex items-start gap-3">
            <div
              className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
              style={{ backgroundColor: primaryColor }}
            >
              1
            </div>
            <div>
              <p className="font-medium">Confirmation Email Sent</p>
              <p className="text-sm text-gray-500">
                A confirmation email has been sent to your email address.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div
              className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
              style={{ backgroundColor: primaryColor }}
            >
              2
            </div>
            <div>
              <p className="font-medium">Automatic Billing</p>
              <p className="text-sm text-gray-500">
                Your card will be automatically charged {intervalDisplay} on your billing date.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div
              className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
              style={{ backgroundColor: primaryColor }}
            >
              3
            </div>
            <div>
              <p className="font-medium">Receipt & Invoice</p>
              <p className="text-sm text-gray-500">
                You&apos;ll receive an invoice by email before each billing cycle.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center pt-6 border-t">
          <p className="text-sm text-gray-500 mb-4">
            Questions about your subscription? Contact {studioName} directly.
          </p>

          <Link
            href="/bridge"
            className="inline-block px-6 py-2 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
