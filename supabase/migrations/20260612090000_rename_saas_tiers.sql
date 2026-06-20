-- SaaS tier rename (product decision 2026-06-12):
--   solo → starter, professional → pro, studio → max, enterprise unchanged.
-- Remaps any stored values and updates both check constraints.

-- profiles.saas_tier
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS valid_saas_tier;

UPDATE public.profiles
SET saas_tier = CASE saas_tier
  WHEN 'solo' THEN 'starter'
  WHEN 'professional' THEN 'pro'
  WHEN 'studio' THEN 'max'
  ELSE saas_tier
END
WHERE saas_tier IN ('solo', 'professional', 'studio');

ALTER TABLE public.profiles
  ADD CONSTRAINT valid_saas_tier CHECK (
    saas_tier IN ('none', 'starter', 'pro', 'max', 'enterprise')
  );

COMMENT ON COLUMN public.profiles.saas_tier IS 'Current subscription tier: starter, pro, max, enterprise';

-- saas_subscriptions.tier
ALTER TABLE public.saas_subscriptions
  DROP CONSTRAINT IF EXISTS valid_tier;

UPDATE public.saas_subscriptions
SET tier = CASE tier
  WHEN 'solo' THEN 'starter'
  WHEN 'professional' THEN 'pro'
  WHEN 'studio' THEN 'max'
  ELSE tier
END
WHERE tier IN ('solo', 'professional', 'studio');

ALTER TABLE public.saas_subscriptions
  ADD CONSTRAINT valid_tier CHECK (
    tier IN ('starter', 'pro', 'max', 'enterprise')
  );

COMMENT ON COLUMN public.saas_subscriptions.tier IS 'Subscription tier: starter, pro, max, enterprise';
