-- ============================================================================
-- Migration: Workspace compatibility layer
-- ============================================================================
--
-- Creates workspace-named database surfaces without breaking the current app,
-- which still reads and writes studio/studio_id names in many places.
--
-- This is the safe first step of the workspace rename:
-- 1. New code can begin reading workspace-named surfaces.
-- 2. Existing code keeps working against studio-named tables.
-- 3. The later physical rename can remove these compatibility views once the
--    app sweep is complete.
-- ============================================================================

CREATE OR REPLACE VIEW public.workspaces
WITH (security_invoker = true)
AS
SELECT
  id,
  name,
  slug,
  owner_id,
  stripe_customer_id,
  stripe_subscription_id,
  subscription_status,
  settings,
  created_at,
  updated_at
FROM public.studios;

CREATE OR REPLACE VIEW public.workspace_members
WITH (security_invoker = true)
AS
SELECT
  id,
  studio_id AS workspace_id,
  user_id,
  role,
  email,
  created_at,
  updated_at
FROM public.studio_members;

CREATE OR REPLACE VIEW public.workspace_integrations
WITH (security_invoker = true)
AS
SELECT
  id,
  studio_id AS workspace_id,
  provider,
  api_key_encrypted,
  config,
  is_active,
  connected_at,
  connected_by,
  last_synced_at,
  last_error,
  created_at,
  updated_at,
  composio_connection_id,
  composio_status
FROM public.studio_integrations;

CREATE OR REPLACE VIEW public.workspace_domains
WITH (security_invoker = true)
AS
SELECT
  id,
  studio_id AS workspace_id,
  hostname,
  status,
  verification_token,
  verification_method,
  verified_at,
  last_verified_at,
  ssl_status,
  ssl_issued_at,
  created_at,
  updated_at
FROM public.studio_domains;

CREATE OR REPLACE FUNCTION public.is_workspace_member(p_workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.studio_members sm
    WHERE sm.studio_id = p_workspace_id
      AND sm.user_id = auth.uid()
  );
$$;

COMMENT ON VIEW public.workspaces IS 'Compatibility view for studios during workspace rename.';
COMMENT ON VIEW public.workspace_members IS 'Compatibility view for studio_members during workspace rename.';
COMMENT ON VIEW public.workspace_integrations IS 'Compatibility view for studio_integrations during workspace rename.';
COMMENT ON VIEW public.workspace_domains IS 'Compatibility view for studio_domains during workspace rename.';
COMMENT ON FUNCTION public.is_workspace_member(uuid) IS 'Workspace-named compatibility wrapper around studio membership checks.';

GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspaces TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspace_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspace_integrations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspace_domains TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_workspace_member(uuid) TO authenticated;
