-- ============================================================================
-- RENAME KEEPER PLAYBOOK SLUGS
-- Migration: Update playbook slugs from *-profile to keeper-*-records
-- ============================================================================
--
-- Renames playbook slugs to better reflect Keeper ownership:
--   people-profile -> keeper-people-records
--   organizations-profile -> keeper-organizations-records
--   work-profile -> keeper-work-records
--
-- ============================================================================

-- ============================================================================
-- 1. DROP ALL FK CONSTRAINTS REFERENCING playbook_blueprints(slug)
-- ============================================================================

ALTER TABLE public.playbook_blueprint_versions
  DROP CONSTRAINT IF EXISTS playbook_blueprint_versions_blueprint_slug_fkey;

ALTER TABLE public.play_templates
  DROP CONSTRAINT IF EXISTS play_templates_blueprint_slug_fkey;

ALTER TABLE public.playbook_learning_signals
  DROP CONSTRAINT IF EXISTS playbook_learning_signals_blueprint_slug_fkey;

ALTER TABLE public.playbook_improvement_proposals
  DROP CONSTRAINT IF EXISTS playbook_improvement_proposals_blueprint_slug_fkey;

ALTER TABLE public.playbook_evals
  DROP CONSTRAINT IF EXISTS playbook_evals_blueprint_slug_fkey;

ALTER TABLE public.playbook_eval_runs
  DROP CONSTRAINT IF EXISTS playbook_eval_runs_blueprint_slug_fkey;

ALTER TABLE public.profile_field_provenance
  DROP CONSTRAINT IF EXISTS profile_field_provenance_blueprint_slug_fkey;

ALTER TABLE public.profile_playbook_settings
  DROP CONSTRAINT IF EXISTS profile_playbook_settings_blueprint_slug_fkey;

-- ============================================================================
-- 2. UPDATE PLAYBOOK BLUEPRINTS TABLE (parent)
-- ============================================================================

UPDATE public.playbook_blueprints
SET slug = 'keeper-people-records'
WHERE slug = 'people-profile';

UPDATE public.playbook_blueprints
SET slug = 'keeper-organizations-records'
WHERE slug = 'organizations-profile';

UPDATE public.playbook_blueprints
SET slug = 'keeper-work-records'
WHERE slug = 'work-profile';

-- ============================================================================
-- 3. UPDATE ALL CHILD TABLES
-- ============================================================================

UPDATE public.playbook_blueprint_versions
SET blueprint_slug = 'keeper-people-records'
WHERE blueprint_slug = 'people-profile';

UPDATE public.playbook_blueprint_versions
SET blueprint_slug = 'keeper-organizations-records'
WHERE blueprint_slug = 'organizations-profile';

UPDATE public.playbook_blueprint_versions
SET blueprint_slug = 'keeper-work-records'
WHERE blueprint_slug = 'work-profile';

UPDATE public.play_templates
SET blueprint_slug = 'keeper-people-records'
WHERE blueprint_slug = 'people-profile';

UPDATE public.play_templates
SET blueprint_slug = 'keeper-organizations-records'
WHERE blueprint_slug = 'organizations-profile';

UPDATE public.play_templates
SET blueprint_slug = 'keeper-work-records'
WHERE blueprint_slug = 'work-profile';

UPDATE public.playbook_learning_signals
SET blueprint_slug = 'keeper-people-records'
WHERE blueprint_slug = 'people-profile';

UPDATE public.playbook_learning_signals
SET blueprint_slug = 'keeper-organizations-records'
WHERE blueprint_slug = 'organizations-profile';

UPDATE public.playbook_learning_signals
SET blueprint_slug = 'keeper-work-records'
WHERE blueprint_slug = 'work-profile';

UPDATE public.playbook_improvement_proposals
SET blueprint_slug = 'keeper-people-records'
WHERE blueprint_slug = 'people-profile';

UPDATE public.playbook_improvement_proposals
SET blueprint_slug = 'keeper-organizations-records'
WHERE blueprint_slug = 'organizations-profile';

UPDATE public.playbook_improvement_proposals
SET blueprint_slug = 'keeper-work-records'
WHERE blueprint_slug = 'work-profile';

