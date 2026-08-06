-- Capture-pipeline repair Phase 5: DB-driven webhook routing.
--
-- The plan assumed connector_catalog.category could route webhooks to a
-- category adapter, but that column holds Composio's marketplace category
-- ("recommended", "files", "payments", ...) and is overwritten by the nightly
-- catalog sync. The Salt capture taxonomy (email/calendar/billing/...) that
-- selects the normalizer adapter only lived in code
-- (unified-connector-registry.ts). This makes it a DB fact, on
-- connector_overrides — the Salt-curated table the sync never touches.
--
-- Routing becomes: trigger_slug → connector_trigger_types.toolkit_slug
--   → connector_catalog.provider_key → connector_overrides.capture_category
--   → category adapter (app/_features/capture/adapters/categories/).
--
-- NULL = provider has no capture normalizer; routing falls back to the
-- code-built map, then acks `no_adapter`.

ALTER TABLE public.connector_overrides
  ADD COLUMN IF NOT EXISTS capture_category text
  CHECK (
    capture_category IS NULL OR capture_category IN (
      'email', 'calendar', 'billing', 'crm', 'meetings', 'documents',
      'storage', 'project_management', 'communication'
    )
  );

COMMENT ON COLUMN public.connector_overrides.capture_category IS
  'Salt capture taxonomy used to route webhooks to a category adapter. NULL = no capture normalizer for this provider.';

-- Seed from the code registry (unified-connector-registry.ts) so DB routing
-- takes over with identical behavior.
UPDATE public.connector_overrides o
SET capture_category = seed.category
FROM (
  VALUES
    ('gmail', 'email'),
    ('outlook', 'email'),
    ('googlecalendar', 'calendar'),
    ('cal', 'calendar'),
    ('calendly', 'calendar'),
    ('googledrive', 'storage'),
    ('dropbox', 'storage'),
    ('googledocs', 'documents'),
    ('googlesheets', 'documents'),
    ('googleslides', 'documents'),
    ('notion', 'documents'),
    ('stripe', 'billing'),
    ('quickbooks', 'billing'),
    ('mercury', 'billing'),
    ('hubspot', 'crm'),
    ('salesforce', 'crm'),
    ('pipedrive', 'crm'),
    ('slack', 'communication'),
    ('linear', 'project_management'),
    ('asana', 'project_management'),
    ('clickup', 'project_management'),
    ('github', 'project_management')
) AS seed (provider_key, category)
WHERE o.provider_key = seed.provider_key;
