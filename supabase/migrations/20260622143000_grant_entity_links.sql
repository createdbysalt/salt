-- ============================================================================
-- Grant entity_links privileges for PostgREST / Supabase client access
-- ============================================================================
--
-- entity_links was created in 20260613110000 with RLS policies but without
-- table-level GRANTs. Ask Salt system plays (memory_link_*) use the service
-- role client; without INSERT on entity_links Postgres returns 42501
-- "permission denied for table entity_links".
--
-- Pattern: same as 20260614000300_grant_entity_tables_to_authenticated.sql
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.entity_links TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.entity_links TO service_role;

NOTIFY pgrst, 'reload schema';