UPDATE public.playbook_evals
SET blueprint_slug = 'keeper-people-records'
WHERE blueprint_slug = 'people-profile';

UPDATE public.playbook_evals
SET blueprint_slug = 'keeper-organizations-records'
WHERE blueprint_slug = 'organizations-profile';

UPDATE public.playbook_evals
SET blueprint_slug = 'keeper-work-records'
WHERE blueprint_slug = 'work-profile';

UPDATE public.playbook_eval_runs
SET blueprint_slug = 'keeper-people-records'
WHERE blueprint_slug = 'people-profile';

UPDATE public.playbook_eval_runs
SET blueprint_slug = 'keeper-organizations-records'
WHERE blueprint_slug = 'organizations-profile';

UPDATE public.playbook_eval_runs
SET blueprint_slug = 'keeper-work-records'
WHERE blueprint_slug = 'work-profile';

UPDATE public.profile_field_provenance
SET blueprint_slug = 'keeper-people-records'
WHERE blueprint_slug = 'people-profile';

UPDATE public.profile_field_provenance
SET blueprint_slug = 'keeper-organizations-records'
WHERE blueprint_slug = 'organizations-profile';

UPDATE public.profile_field_provenance
SET blueprint_slug = 'keeper-work-records'
WHERE blueprint_slug = 'work-profile';

UPDATE public.profile_playbook_settings
SET blueprint_slug = 'keeper-people-records'
WHERE blueprint_slug = 'people-profile';

UPDATE public.profile_playbook_settings
SET blueprint_slug = 'keeper-organizations-records'
WHERE blueprint_slug = 'organizations-profile';

UPDATE public.profile_playbook_settings
SET blueprint_slug = 'keeper-work-records'
WHERE blueprint_slug = 'work-profile';

-- ============================================================================
-- 4. RESTORE ALL FK CONSTRAINTS
-- ============================================================================

ALTER TABLE public.playbook_blueprint_versions
  ADD CONSTRAINT playbook_blueprint_versions_blueprint_slug_fkey
  FOREIGN KEY (blueprint_slug) REFERENCES public.playbook_blueprints(slug) ON DELETE CASCADE;

ALTER TABLE public.play_templates
  ADD CONSTRAINT play_templates_blueprint_slug_fkey
  FOREIGN KEY (blueprint_slug) REFERENCES public.playbook_blueprints(slug) ON DELETE SET NULL;

ALTER TABLE public.playbook_learning_signals
  ADD CONSTRAINT playbook_learning_signals_blueprint_slug_fkey
  FOREIGN KEY (blueprint_slug) REFERENCES public.playbook_blueprints(slug) ON DELETE SET NULL;

ALTER TABLE public.playbook_improvement_proposals
  ADD CONSTRAINT playbook_improvement_proposals_blueprint_slug_fkey
  FOREIGN KEY (blueprint_slug) REFERENCES public.playbook_blueprints(slug) ON DELETE CASCADE;

ALTER TABLE public.playbook_evals
  ADD CONSTRAINT playbook_evals_blueprint_slug_fkey
  FOREIGN KEY (blueprint_slug) REFERENCES public.playbook_blueprints(slug) ON DELETE CASCADE;

ALTER TABLE public.playbook_eval_runs
  ADD CONSTRAINT playbook_eval_runs_blueprint_slug_fkey
  FOREIGN KEY (blueprint_slug) REFERENCES public.playbook_blueprints(slug) ON DELETE CASCADE;

ALTER TABLE public.profile_field_provenance
  ADD CONSTRAINT profile_field_provenance_blueprint_slug_fkey
  FOREIGN KEY (blueprint_slug) REFERENCES public.playbook_blueprints(slug) ON DELETE SET NULL;

ALTER TABLE public.profile_playbook_settings
  ADD CONSTRAINT profile_playbook_settings_blueprint_slug_fkey
  FOREIGN KEY (blueprint_slug) REFERENCES public.playbook_blueprints(slug) ON DELETE CASCADE;

-- ============================================================================
-- DONE: Keeper playbook slugs renamed
-- ============================================================================
