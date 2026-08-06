-- Retire v1 playbook tables
--
-- v2 playbooks are filesystem-based (definition.yaml) with settings stored in
-- profile_playbook_settings. These v1 tables are no longer used:
--
-- - playbook_blueprints: Was the source of truth for v1 playbook definitions
-- - play_templates: Was the workspace adoption record for v1 playbooks
--
-- Related tables are KEPT but FK constraints are removed:
-- - play_runs (execution log for both v1 and v2)
-- - profile_playbook_settings (v2 settings - blueprint_slug now references filesystem)
-- - profile_field_provenance (provenance tracking)
-- - playbook_learning_signals (learning data)

-- Step 1: Drop FK constraints referencing play_templates
ALTER TABLE play_runs DROP CONSTRAINT IF EXISTS play_runs_template_id_fkey;
ALTER TABLE playbook_learning_signals DROP CONSTRAINT IF EXISTS playbook_learning_signals_template_id_fkey;

-- Step 2: Drop FK constraints referencing playbook_blueprints
ALTER TABLE playbook_blueprint_versions DROP CONSTRAINT IF EXISTS playbook_blueprint_versions_blueprint_slug_fkey;
ALTER TABLE playbook_learning_signals DROP CONSTRAINT IF EXISTS playbook_learning_signals_blueprint_slug_fkey;
ALTER TABLE playbook_improvement_proposals DROP CONSTRAINT IF EXISTS playbook_improvement_proposals_blueprint_slug_fkey;
ALTER TABLE playbook_evals DROP CONSTRAINT IF EXISTS playbook_evals_blueprint_slug_fkey;
ALTER TABLE playbook_eval_runs DROP CONSTRAINT IF EXISTS playbook_eval_runs_blueprint_slug_fkey;
ALTER TABLE profile_field_provenance DROP CONSTRAINT IF EXISTS profile_field_provenance_blueprint_slug_fkey;
ALTER TABLE profile_playbook_settings DROP CONSTRAINT IF EXISTS profile_playbook_settings_blueprint_slug_fkey;

-- Step 3: Drop the v1 tables
DROP TABLE IF EXISTS play_templates;
DROP TABLE IF EXISTS playbook_blueprint_versions;
DROP TABLE IF EXISTS playbook_blueprints;

-- Note: blueprint_slug columns in remaining tables now reference v2 filesystem
-- playbooks (no FK enforcement). This is intentional - v2 playbooks are defined
-- in code, not in the database.

COMMENT ON TABLE profile_playbook_settings IS 'v2 playbook enabled/disabled state. Playbooks are enabled by default; this table stores explicit overrides. blueprint_slug references filesystem playbooks (no FK).';
