-- ============================================================================
-- Grant memory trash target tables for PostgREST / Supabase client access
-- ============================================================================
--
-- notes (20260612200000) and projects were missing explicit GRANTs for
-- authenticated and service_role. PostgREST returns 42501 "permission denied
-- for table …" even when using the service role admin client.
--
-- Pattern: same as 20260614000300_grant_entity_tables_to_authenticated.sql
-- ============================================================================

DO $$
DECLARE
  memory_table text;
BEGIN
  FOR memory_table IN
    SELECT unnest(ARRAY[
      'notes',
      'projects',
      'people',
      'organizations'
    ])
  LOOP
    IF to_regclass(format('public.%I', memory_table)) IS NOT NULL THEN
      EXECUTE format(
        'GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated',
        memory_table
      );
      EXECUTE format(
        'GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO service_role',
        memory_table
      );
    END IF;
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
