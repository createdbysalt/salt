-- ============================================================================
-- DROP ORPHANED client_users POLICY + FUNCTIONS (bridge retirement hotfix)
-- ============================================================================
--
-- Same failure class as 20260703100000 (the auth trigger that broke every
-- login): DROP TABLE CASCADE does not track plpgsql function-body references.
-- The live RLS policy client_users_view_projects ON public.projects calls
-- is_client_user_of_client(), whose SECURITY DEFINER body SELECTs from the
-- dropped client_users table — a latent runtime error on policy evaluation.
--
-- Also drops the two orphaned studio_id trigger functions whose triggers
-- died with their tables (client_users, bridge_portals).
-- ============================================================================

DROP POLICY IF EXISTS "client_users_view_projects" ON public.projects;
DROP FUNCTION IF EXISTS public.is_client_user_of_client(uuid);
DROP FUNCTION IF EXISTS public.set_client_users_studio_id();
DROP FUNCTION IF EXISTS public.set_bridge_portals_studio_id();
