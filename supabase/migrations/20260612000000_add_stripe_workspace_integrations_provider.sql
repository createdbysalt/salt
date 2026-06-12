-- Stripe joins the Composio connector family (user's own Stripe account via
-- API key). Replaces the native Stripe Connect Express integration as the
-- user-facing Stripe connector; Salt SaaS billing is unaffected.
-- Extends the provider check constraint on workspace_integrations.

ALTER TABLE public.workspace_integrations
  DROP CONSTRAINT IF EXISTS workspace_integrations_provider_check;

ALTER TABLE public.workspace_integrations
  ADD CONSTRAINT workspace_integrations_provider_check
  CHECK (provider IN (
    'calcom',
    'fireflies',
    'gmail',
    'googlecalendar',
    'googledrive',
    'googledocs',
    'googlesheets',
    'googleslides',
    'stripe'
  ));
