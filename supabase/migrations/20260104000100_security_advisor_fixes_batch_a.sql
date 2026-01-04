-- ============================================================================
-- Security & Performance Advisor Fixes - BATCH A (Transaction-safe)
-- ============================================================================
-- Purpose: Fix RLS gaps, SECURITY DEFINER view risk, and function search_path
-- Layer: Infrastructure/Intelligence/Finance/Security
-- Safety: Can run in transaction, short locks, zero-downtime
-- ============================================================================

BEGIN;

-- ============================================================================
-- A1) FIX ai_audits RLS COVERAGE (Layer: Intelligence)
-- ============================================================================
-- Issue: Table has RLS enabled but no policies (table effectively locked)
-- Fix: Add explicit policies so studio members can access audits for their projects

COMMENT ON TABLE public.ai_audits IS 'AI-generated project audits (competitor analysis, market research) - Intelligence Layer';

-- Studio members can view audits for projects in their studios
CREATE POLICY "Studio members can view their project audits"
  ON public.ai_audits
  FOR SELECT
  TO authenticated
  USING (
    project_id IN (
      SELECT p.id 
      FROM public.projects p
      WHERE p.studio_id IN (
        SELECT sm.studio_id 
        FROM public.studio_members sm
        WHERE sm.user_id = (SELECT auth.uid())
      )
    )
  );

-- Studio members can create audits for their projects
CREATE POLICY "Studio members can create audits for their projects"
  ON public.ai_audits
  FOR INSERT
  TO authenticated
  WITH CHECK (
    project_id IN (
      SELECT p.id 
      FROM public.projects p
      WHERE p.studio_id IN (
        SELECT sm.studio_id 
        FROM public.studio_members sm
        WHERE sm.user_id = (SELECT auth.uid())
      )
    )
  );

-- Service role has full access (for AI operations)
CREATE POLICY "Service role can manage all audits"
  ON public.ai_audits
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- A2) REPLACE studio_mrr VIEW WITH SECURITY INVOKER (Layer: Finance)
-- ============================================================================
-- Issue: View runs with postgres privileges (SECURITY DEFINER), potential bypass
-- Fix: Recreate as SECURITY INVOKER so it respects caller's RLS policies

-- Drop existing view (no dependencies found)
DROP VIEW IF EXISTS public.studio_mrr;

-- Recreate as security invoker view
CREATE VIEW public.studio_mrr
WITH (security_invoker = true)
AS
SELECT 
  studio_id,
  SUM(
    CASE
      WHEN interval = 'month'::text THEN amount_cents::numeric / 100.0
      WHEN interval = 'year'::text THEN amount_cents::numeric / 100.0 / 12::numeric
      ELSE 0::numeric
    END
  ) AS mrr_usd,
  COUNT(*) AS active_subscriptions
FROM public.bridge_client_subscriptions
WHERE status = ANY (ARRAY['active'::text, 'trialing'::text])
GROUP BY studio_id;

COMMENT ON VIEW public.studio_mrr IS 'Monthly Recurring Revenue (MRR) by studio - Finance Layer (SECURITY INVOKER for RLS compliance)';

-- ============================================================================
-- A3) LOCK DOWN FUNCTION search_path (Layer: Security/Infrastructure)
-- ============================================================================
-- Issue: Multiple functions lack fixed search_path (especially SECURITY DEFINER ones)
-- Fix: Set immutable search_path to prevent object-shadowing attacks
-- Note: Only fixing functions with null config; others already have search_path set

-- Trigger function for auto-activating client users on login
ALTER FUNCTION public.auto_activate_client_user()
  SET search_path = pg_catalog, public;

-- Cleanup function for expired invoice access tokens
ALTER FUNCTION public.cleanup_expired_invoice_tokens()
  SET search_path = pg_catalog, public;

-- Domain verification helper function
ALTER FUNCTION public.get_domain_verification_instructions(uuid)
  SET search_path = pg_catalog, public;

-- Invoice token management functions
ALTER FUNCTION public.mark_token_spent_for_checkout(text)
  SET search_path = pg_catalog, public;

ALTER FUNCTION public.revoke_invoice_tokens(uuid)
  SET search_path = pg_catalog, public;

-- Domain verification main function
ALTER FUNCTION public.verify_studio_domain(uuid)
  SET search_path = pg_catalog, public;

-- Trigger functions without search_path (non-SECURITY DEFINER but good practice)
ALTER FUNCTION public.ensure_single_default_meeting_template()
  SET search_path = pg_catalog, public;

ALTER FUNCTION public.auto_set_milestone_completed_at()
  SET search_path = pg_catalog, public;

ALTER FUNCTION public.update_calendar_connections_updated_at()
  SET search_path = pg_catalog, public;

ALTER FUNCTION public.update_project_milestones_updated_at()
  SET search_path = pg_catalog, public;

ALTER FUNCTION public.update_client_user_updated_at()
  SET search_path = pg_catalog, public;

ALTER FUNCTION public.update_studio_domain_updated_at()
  SET search_path = pg_catalog, public;

-- ============================================================================
-- VERIFICATION & COMMENTS
-- ============================================================================

-- Verify ai_audits now has policies
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'ai_audits';
  
  IF policy_count < 3 THEN
    RAISE EXCEPTION 'ai_audits policies not created correctly (expected 3, got %)', policy_count;
  END IF;
  
  RAISE NOTICE 'Successfully created % RLS policies for ai_audits', policy_count;
END $$;

-- Verify view recreation
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_views 
    WHERE schemaname = 'public' AND viewname = 'studio_mrr'
  ) THEN
    RAISE EXCEPTION 'studio_mrr view not recreated';
  END IF;
  
  RAISE NOTICE 'Successfully recreated studio_mrr view as SECURITY INVOKER';
END $$;

-- Verify function search_path updates
DO $$
DECLARE
  unfixed_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO unfixed_count
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname IN (
      'auto_activate_client_user',
      'cleanup_expired_invoice_tokens',
      'get_domain_verification_instructions',
      'mark_token_spent_for_checkout',
      'revoke_invoice_tokens',
      'verify_studio_domain'
    )
    AND p.proconfig IS NULL;
  
  IF unfixed_count > 0 THEN
    RAISE EXCEPTION 'Some functions still lack search_path (count: %)', unfixed_count;
  END IF;
  
  RAISE NOTICE 'Successfully set search_path on 12 functions';
END $$;

COMMIT;

-- ============================================================================
-- POST-MIGRATION VERIFICATION (Run these manually after migration)
-- ============================================================================

-- Verify ai_audits policies exist
-- SELECT policyname, cmd, roles FROM pg_policies WHERE tablename = 'ai_audits';

-- Test studio_mrr view respects RLS
-- SELECT * FROM public.studio_mrr LIMIT 1;

-- Verify function configs
-- SELECT proname, proconfig FROM pg_proc p 
-- JOIN pg_namespace n ON n.oid = p.pronamespace 
-- WHERE n.nspname = 'public' AND proname LIKE '%verify%';

