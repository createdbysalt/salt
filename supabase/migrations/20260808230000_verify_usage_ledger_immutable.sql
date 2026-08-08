-- ============================================================================
-- Sources plan 6.6 (INV-7): behavioral proof that usage_events is append-only
--
-- The usage_events_immutable trigger rejects UPDATE/DELETE even from
-- service_role. A migration that drops that trigger would silently make
-- billing history rewritable, and no unit test (mocked DB) would notice.
--
-- This function proves the behavior with a live probe: it inserts a probe
-- row, attempts UPDATE and DELETE inside subtransactions, then raises an
-- exception carrying the report — so the whole probe ROLLS BACK and the
-- ledger is never actually mutated. The report reaches the caller through
-- the error message (PostgREST surfaces it as HTTP 400), which the driver
-- script parses:
--
--   op run --env-file=.env.staging.1password -- node scripts/verify-ledger-immutable.mjs
--
-- "As authenticated" coverage is the other half of INV-7 and is asserted by
-- verify_billing_rls() (6.1): authenticated holds no UPDATE/DELETE grant or
-- policy on usage_events at all.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.verify_usage_ledger_immutable()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  ws_id uuid;
  probe_id uuid;
  trigger_present boolean;
  update_blocked boolean := false;
  delete_blocked boolean := false;
  update_error text;
  delete_error text;
  report jsonb;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_catalog.pg_trigger t
    JOIN pg_catalog.pg_class c ON c.oid = t.tgrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'usage_events'
      AND t.tgname = 'usage_events_immutable'
      AND NOT t.tgisinternal
  ) INTO trigger_present;

  SELECT id INTO ws_id FROM public.workspaces ORDER BY created_at LIMIT 1;

  IF ws_id IS NULL THEN
    RAISE EXCEPTION 'USAGE_LEDGER_IMMUTABILITY_REPORT: %',
      jsonb_build_object('skipped', true, 'reason', 'no workspace row to probe against');
  END IF;

  INSERT INTO public.usage_events (
    workspace_id, event_type, billable, idempotency_key, cost_estimate_micros
  ) VALUES (
    ws_id, 'play_executed', false,
    'immutability-probe-' || gen_random_uuid(), 0
  )
  RETURNING id INTO probe_id;

  BEGIN
    UPDATE public.usage_events SET billable = true WHERE id = probe_id;
    update_error := 'UPDATE succeeded — trigger missing or disabled';
  EXCEPTION
    WHEN restrict_violation THEN
      update_blocked := SQLERRM LIKE 'usage_events is append-only%';
      update_error := SQLERRM;
    WHEN OTHERS THEN
      update_error := SQLSTATE || ': ' || SQLERRM;
  END;

  BEGIN
    DELETE FROM public.usage_events WHERE id = probe_id;
    delete_error := 'DELETE succeeded — trigger missing or disabled';
  EXCEPTION
    WHEN restrict_violation THEN
      delete_blocked := SQLERRM LIKE 'usage_events is append-only%';
      delete_error := SQLERRM;
    WHEN OTHERS THEN
      delete_error := SQLSTATE || ': ' || SQLERRM;
  END;

  report := jsonb_build_object(
    'skipped', false,
    'trigger_present', trigger_present,
    'update_blocked', update_blocked,
    'delete_blocked', delete_blocked,
    'update_detail', update_error,
    'delete_detail', delete_error
  );

  -- Roll the probe back by aborting the statement. The report rides out in
  -- the exception message; nothing is committed, proven or not.
  RAISE EXCEPTION 'USAGE_LEDGER_IMMUTABILITY_REPORT: %', report;
END;
$$;

REVOKE ALL ON FUNCTION public.verify_usage_ledger_immutable() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_usage_ledger_immutable() TO service_role;

COMMENT ON FUNCTION public.verify_usage_ledger_immutable() IS
  'Sources plan 6.6 (INV-7): behavioral probe that usage_events rejects UPDATE/DELETE. Always raises — the report is in the message and the probe rolls back. Driven by scripts/verify-ledger-immutable.mjs.';
