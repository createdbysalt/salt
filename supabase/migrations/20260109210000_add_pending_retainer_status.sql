-- ============================================================================
-- Add pending status for retainers before client completes payment
-- ============================================================================
-- Allows creating a retainer record immediately when studio owner sets it up,
-- before the client completes the Stripe checkout
-- ============================================================================

-- Allow nullable stripe IDs for pending subscriptions
ALTER TABLE public.bridge_client_subscriptions
  ALTER COLUMN stripe_subscription_id DROP NOT NULL,
  ALTER COLUMN stripe_customer_id DROP NOT NULL,
  ALTER COLUMN current_period_start DROP NOT NULL,
  ALTER COLUMN current_period_end DROP NOT NULL;

-- Add checkout session ID column
ALTER TABLE public.bridge_client_subscriptions
  ADD COLUMN IF NOT EXISTS stripe_checkout_session_id text;

-- Update status constraint to include 'pending'
ALTER TABLE public.bridge_client_subscriptions
  DROP CONSTRAINT IF EXISTS valid_status;

ALTER TABLE public.bridge_client_subscriptions
  ADD CONSTRAINT valid_status CHECK (
    status IN ('pending', 'incomplete', 'incomplete_expired', 'trialing', 'active', 'past_due', 'canceled', 'unpaid')
  );

-- Index for checkout session lookups
CREATE INDEX IF NOT EXISTS idx_bridge_client_subs_checkout_session
  ON public.bridge_client_subscriptions(stripe_checkout_session_id);

-- Comment
COMMENT ON COLUMN public.bridge_client_subscriptions.stripe_checkout_session_id IS 'Stripe Checkout session ID for pending subscriptions';
COMMENT ON COLUMN public.bridge_client_subscriptions.status IS 'Subscription status: pending (awaiting payment), then Stripe statuses';
