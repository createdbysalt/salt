-- ============================================================================
-- SECURITY FIX: Enable RLS on infrastructure tables
--
-- Addresses: Supabase security advisor findings
-- Tables: playbook_evals, playbook_eval_runs, playbook_improvement_proposals,
--         connector_sync_events, resource_signals
--
-- These are infrastructure tables without workspace_id (global reference data
-- or system event logs). They need RLS enabled with service_role-only access.
--
-- Note: Wrapped in DO blocks to handle Supabase preview branches where tables
-- may not exist yet (preview DBs are ephemeral and may have incomplete schema).
-- ============================================================================

DO $$
BEGIN
  -- --------------------------------------------------------------------------
  -- 1. playbook_evals - Eval test cases for playbook CI
  -- --------------------------------------------------------------------------
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'playbook_evals') THEN
    ALTER TABLE public.playbook_evals ENABLE ROW LEVEL SECURITY;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'playbook_evals' AND policyname = 'service_role_manage_playbook_evals') THEN
      CREATE POLICY "service_role_manage_playbook_evals"
        ON public.playbook_evals
        FOR ALL
        TO service_role
        USING (true)
        WITH CHECK (true);
    END IF;

    COMMENT ON TABLE public.playbook_evals IS
      'Playbook evaluation test cases. Service role only - used by CI/playbook engine.';
  END IF;

  -- --------------------------------------------------------------------------
  -- 2. playbook_eval_runs - Results of playbook eval runs
  -- --------------------------------------------------------------------------
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'playbook_eval_runs') THEN
    ALTER TABLE public.playbook_eval_runs ENABLE ROW LEVEL SECURITY;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'playbook_eval_runs' AND policyname = 'service_role_manage_playbook_eval_runs') THEN
      CREATE POLICY "service_role_manage_playbook_eval_runs"
        ON public.playbook_eval_runs
        FOR ALL
        TO service_role
        USING (true)
        WITH CHECK (true);
    END IF;

    COMMENT ON TABLE public.playbook_eval_runs IS
      'Playbook evaluation run results. Service role only - used by CI/playbook engine.';
  END IF;

  -- --------------------------------------------------------------------------
  -- 3. playbook_improvement_proposals - AI-generated playbook improvements
  -- --------------------------------------------------------------------------
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'playbook_improvement_proposals') THEN
    ALTER TABLE public.playbook_improvement_proposals ENABLE ROW LEVEL SECURITY;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'playbook_improvement_proposals' AND policyname = 'service_role_manage_playbook_improvement_proposals') THEN
      CREATE POLICY "service_role_manage_playbook_improvement_proposals"
        ON public.playbook_improvement_proposals
        FOR ALL
        TO service_role
        USING (true)
        WITH CHECK (true);
    END IF;

    COMMENT ON TABLE public.playbook_improvement_proposals IS
      'AI-generated playbook improvement proposals. Service role only.';
  END IF;

  -- --------------------------------------------------------------------------
  -- 4. connector_sync_events - Webhook event logs
  -- --------------------------------------------------------------------------
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'connector_sync_events') THEN
    -- RLS may already be enabled, but this is idempotent
    ALTER TABLE public.connector_sync_events ENABLE ROW LEVEL SECURITY;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'connector_sync_events' AND policyname = 'service_role_manage_connector_sync_events') THEN
      CREATE POLICY "service_role_manage_connector_sync_events"
        ON public.connector_sync_events
        FOR ALL
        TO service_role
        USING (true)
        WITH CHECK (true);
    END IF;

    COMMENT ON TABLE public.connector_sync_events IS
      'Connector webhook sync events. Service role only - written by webhook handlers.';
  END IF;

  -- --------------------------------------------------------------------------
  -- 5. resource_signals - Fix misleading policy names
  -- --------------------------------------------------------------------------
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'resource_signals') THEN
    -- Drop the incorrectly-named policies (were granted to public but named service_role)
    DROP POLICY IF EXISTS "service_role_can_insert_signals" ON public.resource_signals;
    DROP POLICY IF EXISTS "service_role_can_update_signals" ON public.resource_signals;

    -- Recreate with correct role scope
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'resource_signals' AND policyname = 'service_role_insert_signals') THEN
      CREATE POLICY "service_role_insert_signals"
        ON public.resource_signals
        FOR INSERT
        TO service_role
        WITH CHECK (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'resource_signals' AND policyname = 'service_role_update_signals') THEN
      CREATE POLICY "service_role_update_signals"
        ON public.resource_signals
        FOR UPDATE
        TO service_role
        USING (true);
    END IF;
  END IF;
END $$;
