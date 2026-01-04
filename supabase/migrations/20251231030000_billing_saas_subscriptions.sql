-- ============================================================================
-- BILLING: SaaS subscriptions history
-- ============================================================================
-- Track subscription lifecycle for studio owners (Salt Core subscriptions)
-- Complements the current subscription fields in profiles table
-- ============================================================================

CREATE TABLE public.saas_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_subscription_id text NOT NULL,
  stripe_customer_id text NOT NULL,
  tier text NOT NULL,
  status text NOT NULL,
  price_id text NOT NULL,
  interval text NOT NULL,
  current_period_start timestamp with time zone NOT NULL,
  current_period_end timestamp with time zone NOT NULL,
  cancel_at_period_end boolean DEFAULT false,
  canceled_at timestamp with time zone,
  trial_start timestamp with time zone,
  trial_end timestamp with time zone,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  CONSTRAINT valid_tier CHECK (tier IN ('solo', 'professional', 'studio', 'enterprise')),
  CONSTRAINT valid_status CHECK (
    status IN ('incomplete', 'incomplete_expired', 'trialing', 'active', 'past_due', 'canceled', 'unpaid')
  ),
  CONSTRAINT valid_interval CHECK (interval IN ('month', 'year'))
);

-- Enable RLS
ALTER TABLE public.saas_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can view their own subscription history
CREATE POLICY "Users can view own subscription history"
  ON public.saas_subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can manage subscriptions (webhooks)
CREATE POLICY "Service role can manage subscriptions"
  ON public.saas_subscriptions
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Indexes for performance
CREATE INDEX idx_saas_subscriptions_user_id ON public.saas_subscriptions(user_id);
CREATE INDEX idx_saas_subscriptions_stripe_subscription_id ON public.saas_subscriptions(stripe_subscription_id);
CREATE INDEX idx_saas_subscriptions_status ON public.saas_subscriptions(status);
CREATE INDEX idx_saas_subscriptions_tier ON public.saas_subscriptions(tier);
CREATE INDEX idx_saas_subscriptions_current_period_end ON public.saas_subscriptions(current_period_end);

-- Partial index for active subscriptions
CREATE INDEX idx_saas_subscriptions_active ON public.saas_subscriptions(user_id, current_period_end)
  WHERE status IN ('active', 'trialing');

COMMENT ON TABLE public.saas_subscriptions IS 'Historical record of all Salt Core subscriptions for studio owners';
COMMENT ON COLUMN public.saas_subscriptions.tier IS 'Subscription tier: solo, professional, studio, enterprise';
COMMENT ON COLUMN public.saas_subscriptions.interval IS 'Billing interval: month or year';
COMMENT ON COLUMN public.saas_subscriptions.cancel_at_period_end IS 'Whether subscription will cancel at end of current period (downgrade scheduled)';




