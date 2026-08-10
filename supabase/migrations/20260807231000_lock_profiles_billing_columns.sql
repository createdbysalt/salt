-- Lock billing/entitlement columns on profiles (metering tamper audit, Sources
-- plan Phase 0.5).
--
-- Before this migration:
--   * "Users can update own profile" had USING but no WITH CHECK.
--   * authenticated held table-wide UPDATE (20260630190000), so a user could
--     PATCH their own saas_tier / has_access / customer_id via PostgREST.
--     Cosmetic today (capacity reads workspace_subscriptions) but a write
--     users must not have.
--
-- All production writes to the locked columns come from the Stripe webhook as
-- service_role; no user-facing code updates them (audited 2026-08-07:
-- profile-actions.ts, user settings route, theme settings — all their columns
-- are in the grant list below).

-- 1. The self-update policy also constrains the NEW row.
ALTER POLICY "Users can update own profile" ON public.profiles
  WITH CHECK (auth.uid() = id);

-- 2. Column-level UPDATE: revoke blanket UPDATE, grant back only user-editable
--    profile fields. Locked to service_role: id, created_at, customer_id,
--    has_access, price_id, saas_tier, saas_subscription_id,
--    saas_subscription_status, trial_ends_at, stripe_connect_account_id,
--    stripe_connect_charges_enabled, stripe_connect_details_submitted,
--    stripe_connect_payouts_enabled, stripe_connect_status. (full_name is a
--    generated column and cannot be granted UPDATE.)
REVOKE UPDATE ON public.profiles FROM authenticated;

GRANT UPDATE (
  address_line_1,
  address_line_2,
  avatar_url,
  city,
  company_name,
  country,
  current_focus,
  display_name,
  email,
  email_signature,
  first_name,
  gender,
  job_title,
  last_name,
  last_seen_at,
  location,
  phone,
  postal_code,
  preferred_contact_method,
  preferred_name,
  professional_credentials,
  reduced_motion,
  role_title,
  state,
  tagline,
  timezone,
  ui_theme,
  updated_at,
  working_hours
) ON public.profiles TO authenticated;
