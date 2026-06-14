-- Stripe joins the Composio connector family.
-- Idempotent: skip when a later full-catalog constraint is already in place.

DO $$
DECLARE
  condef text;
BEGIN
  SELECT pg_get_constraintdef(oid) INTO condef
  FROM pg_constraint
  WHERE conrelid = 'public.workspace_integrations'::regclass
    AND conname IN (
      'workspace_integrations_provider_check',
      'studio_integrations_provider_check'
    )
  LIMIT 1;

  IF condef IS NOT NULL AND condef LIKE '%stripe%' AND condef LIKE '%quickbooks%' THEN
    RAISE NOTICE 'workspace_integrations provider check already includes Stripe — skipping';
    RETURN;
  END IF;

  ALTER TABLE public.workspace_integrations
    DROP CONSTRAINT IF EXISTS studio_integrations_provider_check;

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
END $$;
