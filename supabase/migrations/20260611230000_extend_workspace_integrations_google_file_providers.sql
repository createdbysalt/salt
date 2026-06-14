-- Phase 1B connectors: Google Drive, Docs, Sheets, Slides via Composio.
-- Idempotent: staging may already have the full catalog from
-- 20260612190000_fix_workspace_integrations_provider_check (applied out-of-order).

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

  IF condef IS NOT NULL AND condef LIKE '%googledrive%' THEN
    RAISE NOTICE 'workspace_integrations provider check already includes Google file providers — skipping';
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
      'googleslides'
    ));
END $$;
