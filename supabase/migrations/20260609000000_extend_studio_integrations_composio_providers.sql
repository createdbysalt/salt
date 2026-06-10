-- Extend studio_integrations providers for Composio-managed OAuth (Gmail, Google Calendar)

ALTER TABLE public.studio_integrations
  DROP CONSTRAINT IF EXISTS studio_integrations_provider_check;

ALTER TABLE public.studio_integrations
  ADD CONSTRAINT studio_integrations_provider_check
  CHECK (provider IN ('calcom', 'fireflies', 'gmail', 'googlecalendar'));

COMMENT ON COLUMN public.studio_integrations.composio_connection_id IS
  'Composio connected account ID for OAuth-managed integrations';
COMMENT ON COLUMN public.studio_integrations.composio_status IS
  'Composio connection lifecycle: connected | pending | expired | error';
