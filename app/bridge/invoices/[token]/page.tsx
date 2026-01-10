import { notFound, redirect } from "next/navigation";
import { verifyInvoiceToken } from "@/libs/bridge-invoice-tokens";
import { createAdminClient } from "@/libs/supabase/admin";
import { redirectToBridgeInvoiceCheckoutAction } from "@/app/actions/billing/redirect-actions";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ alreadyPaid?: string; error?: string }>;
}

/**
 * Public invoice payment page accessible via tokenized link
 * No authentication required - security is via the token
 * Path: /bridge/invoices/[token]
 */
export default async function BridgeInvoicePaymentPage({ params, searchParams }: PageProps) {
  const { token } = await params;
  const search = await searchParams;

  // Verify token and get invoice details
  const verificationResult = await verifyInvoiceToken(token);

  // Handle invalid/expired/revoked tokens
  if (!verificationResult.valid) {
    if (verificationResult.reason === "expired" || verificationResult.reason === "revoked") {
      redirect(`/bridge/invoices/${token}/expired`);
    }
    notFound();
  }

  const { invoice, token: tokenRecord } = verificationResult;

  if (!invoice) {
    notFound();
  }

  // Get studio branding for white-label experience
  const supabase = createAdminClient();
  const { data: studio } = await supabase
    .from("studios")
    .select("name, settings")
    .eq("id", invoice.studioId)
    .single();

  const studioName = studio?.name || "Your Studio";
  const settings = (studio?.settings as Record<string, unknown>) || {};
  const primaryColor = (settings.brand_color as string) || "#3b82f6";

  // Format amount for display
  const formattedAmount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: invoice.currency.toUpperCase(),
  }).format(invoice.amountCents / 100);

  // Check if invoice is already paid
  const isPaid = invoice.status === "paid";
  const isOverdue = invoice.dueDate && new Date(invoice.dueDate) < new Date() && !isPaid;

  // If paid, show read-only paid view
  if (isPaid) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-white shadow-lg rounded-lg p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold" style={{ color: primaryColor }}>
              {studioName}
            </h1>
          </div>

          {/* Paid Badge */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 rounded-full">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="font-semibold">Paid</span>
            </div>
          </div>

          {/* Invoice Details */}
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-4">Invoice Details</h2>
              <div className="space-y-2">
                {invoice.description && (
                  <div>
                    <p className="text-sm text-gray-500">Description</p>
                    <p className="text-base">{invoice.description}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-500">Amount</p>
                  <p className="text-2xl font-bold">{formattedAmount}</p>
                </div>
                {invoice.dueDate && (
                  <div>
                    <p className="text-sm text-gray-500">Due Date</p>
                    <p className="text-base">{new Date(invoice.dueDate).toLocaleDateString()}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-6 border-t">
              <p className="text-sm text-gray-500 text-center">
                This invoice has been paid. Thank you for your business!
              </p>
              <p className="text-xs text-gray-400 text-center mt-2">
                If you need assistance, please contact {studioName}.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Active invoice - show pay form
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const successUrl = `${baseUrl}/bridge/invoices/${token}/success`;
  const cancelUrl = `${baseUrl}/bridge/invoices/${token}`;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white shadow-lg rounded-lg p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold" style={{ color: primaryColor }}>
            {studioName}
          </h1>
          <p className="text-gray-500 mt-2">Invoice Payment</p>
        </div>

        {/* Error Messages */}
        {search.error === "checkout_failed" && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">
              Failed to create checkout session. Please try again or contact support.
            </p>
          </div>
        )}

        {search.error === "checkout_in_progress" && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              A checkout session is already in progress. Please complete it or wait for it to expire.
            </p>
          </div>
        )}

        {search.alreadyPaid && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">This invoice has already been paid.</p>
          </div>
        )}

        {/* Overdue Banner */}
        {isOverdue && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800 font-semibold">This invoice is past due.</p>
          </div>
        )}

        {/* Invoice Details */}
        <div className="space-y-6 mb-8">
          {invoice.description && (
            <div>
              <p className="text-sm text-gray-500">Description</p>
              <p className="text-base mt-1">{invoice.description}</p>
            </div>
          )}

          <div>
            <p className="text-sm text-gray-500">Amount Due</p>
            <p className="text-3xl font-bold mt-1">{formattedAmount}</p>
          </div>

          {invoice.dueDate && (
            <div>
              <p className="text-sm text-gray-500">Due Date</p>
              <p className="text-base mt-1">{new Date(invoice.dueDate).toLocaleDateString()}</p>
            </div>
          )}
        </div>

        {/* Payment Form */}
        <form action={redirectToBridgeInvoiceCheckoutAction} className="space-y-4">
          <input type="hidden" name="invoiceId" value={invoice.id} />
          <input type="hidden" name="token" value={token} />
          <input type="hidden" name="successUrl" value={successUrl} />
          <input type="hidden" name="cancelUrl" value={cancelUrl} />

          <button
            type="submit"
            disabled={tokenRecord?.spentForCheckout}
            className="w-full py-3 px-6 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
            style={{
              backgroundColor: primaryColor,
            }}
          >
            {tokenRecord?.spentForCheckout ? "Payment in Progress..." : "Pay Now"}
          </button>

          {tokenRecord?.spentForCheckout && (
            <p className="text-sm text-gray-500 text-center">
              A payment is already in progress. Please complete the checkout or wait for it to expire.
            </p>
          )}
        </form>

        {/* Secure Payment Badge */}
        <div className="mt-8 pt-6 border-t text-center">
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                clipRule="evenodd"
              />
            </svg>
            <span>Secure payment powered by Stripe</span>
          </div>
        </div>
      </div>
    </div>
  );
}
