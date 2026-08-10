-- ============================================================================
-- Sources plan 6.1 (INV-1): billing-RLS guard function
--
-- The six metering tables must be service-role-write-only:
--   usage_events, workspace_subscriptions, workspace_tool_executions,
--   tool_classifications, playbook_action_approvals, ai_credit_balances
--
-- Unit tests mock the database, so they cannot catch a migration that
-- quietly grants authenticated a write policy on the ledger (the Aug 2026
-- "metering wrote into a void for a day" incident was the same class — see
-- scripts/verify-billing-ledger-writable.mjs). This function lets a script
-- assert the posture with a live credential:
--
--   op run --env-file=.env.staging.1password -- node scripts/verify-billing-rls.mjs
--
-- Per table it checks:
--   exists                  table is present
--   rls_enabled             row level security is on
--   no_public_write_policy  no INSERT/UPDATE/DELETE/ALL policy for
--                           authenticated / anon / PUBLIC
--   no_public_write_grant   no INSERT/UPDATE/DELETE table grant to
--                           authenticated / anon / PUBLIC
--   service_role_insert     service_role holds INSERT (metering can write)
--
-- Security definer so it can read pg_catalog; executable by service_role
-- only. Read-only: it changes nothing.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.verify_billing_rls()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  tables constant text[] := ARRAY[
    'usage_events',
    'workspace_subscriptions',
    'workspace_tool_executions',
    'tool_classifications',
    'playbook_action_approvals',
    'ai_credit_balances'
  ];
  t text;
  report jsonb := '[]'::jsonb;
  tbl_exists boolean;
  rls_on boolean;
  bad_policies text[];
  bad_grants text[];
  svc_insert boolean;
  failures text[];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    SELECT EXISTS (
      SELECT 1 FROM pg_catalog.pg_class c
      JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = t AND c.relkind = 'r'
    ) INTO tbl_exists;

    IF NOT tbl_exists THEN
      report := report || jsonb_build_object(
        'table', t, 'ok', false, 'failures', jsonb_build_array('table missing')
      );
      CONTINUE;
    END IF;

    SELECT c.relrowsecurity INTO rls_on
    FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = t AND c.relkind = 'r';

    SELECT COALESCE(array_agg(p.policyname), '{}') INTO bad_policies
    FROM pg_catalog.pg_policies p
    WHERE p.schemaname = 'public'
      AND p.tablename = t
      AND p.cmd IN ('INSERT', 'UPDATE', 'DELETE', 'ALL')
      AND (p.roles && ARRAY['authenticated', 'anon', 'public']::name[]);

    SELECT COALESCE(array_agg(DISTINCT g.grantee || ':' || g.privilege_type), '{}')
    INTO bad_grants
    FROM information_schema.role_table_grants g
    WHERE g.table_schema = 'public'
      AND g.table_name = t
      AND g.grantee IN ('authenticated', 'anon', 'PUBLIC')
      AND g.privilege_type IN ('INSERT', 'UPDATE', 'DELETE');

    SELECT EXISTS (
      SELECT 1 FROM information_schema.role_table_grants g
      WHERE g.table_schema = 'public'
        AND g.table_name = t
        AND g.grantee = 'service_role'
        AND g.privilege_type = 'INSERT'
    ) INTO svc_insert;

    failures := '{}';
    IF NOT rls_on THEN failures := array_append(failures, 'rls disabled'); END IF;
    IF array_length(bad_policies, 1) IS NOT NULL THEN
      failures := array_append(failures, 'write policy: ' || array_to_string(bad_policies, ', '));
    END IF;
    IF array_length(bad_grants, 1) IS NOT NULL THEN
      failures := array_append(failures, 'write grant: ' || array_to_string(bad_grants, ', '));
    END IF;
    IF NOT svc_insert THEN failures := array_append(failures, 'service_role cannot INSERT'); END IF;

    report := report || jsonb_build_object(
      'table', t,
      'ok', coalesce(array_length(failures, 1), 0) = 0,
      'failures', to_jsonb(failures)
    );
  END LOOP;

  RETURN report;
END;
$$;

REVOKE ALL ON FUNCTION public.verify_billing_rls() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_billing_rls() TO service_role;

COMMENT ON FUNCTION public.verify_billing_rls() IS
  'Sources plan 6.1 (INV-1): per-table assertion that the six metering tables are service-role-write-only. Driven by scripts/verify-billing-rls.mjs.';
