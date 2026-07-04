-- ============================================================================
-- Grant workspace tag tables for PostgREST / Supabase client access
-- ============================================================================
--
-- workspace_tags + entity_tag_assignments (20260627170000) enabled RLS and
-- created policies but never granted table privileges to authenticated /
-- service_role. PostgREST returns 42501 "permission denied for table …"
-- even with valid RLS policies.
--
-- Pattern: same as 20260620170000_grant_profile_playbook_tables.sql
-- ============================================================================

DO $$
DECLARE
  tag_table text;
BEGIN
  FOR tag_table IN
    SELECT unnest(ARRAY[
      'workspace_tags',
      'entity_tag_assignments'
    ])
  LOOP
    IF to_regclass(format('public.%I', tag_table)) IS NOT NULL THEN
      EXECUTE format(
        'GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated',
        tag_table
      );
      EXECUTE format(
        'GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO service_role',
        tag_table
      );
    END IF;
  END LOOP;
END $$;

-- Seed default system tags for workspaces created before this feature shipped.
DO $$
DECLARE
  ws_id uuid;
BEGIN
  IF to_regprocedure('public.seed_default_workspace_tags(uuid)') IS NOT NULL THEN
    FOR ws_id IN SELECT id FROM public.workspaces
    LOOP
      PERFORM public.seed_default_workspace_tags(ws_id);
    END LOOP;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
