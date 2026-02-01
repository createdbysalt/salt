/**
 * Payments Feature - Types
 *
 * Types for proposal payments, milestones, and Stripe checkout sessions.
 * Aligns with proposals table schema.
 */

/**
 * Payment milestone status
 */
export type PaymentMilestoneStatus = "pending" | "paid" | "overdue" | "cancelled";

/**
 * Payment milestone within a proposal payment schedule
 * Matches proposals.payment_schedule JSONB structure
 */
export interface PaymentMilestone {
  id: string;
  amount: number;
  due_date: string;
  description: string;
  status: PaymentMilestoneStatus;
  paid_at?: string;
  stripe_payment_intent_id?: string;
}

/**
 * Payment schedule for a proposal
 * Array of milestones representing the payment plan
 */
export type PaymentSchedule = PaymentMilestone[];

/**
 * Stripe Checkout session configuration
 */
export interface StripeCheckoutSession {
  session_id: string;
  client_secret: string;
  publishable_key: string;
  connected_account_id: string;
}

/**
 * Input for creating a checkout session
 */
export interface CreateCheckoutSessionInput {
  proposal_id: string;
  amount_cents: number;
  description: string;
  customer_email: string;
  success_url: string;
  cancel_url: string;
}

/**
 * Result of creating a checkout session
 */
export interface CreateCheckoutSessionResult {
  success: true;
  session: StripeCheckoutSession;
}

/**
 * Payment intent metadata attached to Stripe payments
 */
export interface PaymentMetadata {
  proposal_id: string;
  studio_id: string;
  client_id: string;
  payment_type: "deposit" | "milestone";
  milestone_id?: string;
}

/**
 * Proposal payment state (subset of proposal for payment context)
 */
export interface ProposalPaymentState {
  id: string;
  public_id: string;
  studio_id: string;
  client_id: string;
  title: string;
  total_amount: number;
  currency: string;
  deposit_amount: number | null;
  deposit_paid: boolean;
  deposit_paid_at: string | null;
  stripe_payment_intent_id: string | null;
  payment_schedule: PaymentSchedule;
  status: "draft" | "sent" | "viewed" | "accepted" | "declined" | "expired";
  signed_at: string | null;
}

/**
 * Payment success webhook payload
 */
export interface PaymentSuccessPayload {
  payment_intent_id: string;
  amount: number;
  metadata: PaymentMetadata;
}
