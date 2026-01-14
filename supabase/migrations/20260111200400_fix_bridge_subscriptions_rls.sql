-- ============================================================================
-- FIX: Replace unsafe JWT role checks in bridge subscriptions RLS
-- ============================================================================
-- Issue: auth.jwt() ->> 'role' = 'service_role' can be bypassed via JWT manipulation
-- Fix: Use TO service_role which restricts by connection type, not JWT claims
-- Tables: bridge_client_subscriptions, bridge_subscription_invoices
-- ============================================================================

-- Fix bridge_client_subscriptions service role policy
DROP POLICY IF EXISTS "Service role can manage subscriptions" ON public.bridge_client_subscriptions;

CREATE POLICY "Service role can manage subscriptions"
  ON public.bridge_client_subscriptions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Fix bridge_subscription_invoices service role policy
DROP POLICY IF EXISTS "Service role can manage subscription invoices" ON public.bridge_subscription_invoices;

CREATE POLICY "Service role can manage subscription invoices"
  ON public.bridge_subscription_invoices
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Comments
COMMENT ON POLICY "Service role can manage subscriptions" ON public.bridge_client_subscriptions IS
  'Service role access for webhook operations - uses TO role instead of JWT claim for security';
COMMENT ON POLICY "Service role can manage subscription invoices" ON public.bridge_subscription_invoices IS
  'Service role access for webhook operations - uses TO role instead of JWT claim for security';
