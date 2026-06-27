-- ============================================================================
-- Grant playbook blueprint registry tables for PostgREST / Supabase access
-- ============================================================================
--
-- playbook_blueprints (20260620100000) never received table privileges.
-- Server actions that bootstrap authored blueprints and UI reads both hit
-- 42501 "permission denied for table playbook_blueprints" without these grants.
--
-- Pattern: same as 20260620170000_grant_profile_playbook_tables.sql
-- ============================================================================

DO $$
DECLARE
  blueprint_table text;
BEGIN
  FOR blueprint_table IN
    SELECT unnest(ARRAY[
      'playbook_blueprints',
      'playbook_blueprint_versions',
      'playbook_evals',
      'playbook_eval_runs',
      'playbook_improvement_proposals'
    ])
  LOOP
    IF to_regclass(format('public.%I', blueprint_table)) IS NOT NULL THEN
      EXECUTE format(
        'GRANT SELECT ON public.%I TO authenticated',
        blueprint_table
      );
      EXECUTE format(
        'GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO service_role',
        blueprint_table
      );
    END IF;
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
