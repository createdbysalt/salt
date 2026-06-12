-- Phase 1B connectors: Google Drive, Docs, Sheets, Slides via Composio.
-- Extends the provider check constraint on workspace_integrations
-- (constraint name predates the studios → workspaces rename).

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
