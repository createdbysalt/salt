-- ============================================================================
-- BILLING: Extend profiles table for Stripe SaaS + Connect
-- ============================================================================
-- This migration adds Stripe billing fields to support:
-- 1. SaaS subscriptions (studio owners → Salt Core)
-- 2. Connect accounts (studio owners → their clients via The Bridge)
--
-- Compatible with existing ShipFast fields (customer_id, price_id, has_access)
-- ============================================================================

-- Add SaaS subscription fields
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS saas_subscription_id text,
ADD COLUMN IF NOT EXISTS saas_subscription_status text DEFAULT 'none',
ADD COLUMN IF NOT EXISTS saas_tier text DEFAULT 'none',
ADD COLUMN IF NOT EXISTS trial_ends_at timestamp with time zone;

-- Add Stripe Connect fields for client billing
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS stripe_connect_account_id text UNIQUE,
ADD COLUMN IF NOT EXISTS stripe_connect_status text DEFAULT 'not_created',
ADD COLUMN IF NOT EXISTS stripe_connect_charges_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS stripe_connect_payouts_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS stripe_connect_details_submitted boolean DEFAULT false;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_saas_subscription_id ON public.profiles(saas_subscription_id);
CREATE INDEX IF NOT EXISTS idx_profiles_saas_tier ON public.profiles(saas_tier);
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_connect_account_id ON public.profiles(stripe_connect_account_id);
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_connect_status ON public.profiles(stripe_connect_status);

-- Add constraints for valid values
ALTER TABLE public.profiles
ADD CONSTRAINT valid_saas_subscription_status CHECK (
  saas_subscription_status IN ('none', 'incomplete', 'incomplete_expired', 'trialing', 'active', 'past_due', 'canceled', 'unpaid')
);

ALTER TABLE public.profiles
ADD CONSTRAINT valid_saas_tier CHECK (
  saas_tier IN ('none', 'solo', 'professional', 'studio', 'enterprise')
);

ALTER TABLE public.profiles
ADD CONSTRAINT valid_stripe_connect_status CHECK (
  stripe_connect_status IN ('not_created', 'pending', 'active', 'restricted', 'disabled')
);

-- Add comments for documentation
COMMENT ON COLUMN public.profiles.saas_subscription_id IS 'Stripe subscription ID for studio owner Salt Core subscription';
COMMENT ON COLUMN public.profiles.saas_subscription_status IS 'Current status of Salt Core subscription (maps to Stripe subscription status)';
COMMENT ON COLUMN public.profiles.saas_tier IS 'Current subscription tier: solo, professional, studio, enterprise';
COMMENT ON COLUMN public.profiles.trial_ends_at IS 'When the trial period ends (Professional tier has 14-day trial)';
COMMENT ON COLUMN public.profiles.stripe_connect_account_id IS 'Stripe Express Connect account ID for studio to bill their clients';
COMMENT ON COLUMN public.profiles.stripe_connect_status IS 'Status of Stripe Connect account onboarding';
COMMENT ON COLUMN public.profiles.stripe_connect_charges_enabled IS 'Whether the Connect account can accept charges';
COMMENT ON COLUMN public.profiles.stripe_connect_payouts_enabled IS 'Whether the Connect account can receive payouts';
COMMENT ON COLUMN public.profiles.stripe_connect_details_submitted IS 'Whether the studio owner completed Connect onboarding';



