/**
 * Payments Feature - Server Actions
 *
 * Server actions for proposal payment processing.
 * Uses Stripe Connect embedded checkout for proposal deposits.
 */

"use server";

import { z } from "zod";
import { createClient } from "@/app/_lib/supabase/server";
import { getStripeClient } from "@/app/_lib/stripe/stripe-client";
import type {
  CreateCheckoutSessionInput,
  StripeCheckoutSession,
  PaymentMetadata,
} from "./types";

// Input validation schemas
const ProposalIdSchema = z.string().uuid("Invalid proposal ID format");

/**
 * Result type for server actions
 */
type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; errorCode: string; message: string };

function success<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

function error(errorCode: string, message: string): ActionResult<never> {
  return { ok: false, errorCode, message };
}

/**
 * Create Stripe Checkout session for proposal deposit payment
 *
 * Uses embedded checkout mode on the studio's Connect account.
 * Money goes directly to studio owner (0% platform fee).
 *
 * @param proposalId - The proposal UUID to create payment for
 * @returns Checkout session with client_secret for embedded checkout
 */
export async function createCheckoutSession(
  proposalId: string
): Promise<ActionResult<StripeCheckoutSession>> {
  try {
    // Validate input format to prevent injection
    const validationResult = ProposalIdSchema.safeParse(proposalId);
    if (!validationResult.success) {
      return error("INVALID_INPUT", "Invalid proposal ID format");
    }

    const supabase = await createClient();

    // Fetch proposal with studio relationship to get Connect account
    const { data: proposal, error: proposalError } = await supabase
      .from("proposals")
      .select(
        `
        id,
        studio_id,
        client_id,
        title,
        deposit_amount,
        deposit_paid,
        currency,
        status,
        signed_at,
        clients!inner (
          contact_email,
          display_name
        ),
        studios!inner (
          id,
          name,
          owner_id
        )
      `
      )
      .eq("id", proposalId)
      .single();

    if (proposalError || !proposal) {
      return error("PROPOSAL_NOT_FOUND", "Proposal not found");
    }

    // Validate proposal state
    if (proposal.status !== "accepted") {
      return error(
        "INVALID_STATE",
        "Proposal must be accepted before payment"
      );
    }

    if (!proposal.signed_at) {
      return error("NOT_SIGNED", "Proposal must be signed before payment");
    }

    if (proposal.deposit_paid) {
      return error("ALREADY_PAID", "Deposit has already been paid");
    }

    if (!proposal.deposit_amount || proposal.deposit_amount <= 0) {
      return error("NO_DEPOSIT", "No deposit amount specified");
    }

    // Get studio owner's Connect account
    const { data: ownerProfile, error: profileError } = await supabase
      .from("profiles")
      .select(
        "stripe_connect_account_id, stripe_connect_charges_enabled"
      )
      .eq("id", (proposal.studios as any).owner_id)
      .single();

    if (profileError || !ownerProfile) {
      return error("OWNER_NOT_FOUND", "Workspace owner not found");
    }

    if (!ownerProfile.stripe_connect_account_id) {
      return error(
        "NO_CONNECT_ACCOUNT",
        "Studio has not set up payment processing"
      );
    }

    if (!ownerProfile.stripe_connect_charges_enabled) {
      return error(
        "CONNECT_NOT_READY",
        "Studio payment processing is not yet enabled"
      );
    }

    const stripe = getStripeClient();
    const connectedAccountId = ownerProfile.stripe_connect_account_id;

    // Convert deposit_amount from dollars to cents
    const amountCents = Math.round(Number(proposal.deposit_amount) * 100);
    const currency = (proposal.currency || "USD").toLowerCase();

    // Build payment metadata for webhook processing
    const metadata: PaymentMetadata = {
      proposal_id: proposal.id,
      studio_id: proposal.studio_id,
      client_id: proposal.client_id,
      payment_type: "deposit",
    };

    // Determine URLs for redirect (used as fallback)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const successUrl = `${baseUrl}/proposal/${proposalId}/payment-success`;
    const cancelUrl = `${baseUrl}/proposal/${proposalId}`;

    // Create embedded Stripe Checkout session on connected account
    const session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        ui_mode: "embedded",
        customer_email: (proposal.clients as any).contact_email,
        line_items: [
          {
            price_data: {
              currency,
              product_data: {
                name: `Deposit - ${proposal.title}`,
                description: `Project deposit for ${(proposal.studios as any).name}`,
              },
              unit_amount: amountCents,
            },
            quantity: 1,
          },
        ],
        payment_intent_data: {
          application_fee_amount: 0, // 0% platform fee
          metadata: metadata as unknown as Record<string, string>,
        },
        return_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
        metadata: metadata as unknown as Record<string, string>,
      },
      {
        stripeAccount: connectedAccountId,
      }
    );

    if (!session.client_secret) {
      return error(
        "SESSION_ERROR",
        "Failed to create checkout session"
      );
    }

    // Return session data for embedded checkout
    const result: StripeCheckoutSession = {
      session_id: session.id,
      client_secret: session.client_secret,
      publishable_key: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "",
      connected_account_id: connectedAccountId,
    };

    return success(result);
  } catch (err: any) {
    console.error("createCheckoutSession error:", err);

    // Handle Stripe-specific errors
    if (err.type === "StripeCardError") {
      return error("CARD_ERROR", err.message || "Card error");
    }
    if (err.type === "StripeInvalidRequestError") {
      return error("INVALID_REQUEST", "Invalid payment request");
    }

    return error("CHECKOUT_ERROR", "Failed to create checkout session");
  }
}

/**
 * Get payment status for a proposal
 *
 * @param proposalId - The proposal UUID
 * @returns Payment status information
 */
export async function getProposalPaymentStatus(
  proposalId: string
): Promise<
  ActionResult<{
    deposit_paid: boolean;
    deposit_amount: number | null;
    deposit_paid_at: string | null;
    stripe_payment_intent_id: string | null;
  }>
> {
  try {
    const supabase = await createClient();

    const { data: proposal, error: proposalError } = await supabase
      .from("proposals")
      .select(
        "deposit_paid, deposit_amount, deposit_paid_at, stripe_payment_intent_id"
      )
      .eq("id", proposalId)
      .single();

    if (proposalError || !proposal) {
      return error("PROPOSAL_NOT_FOUND", "Proposal not found");
    }

    return success({
      deposit_paid: proposal.deposit_paid || false,
      deposit_amount: proposal.deposit_amount
        ? Number(proposal.deposit_amount)
        : null,
      deposit_paid_at: proposal.deposit_paid_at || null,
      stripe_payment_intent_id: proposal.stripe_payment_intent_id || null,
    });
  } catch (err: any) {
    console.error("getProposalPaymentStatus error:", err);
    return error("STATUS_ERROR", "Failed to get payment status");
  }
}
