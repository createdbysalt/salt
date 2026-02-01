/**
 * PaymentCheckout Component
 *
 * Embedded Stripe Checkout for proposal deposit payments.
 * Uses Stripe Elements EmbeddedCheckout on the studio's Connect account.
 *
 * @see https://docs.stripe.com/payments/accept-a-payment?platform=web&ui=embedded-checkout
 */

"use client";

import { useState, useCallback, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout,
} from "@stripe/react-stripe-js";
import { createCheckoutSession } from "../actions";
import type { StripeCheckoutSession } from "../types";

/**
 * Props for PaymentCheckout component
 */
export interface PaymentCheckoutProps {
  /** Proposal ID to create payment for */
  proposalId: string;
  /** Deposit amount in dollars (for display) */
  depositAmount: number;
  /** Currency code (default: USD) */
  currency?: string;
  /** Proposal/project title */
  title: string;
  /** Studio name (for display) */
  studioName: string;
  /** Callback when payment completes successfully */
  onPaymentSuccess?: () => void;
  /** Callback when payment fails or is cancelled */
  onPaymentError?: (error: string) => void;
}

/**
 * Component states
 */
type CheckoutState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; session: StripeCheckoutSession }
  | { status: "error"; message: string };

/**
 * Format currency amount for display
 */
function formatCurrency(amount: number, currency: string = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount);
}

/**
 * PaymentCheckout - Embedded Stripe Checkout for proposal deposits
 *
 * Displays after a proposal has been signed. Shows the deposit amount
 * and embeds Stripe's checkout form for payment collection.
 */
export function PaymentCheckout({
  proposalId,
  depositAmount,
  currency = "USD",
  title,
  studioName,
  onPaymentSuccess,
  onPaymentError,
}: PaymentCheckoutProps) {
  const [state, setState] = useState<CheckoutState>({ status: "idle" });
  const [stripePromise, setStripePromise] = useState<ReturnType<
    typeof loadStripe
  > | null>(null);

  /**
   * Initialize checkout session when component mounts
   */
  const initializeCheckout = useCallback(async () => {
    setState({ status: "loading" });

    try {
      const result = await createCheckoutSession(proposalId);

      if (!result.ok) {
        const errorMessage = result.message || "Failed to initialize checkout";
        setState({ status: "error", message: errorMessage });
        onPaymentError?.(errorMessage);
        return;
      }

      const session = result.data;

      // Load Stripe with the connected account
      // The stripeAccount option connects to the studio owner's account
      const stripe = loadStripe(session.publishable_key, {
        stripeAccount: session.connected_account_id,
      });

      setStripePromise(stripe);
      setState({ status: "ready", session });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An unexpected error occurred";
      setState({ status: "error", message: errorMessage });
      onPaymentError?.(errorMessage);
    }
  }, [proposalId, onPaymentError]);

  /**
   * Auto-initialize on mount
   */
  useEffect(() => {
    initializeCheckout();
  }, [initializeCheckout]);

  /**
   * Handle checkout completion
   */
  const handleComplete = useCallback(() => {
    onPaymentSuccess?.();
  }, [onPaymentSuccess]);

  // Loading state
  if (state.status === "idle" || state.status === "loading") {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="flex flex-col items-center justify-center space-y-4 py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">
            Preparing secure checkout...
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (state.status === "error") {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6">
        <div className="flex flex-col items-center space-y-4 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/20">
            <svg
              className="h-6 w-6 text-destructive"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-destructive">
              Payment Unavailable
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">{state.message}</p>
          </div>
          <button
            onClick={initializeCheckout}
            className="mt-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Ready state - show embedded checkout
  const checkoutOptions = {
    clientSecret: state.session.client_secret,
    onComplete: handleComplete,
  };

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      {/* Payment header */}
      <div className="border-b border-border bg-muted/30 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-foreground">Complete Payment</h3>
            <p className="text-sm text-muted-foreground">
              Deposit for {title}
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-foreground">
              {formatCurrency(depositAmount, currency)}
            </p>
            <p className="text-xs text-muted-foreground">
              Paid to {studioName}
            </p>
          </div>
        </div>
      </div>

      {/* Stripe Embedded Checkout */}
      <div className="p-0">
        {stripePromise && (
          <EmbeddedCheckoutProvider
            stripe={stripePromise}
            options={checkoutOptions}
          >
            <EmbeddedCheckout className="min-h-[400px]" />
          </EmbeddedCheckoutProvider>
        )}
      </div>

      {/* Security footer */}
      <div className="border-t border-border bg-muted/30 px-6 py-3">
        <div className="flex items-center justify-center space-x-2 text-xs text-muted-foreground">
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
          <span>Secured by Stripe. Your payment information is encrypted.</span>
        </div>
      </div>
    </div>
  );
}

export default PaymentCheckout;
