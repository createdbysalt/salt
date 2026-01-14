-- ============================================================================
-- FIX: Unsafe JWT role checks in AI credits RLS (3 occurrences)
-- ============================================================================
-- Issue: Three policies used auth.jwt() ->> 'role' = 'service_role' which can be
--        bypassed by manipulating JWT claims.
-- Fix: Replace with TO service_role policies which properly restrict to the
--      service role connection, not JWT claims.
-- Tables affected:
--   - ai_credit_balances (line 44 in original migration)
--   - ai_credit_usage (line 71 in original migration)
--   - ai_credit_purchases (line 104 in original migration)
-- ============================================================================

-- ============================================================================
-- FIX 1: ai_credit_balances - Service role can manage credit balances
-- ============================================================================

-- Drop the unsafe policy
DROP POLICY IF EXISTS "Service role can manage credit balances" ON public.ai_credit_balances;

-- Create new secure policy using TO service_role
-- This restricts access to connections made with the service role key,
-- which cannot be spoofed via JWT manipulation
CREATE POLICY "Service role can manage credit balances"
  ON public.ai_credit_balances
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON POLICY "Service role can manage credit balances" ON public.ai_credit_balances
  IS 'Secure service role access - uses TO service_role instead of JWT claim check';

-- ============================================================================
-- FIX 2: ai_credit_usage - Service role can log credit usage
-- ============================================================================

-- Drop the unsafe policy
DROP POLICY IF EXISTS "Service role can log credit usage" ON public.ai_credit_usage;

-- Create new secure policy using TO service_role
CREATE POLICY "Service role can log credit usage"
  ON public.ai_credit_usage
  FOR INSERT
  TO service_role
  WITH CHECK (true);

COMMENT ON POLICY "Service role can log credit usage" ON public.ai_credit_usage
  IS 'Secure service role access - uses TO service_role instead of JWT claim check';

-- ============================================================================
-- FIX 3: ai_credit_purchases - Service role can record credit purchases
-- ============================================================================

-- Drop the unsafe policy
DROP POLICY IF EXISTS "Service role can record credit purchases" ON public.ai_credit_purchases;

-- Create new secure policy using TO service_role
CREATE POLICY "Service role can record credit purchases"
  ON public.ai_credit_purchases
  FOR INSERT
  TO service_role
  WITH CHECK (true);

COMMENT ON POLICY "Service role can record credit purchases" ON public.ai_credit_purchases
  IS 'Secure service role access - uses TO service_role instead of JWT claim check';
