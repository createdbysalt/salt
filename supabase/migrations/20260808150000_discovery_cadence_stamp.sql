-- Sources plan 4.4: plan-tiered discovery cadence stamp.
--
-- Relationship discovery (held-sender promotion) is workspace-scoped, so its
-- cadence gate cannot ride workspace_integrations.config like the 3.3
-- reconciliation stamp does. workspace_capture_settings is the workspace-level
-- capture settings row (1:1 with workspaces) — the stamp lives here.

ALTER TABLE workspace_capture_settings
  ADD COLUMN IF NOT EXISTS last_discovery_at TIMESTAMPTZ;

COMMENT ON COLUMN workspace_capture_settings.last_discovery_at IS
  'Last relationship-discovery (held-sender promotion) run. Gates the plan-tiered cadence: Starter 1x/day, paid tiers 4x/day.';
