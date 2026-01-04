import { notFound } from "next/navigation";
import Link from "next/link";
import { verifyInvoiceToken } from "@/libs/bridge-invoice-tokens";
import { createAdminClient } from "@/libs/supabase/admin";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ session_id?: string }>;
}

export default async function BridgeInvoiceSuccessPage({ params, searchParams }: PageProps) {
  const { token } = await params;
  const search = await searchParams;
  
  // Verify token and get invoice details
  const verificationResult = await verifyInvoiceToken(token);
  
  if (!verificationResult.valid || !verificationResult.invoice) {
    notFound();
  }
  
  const { invoice } = verificationResult;
  
  // Get studio branding
  const supabase = createAdminClient();
  const { data: studio } = await supabase
    .from("studios")
    .select("name, settings")
    .eq("id", invoice.studioId)
    .single();
  
  const studioName = studio?.name || "Your Studio";
  const settings = (studio?.settings as any) || {};
  const primaryColor = settings.brand_color || "#3b82f6";
  
  // Format amount
  const formattedAmount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: invoice.currency.toUpperCase(),
  }).format(invoice.amountCents / 100);
  
  // Check actual payment status from DB
  // Note: webhook may not have processed yet, so we show "processing" if status is not yet "paid"
  const isPaid = invoice.status === "paid";
  
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-card shadow-lg rounded-lg p-8">
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
          
          <h2 className="text-2xl font-bold mb-2">
            {isPaid ? "Payment Successful!" : "Payment Processing"}
          </h2>
          
          <p className="text-muted-foreground">
            {isPaid
              ? "Your payment has been confirmed."
              : "Your payment is being processed. This should complete within a few moments."}
          </p>
        </div>
        
        {/* Payment Details */}
        <div className="bg-muted/30 rounded-lg p-6 mb-6">
          <div className="space-y-3">
            {invoice.description && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Description</span>
                <span className="font-medium text-right">{invoice.description}</span>
              </div>
            )}
            
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount Paid</span>
              <span className="font-bold text-lg">{formattedAmount}</span>
            </div>
            
            {search.session_id && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Payment ID</span>
                <span className="font-mono text-xs">{search.session_id.slice(0, 20)}...</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Next Steps */}
        <div className="space-y-4 mb-6">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
              1
            </div>
            <div>
              <p className="font-medium">Receipt Sent</p>
              <p className="text-sm text-muted-foreground">
                A receipt has been sent to your email address.
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
              2
            </div>
            <div>
              <p className="font-medium">Studio Notified</p>
              <p className="text-sm text-muted-foreground">
                {studioName} has been notified of your payment.
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
              3
            </div>
            <div>
              <p className="font-medium">Project Continues</p>
              <p className="text-sm text-muted-foreground">
                Work on your project will continue as planned.
              </p>
            </div>
          </div>
        </div>
        
        {/* CTA */}
        <div className="text-center pt-6 border-t">
          <p className="text-sm text-muted-foreground mb-4">
            Questions about this payment? Contact {studioName} directly.
          </p>
          
          <Link
            href={`/invoices/${token}`}
            className="inline-block px-6 py-2 text-sm font-medium rounded-lg border border-border hover:bg-muted transition-colors"
          >
            View Invoice
          </Link>
        </div>
      </div>
    </div>
  );
}




