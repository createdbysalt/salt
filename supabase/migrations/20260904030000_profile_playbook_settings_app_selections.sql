-- Per-play opt-in app selections (Playbook page → Overview → "What it needs")
--
-- A playbook declares requirement CATEGORIES (billing, email). The owner
-- explicitly adds which connected apps the play may use. New connections
-- stay out until added. app_exclusions is kept for the backfill to read
-- and is dropped in a later migration once selections are stable.

ALTER TABLE profile_playbook_settings
  ADD COLUMN app_selections JSONB
  CHECK (app_selections IS NULL OR jsonb_typeof(app_selections) = 'array');

COMMENT ON COLUMN profile_playbook_settings.app_selections IS
  'Provider keys (e.g. "stripe") this playbook may use. Null/empty = none selected (opt-in).';
