-- Area-scoped connector rules (Sources → Customize, 2026-08-17)
--
-- v1 shipped two scopes: provider-scoped (provider set) and workspace-wide
-- (provider NULL). Area views on Sources → Customize wrote to the FIRST
-- account's provider, so a "keep out" rule on Email only covered Outlook
-- even when Gmail was connected too. This adds the third scope:
--
--   provider set,  area NULL  → provider-scoped (one account)
--   provider NULL, area set   → area-scoped (every account in the area,
--                               including accounts connected later)
--   provider NULL, area NULL  → workspace-wide (All connectors)
--
-- provider + area both set is invalid — a rule has exactly one scope.
-- area uses the user-facing CustomizeArea vocabulary (rule-entities.ts),
-- NOT the engineering ConnectorCategory enum.

ALTER TABLE connector_rules ADD COLUMN area TEXT;

ALTER TABLE connector_rules ADD CONSTRAINT connector_rules_scope_check
  CHECK (NOT (provider IS NOT NULL AND area IS NOT NULL));

ALTER TABLE connector_rules ADD CONSTRAINT connector_rules_area_check
  CHECK (
    area IS NULL
    OR area IN ('email', 'calendar', 'billing', 'storage', 'messaging', 'meetings', 'crm', 'projects')
  );

-- Uniqueness gains the area column: one rule per entity per scope. The
-- original constraint was declared inline, so its name is Postgres-assigned
-- (and identifier-truncated) — find and drop it dynamically.
DO $$
DECLARE
  constraint_name text;
BEGIN
  SELECT con.conname INTO constraint_name
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
  WHERE rel.relname = 'connector_rules'
    AND nsp.nspname = 'public'
    AND con.contype = 'u';

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE connector_rules DROP CONSTRAINT %I', constraint_name);
  END IF;
END $$;

ALTER TABLE connector_rules ADD CONSTRAINT connector_rules_unique_entity_per_scope
  UNIQUE NULLS NOT DISTINCT (workspace_id, provider, area, rule_type, entity_type, entity_key);

-- Gate-time lookups: workspace + area narrowing for area-scoped rows.
CREATE INDEX idx_connector_rules_workspace_area
  ON connector_rules(workspace_id, area);

COMMENT ON COLUMN connector_rules.area IS 'Intake area (email, calendar, …); provider NULL + area set = area-scoped rule covering every account in the area';

-- Rollback:
-- ALTER TABLE connector_rules DROP CONSTRAINT connector_rules_unique_entity_per_scope;
-- ALTER TABLE connector_rules ADD UNIQUE NULLS NOT DISTINCT (workspace_id, provider, rule_type, entity_type, entity_key);
-- ALTER TABLE connector_rules DROP CONSTRAINT connector_rules_scope_check;
-- ALTER TABLE connector_rules DROP CONSTRAINT connector_rules_area_check;
-- DROP INDEX idx_connector_rules_workspace_area;
-- ALTER TABLE connector_rules DROP COLUMN area;
