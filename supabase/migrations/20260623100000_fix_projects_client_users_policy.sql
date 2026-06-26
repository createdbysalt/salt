-- ============================================================================
-- Fix projects SELECT failing with 42501 via client_users RLS subquery
-- ============================================================================
--
-- PostgREST evaluates every applicable SELECT policy on projects. The
-- client_users_view_projects policy subqueried public.client_users directly;
-- authenticated cannot read that table through the Data API, so policy
-- evaluation errored and blocked workspace members from listing projects.
--
-- Use a SECURITY DEFINER helper (same pattern as is_workspace_member).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_client_user_of_client(p_client_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.client_users cu
    WHERE cu.client_id = p_client_id
      AND cu.user_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.is_client_user_of_client(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_client_user_of_client(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.is_client_user_of_client(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_client_user_of_client(uuid) TO service_role;

COMMENT ON FUNCTION public.is_client_user_of_client(uuid) IS
  'Bridge/client portal check: whether auth.uid() has a client_users row for the client.';

DROP POLICY IF EXISTS "client_users_view_projects" ON public.projects;

CREATE POLICY "client_users_view_projects"
  ON public.projects FOR SELECT
  USING (
    projects.client_id IS NOT NULL
    AND public.is_client_user_of_client(projects.client_id)
  );

COMMENT ON POLICY "client_users_view_projects" ON public.projects IS
  'Client portal users can view projects for clients they belong to (via SECURITY DEFINER helper).';

NOTIFY pgrst, 'reload schema';
