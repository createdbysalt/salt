-- ============================================================================
-- Grant entity table privileges for PostgREST / Supabase client access
-- ============================================================================
--
-- RLS policies on people/organizations were added in 20260514000100 but table
-- privileges for the authenticated role were never granted. PostgREST returns
-- 42501 when embedding people/orgs on intelligence_findings queries without
-- SELECT on the join targets.
--
-- Pattern: same as capture_events and intelligence_findings repair migrations.
-- ============================================================================

DO $$
DECLARE
  entity_table text;
BEGIN
  FOR entity_table IN
    SELECT unnest(ARRAY[
      'people',
      'organizations',
      'organization_people',
      'teams',
      'team_members',
      'entity_relations'
    ])
  LOOP
    IF to_regclass(format('public.%I', entity_table)) IS NOT NULL THEN
      EXECUTE format(
        'GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated',
        entity_table
      );
      EXECUTE format(
        'GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO service_role',
        entity_table
      );
    END IF;
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
