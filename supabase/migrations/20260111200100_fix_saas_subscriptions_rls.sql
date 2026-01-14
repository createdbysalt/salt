-- ============================================================================
-- FIX: Unsafe JWT role check in saas_subscriptions RLS
-- ============================================================================
-- Issue: The policy used auth.jwt() ->> 'role' = 'service_role' which can be
--        bypassed by manipulating JWT claims.
-- Fix: Replace with TO service_role policy which properly restricts to the
--      service role connection, not JWT claims.
-- ============================================================================

-- Drop the unsafe policy
DROP POLICY IF EXISTS "Service role can manage subscriptions" ON public.saas_subscriptions;

-- Create new secure policy using TO service_role
-- This restricts access to connections made with the service role key,
-- which cannot be spoofed via JWT manipulation
CREATE POLICY "Service role can manage subscriptions"
  ON public.saas_subscriptions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON POLICY "Service role can manage subscriptions" ON public.saas_subscriptions
  IS 'Secure service role access - uses TO service_role instead of JWT claim check';
