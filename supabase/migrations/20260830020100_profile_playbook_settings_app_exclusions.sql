-- Per-play app exclusions (Playbook page → Overview → "What it needs")
--
-- A playbook declares requirement CATEGORIES (billing, email); every
-- connected app in a category fans out. Toggling an app off for one play
-- records the provider here — keyed by (workspace, blueprint_slug), because
-- exclusions are about the workspace's own connections, not the shareable
-- definition.

ALTER TABLE profile_playbook_settings
  ADD COLUMN app_exclusions JSONB NOT NULL DEFAULT '[]'::jsonb
  CHECK (jsonb_typeof(app_exclusions) = 'array');

COMMENT ON COLUMN profile_playbook_settings.app_exclusions IS 'Provider keys (e.g. "quickbooks") excluded from this playbook''s fan-out';
