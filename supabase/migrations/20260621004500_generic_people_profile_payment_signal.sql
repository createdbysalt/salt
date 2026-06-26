-- Normalize People Records payment rules away from provider-specific Stripe
-- language. Existing rules keep the legacy signal as a compatibility alias in
-- code, but authored blueprint rules should use the generic finance signal.

UPDATE public.playbook_blueprints
SET
  fill_rules = replace(
    replace(
      replace(
        fill_rules::text,
        '"id":"rel-stripe-client"',
        '"id":"rel-payment-client"'
      ),
      '"signal":"has_stripe_payment"',
      '"signal":"has_payment_received"'
    ),
    'Stripe payment evidence shows they paid you',
    'Finance evidence shows they paid you'
  )::jsonb,
  updated_at = now()
WHERE slug IN ('people-profile', 'people-records')
  AND fill_rules IS NOT NULL;

UPDATE public.playbook_blueprint_versions
SET fill_rules = replace(
  replace(
    replace(
      fill_rules::text,
      '"id":"rel-stripe-client"',
      '"id":"rel-payment-client"'
    ),
    '"signal":"has_stripe_payment"',
    '"signal":"has_payment_received"'
  ),
  'Stripe payment evidence shows they paid you',
  'Finance evidence shows they paid you'
)::jsonb
WHERE blueprint_slug IN ('people-profile', 'people-records')
  AND fill_rules IS NOT NULL;
