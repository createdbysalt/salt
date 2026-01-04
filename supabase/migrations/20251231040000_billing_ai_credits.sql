-- ============================================================================
-- BILLING: AI Credits system
-- ============================================================================
-- Implements the credit-based AI operations system with:
-- - Monthly credit allocations by tier (400/1200/4000)
-- - Purchasable credit packs (500/2500/10000)
-- - Purchased credits never expire
-- - Usage tracking for cost analysis
-- ============================================================================

-- AI Credit Balances (current state per user)
CREATE TABLE public.ai_credit_balances (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  monthly_allocation integer NOT NULL DEFAULT 400,
  purchased_credits integer NOT NULL DEFAULT 0,
  used_this_month integer NOT NULL DEFAULT 0,
  last_reset_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  CONSTRAINT positive_monthly_allocation CHECK (monthly_allocation >= 0),
  CONSTRAINT positive_purchased_credits CHECK (purchased_credits >= 0),
  CONSTRAINT positive_used_this_month CHECK (used_this_month >= 0)
);

-- Add computed column for total available credits
-- (monthly_allocation + purchased_credits - used_this_month)
ALTER TABLE public.ai_credit_balances
ADD COLUMN total_available integer GENERATED ALWAYS AS (
  monthly_allocation + purchased_credits - used_this_month
) STORED;

-- Enable RLS
ALTER TABLE public.ai_credit_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own credit balance"
  ON public.ai_credit_balances
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage credit balances"
  ON public.ai_credit_balances
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- AI Credit Usage (historical log)
CREATE TABLE public.ai_credit_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  operation_type text NOT NULL,
  credits_deducted integer NOT NULL,
  actual_api_cost_usd decimal(10, 4),
  metadata jsonb DEFAULT '{}'::jsonb,
  billing_month text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  CONSTRAINT positive_credits_deducted CHECK (credits_deducted > 0)
);

-- Enable RLS
ALTER TABLE public.ai_credit_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own credit usage"
  ON public.ai_credit_usage
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can log credit usage"
  ON public.ai_credit_usage
  FOR INSERT
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- Indexes for performance
CREATE INDEX idx_ai_credit_usage_user_id ON public.ai_credit_usage(user_id);
CREATE INDEX idx_ai_credit_usage_billing_month ON public.ai_credit_usage(billing_month);
CREATE INDEX idx_ai_credit_usage_user_month ON public.ai_credit_usage(user_id, billing_month);
CREATE INDEX idx_ai_credit_usage_created_at ON public.ai_credit_usage(created_at DESC);

-- AI Credit Purchases (credit pack sales)
CREATE TABLE public.ai_credit_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pack_size integer NOT NULL,
  amount_paid_cents integer NOT NULL,
  stripe_payment_intent_id text,
  stripe_checkout_session_id text,
  purchased_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  CONSTRAINT valid_pack_size CHECK (pack_size IN (500, 2500, 10000)),
  CONSTRAINT positive_amount CHECK (amount_paid_cents > 0)
);

-- Enable RLS
ALTER TABLE public.ai_credit_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own credit purchases"
  ON public.ai_credit_purchases
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can record credit purchases"
  ON public.ai_credit_purchases
  FOR INSERT
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- Indexes
CREATE INDEX idx_ai_credit_purchases_user_id ON public.ai_credit_purchases(user_id);
CREATE INDEX idx_ai_credit_purchases_purchased_at ON public.ai_credit_purchases(purchased_at DESC);
CREATE INDEX idx_ai_credit_purchases_stripe_session ON public.ai_credit_purchases(stripe_checkout_session_id);

-- Auto-create credit balance on user signup
CREATE OR REPLACE FUNCTION public.initialize_ai_credit_balance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.ai_credit_balances (user_id, monthly_allocation)
  VALUES (NEW.id, 400) -- Default to Solo tier allocation
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_user_created_initialize_credits
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.initialize_ai_credit_balance();

-- Function to deduct credits (called by AI operations)
CREATE OR REPLACE FUNCTION public.deduct_ai_credits(
  p_user_id uuid,
  p_credits integer,
  p_operation_type text,
  p_actual_cost_usd decimal DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_balance record;
  v_purchased_to_use integer;
  v_monthly_to_use integer;
  v_billing_month text;
BEGIN
  -- Get current balance
  SELECT * INTO v_balance
  FROM ai_credit_balances
  WHERE user_id = p_user_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User credit balance not found';
  END IF;
  
  -- Check if sufficient credits
  IF v_balance.total_available < p_credits THEN
    RETURN false;
  END IF;
  
  -- Deduct from purchased credits first
  v_purchased_to_use := LEAST(p_credits, v_balance.purchased_credits);
  v_monthly_to_use := p_credits - v_purchased_to_use;
  
  -- Update balance
  UPDATE ai_credit_balances
  SET
    purchased_credits = purchased_credits - v_purchased_to_use,
    used_this_month = used_this_month + v_monthly_to_use,
    updated_at = now()
  WHERE user_id = p_user_id;
  
  -- Log usage
  v_billing_month := to_char(now(), 'YYYY-MM');
  INSERT INTO ai_credit_usage (
    user_id,
    operation_type,
    credits_deducted,
    actual_api_cost_usd,
    billing_month,
    metadata
  ) VALUES (
    p_user_id,
    p_operation_type,
    p_credits,
    p_actual_cost_usd,
    v_billing_month,
    p_metadata
  );
  
  RETURN true;
END;
$$;

-- Function to add purchased credits
CREATE OR REPLACE FUNCTION public.add_purchased_credits(
  p_user_id uuid,
  p_credits integer
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE ai_credit_balances
  SET
    purchased_credits = purchased_credits + p_credits,
    updated_at = now()
  WHERE user_id = p_user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User credit balance not found';
  END IF;
END;
$$;

-- Function to reset monthly credits (called by cron on 1st of month)
CREATE OR REPLACE FUNCTION public.reset_monthly_ai_credits()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_reset_count integer;
BEGIN
  UPDATE ai_credit_balances
  SET
    used_this_month = 0,
    last_reset_at = now(),
    updated_at = now();
  
  GET DIAGNOSTICS v_reset_count = ROW_COUNT;
  RETURN v_reset_count;
END;
$$;

-- Comments
COMMENT ON TABLE public.ai_credit_balances IS 'Current AI credit balance per user (monthly allocation + purchased - used)';
COMMENT ON TABLE public.ai_credit_usage IS 'Historical log of all AI operations and credit deductions';
COMMENT ON TABLE public.ai_credit_purchases IS 'Record of credit pack purchases ($25/500, $100/2500, $350/10000)';
COMMENT ON COLUMN public.ai_credit_balances.monthly_allocation IS 'Monthly credit allocation based on tier: 400 (solo), 1200 (pro), 4000 (studio)';
COMMENT ON COLUMN public.ai_credit_balances.purchased_credits IS 'Credits from packs that never expire';
COMMENT ON COLUMN public.ai_credit_balances.used_this_month IS 'Credits used from monthly allocation this billing period';
COMMENT ON COLUMN public.ai_credit_balances.total_available IS 'Computed: monthly_allocation + purchased_credits - used_this_month';




