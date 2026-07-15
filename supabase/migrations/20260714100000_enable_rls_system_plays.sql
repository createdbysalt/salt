-- ============================================================================
-- SECURITY FIX: Enable RLS on system_plays
--
-- Addresses: Supabase security advisor ERROR "rls_disabled_in_public"
-- Issue: Without RLS, anyone with the project URL can INSERT/UPDATE/DELETE
-- Fix: Enable RLS, allow authenticated SELECT, deny all writes
-- ============================================================================

-- Enable RLS
ALTER TABLE public.system_plays ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read (it's reference data)
CREATE POLICY "authenticated_can_read_system_plays"
  ON public.system_plays
  FOR SELECT
  TO authenticated
  USING (true);

-- Service role can manage (for seeds/migrations only)
CREATE POLICY "service_role_can_manage_system_plays"
  ON public.system_plays
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- No policy for anon = anon cannot access
-- No INSERT/UPDATE/DELETE for authenticated = read-only for users

COMMENT ON TABLE public.system_plays IS
  'Registry of immutable core operations. RLS enabled: authenticated read, service_role write.';
