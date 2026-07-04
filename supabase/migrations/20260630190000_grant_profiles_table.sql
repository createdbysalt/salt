-- ============================================================================
-- Grant profiles table for PostgREST / Supabase client access
-- ============================================================================
--
-- profiles has RLS policies from init (20251228000500) but never received
-- table-level GRANTs for authenticated. PostgREST returns 42501
-- "permission denied for table profiles" even when RLS would allow the row.
--
-- Pattern: same as 20260620170000_grant_profile_playbook_tables.sql
-- ============================================================================

DO $$
BEGIN
  IF to_regclass('public.profiles') IS NOT NULL THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO service_role;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
