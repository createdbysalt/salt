-- ============================================================================
-- Grant profile playbook tables for PostgREST / Supabase client access
-- ============================================================================
--
-- profile_field_provenance and profile_playbook_settings (20260620150000)
-- enabled RLS and created policies but never granted table privileges to
-- authenticated / service_role. PostgREST returns 42501 "permission denied
-- for table …" even with valid RLS policies, because the role lacks the
-- underlying table privilege.
--
-- Pattern: same as 20260620140000_grant_memory_trash_tables.sql
-- ============================================================================

DO $$
DECLARE
  profile_table text;
BEGIN
  FOR profile_table IN
    SELECT unnest(ARRAY[
      'profile_field_provenance',
      'profile_playbook_settings'
    ])
  LOOP
    IF to_regclass(format('public.%I', profile_table)) IS NOT NULL THEN
      EXECUTE format(
        'GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated',
        profile_table
      );
      EXECUTE format(
        'GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO service_role',
        profile_table
      );
    END IF;
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
