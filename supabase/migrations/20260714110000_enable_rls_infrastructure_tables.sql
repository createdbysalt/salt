-- ============================================================================
-- SECURITY FIX: Enable RLS on infrastructure tables
--
-- Addresses: Supabase security advisor findings
-- Tables: playbook_evals, playbook_eval_runs, playbook_improvement_proposals,
--         connector_sync_events
--
-- These are infrastructure tables without workspace_id (global reference data
-- or system event logs). They need RLS enabled with service_role-only access.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. playbook_evals - Eval test cases for playbook CI
-- ----------------------------------------------------------------------------
ALTER TABLE public.playbook_evals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_manage_playbook_evals"
  ON public.playbook_evals
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE public.playbook_evals IS
  'Playbook evaluation test cases. Service role only - used by CI/playbook engine.';

-- ----------------------------------------------------------------------------
-- 2. playbook_eval_runs - Results of playbook eval runs
-- ----------------------------------------------------------------------------
ALTER TABLE public.playbook_eval_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_manage_playbook_eval_runs"
  ON public.playbook_eval_runs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE public.playbook_eval_runs IS
  'Playbook evaluation run results. Service role only - used by CI/playbook engine.';

-- ----------------------------------------------------------------------------
-- 3. playbook_improvement_proposals - AI-generated playbook improvements
-- ----------------------------------------------------------------------------
ALTER TABLE public.playbook_improvement_proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_manage_playbook_improvement_proposals"
  ON public.playbook_improvement_proposals
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE public.playbook_improvement_proposals IS
  'AI-generated playbook improvement proposals. Service role only.';

-- ----------------------------------------------------------------------------
-- 4. connector_sync_events - Webhook event logs (already has RLS, needs policy)
-- ----------------------------------------------------------------------------
-- RLS already enabled, just add the policy

CREATE POLICY "service_role_manage_connector_sync_events"
  ON public.connector_sync_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE public.connector_sync_events IS
  'Connector webhook sync events. Service role only - written by webhook handlers.';

-- ----------------------------------------------------------------------------
-- 5. Fix misleading policy names on resource_signals
-- ----------------------------------------------------------------------------
-- Drop the incorrectly-named policies and recreate with correct role

DROP POLICY IF EXISTS "service_role_can_insert_signals" ON public.resource_signals;
DROP POLICY IF EXISTS "service_role_can_update_signals" ON public.resource_signals;

CREATE POLICY "service_role_insert_signals"
  ON public.resource_signals
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "service_role_update_signals"
  ON public.resource_signals
  FOR UPDATE
  TO service_role
  USING (true);

-- Keep the existing workspace member SELECT policy (it's correct)
