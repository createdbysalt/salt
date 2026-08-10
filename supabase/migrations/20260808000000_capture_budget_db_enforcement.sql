-- Capture budget: atomic DB-side enforcement (Sources plan 3.1b, option A).
--
-- The app's count-then-insert budget check has a TOCTOU window: concurrent
-- webhook fan-in all read 499, all admit, and the daily cap overshoots by the
-- number of in-flight requests. The only place the check can be exact is the
-- insert itself, so a BEFORE INSERT trigger serializes budget-consuming
-- inserts per workspace (advisory xact lock), re-counts inside the same
-- transaction, and stamps the row noise when the cap is hit.
--
-- Scope: connector intake only — origin = 'found' AND source_type IS NOT NULL
-- (the ingestEnvelope shape). Manual adds (origin = 'added') and system rows
-- that omit source_type are never budget-stamped. Noise/drop/held rows are
-- free by construction (no enrichment, no evidence, no LLM) and neither
-- consume nor contend for budget; legacy NULL-gate rows (pre-gate backfill
-- path) consumed enrichment and keep counting. Mirrors the app-side peek in
-- app/_features/capture/services/capture-budget.ts, which remains as a cheap
-- pre-check (it gates the paid Outlook hydration fetch) — the trigger is
-- authoritative, and ingestEnvelope branches on the returned gate_action.

-- 1. The limit lives in the DB: a trigger cannot read app env, and one limit
--    with one owner beats an env var and a table drifting apart. Ops adjust
--    via UPDATE (service_role only; users must never touch cost controls).
CREATE TABLE public.capture_budget_config (
  singleton BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (singleton),
  daily_limit INTEGER NOT NULL DEFAULT 500 CHECK (daily_limit > 0),
  window_hours INTEGER NOT NULL DEFAULT 24 CHECK (window_hours > 0)
);

INSERT INTO public.capture_budget_config DEFAULT VALUES;

ALTER TABLE public.capture_budget_config ENABLE ROW LEVEL SECURITY;

-- Default privileges grant broadly; name every role explicitly (billing-RLS
-- lesson: silence is not evidence — verify grants, not just policies).
REVOKE ALL ON public.capture_budget_config FROM anon, authenticated;
GRANT SELECT, UPDATE ON public.capture_budget_config TO service_role;

-- 2. Atomic budget stamp at insert.
CREATE OR REPLACE FUNCTION public.enforce_capture_budget()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit INTEGER;
  v_window INTEGER;
  v_count INTEGER;
BEGIN
  -- Only connector intake contends for budget.
  IF NEW.origin IS DISTINCT FROM 'found' OR NEW.source_type IS NULL THEN
    RETURN NEW;
  END IF;

  -- Free rows never consume or contend for budget.
  IF NEW.gate_action IN ('noise', 'drop', 'held') THEN
    RETURN NEW;
  END IF;

  SELECT daily_limit, window_hours INTO v_limit, v_window
  FROM public.capture_budget_config;
  IF v_limit IS NULL THEN
    -- Fail open: a broken config must never block ingestion (same bargain as
    -- the app-side check).
    RETURN NEW;
  END IF;

  -- Serialize budget-consuming inserts per workspace; concurrent fan-in
  -- queues here instead of double-admitting past the cap.
  PERFORM pg_advisory_xact_lock(
    hashtext('capture_budget_' || NEW.workspace_id::text)
  );

  SELECT count(*) INTO v_count
  FROM public.capture_events
  WHERE workspace_id = NEW.workspace_id
    AND origin = 'found'
    AND source_type IS NOT NULL
    AND created_at >= now() - make_interval(hours => v_window)
    AND (gate_action IS NULL OR gate_action NOT IN ('noise', 'drop', 'held'));

  IF v_count >= v_limit THEN
    NEW.gate_action := 'noise';
    NEW.gate_result := coalesce(NEW.gate_result, '{}'::jsonb)
      || jsonb_build_object(
           'budgetExceeded', TRUE,
           'budgetEnforcedBy', 'db_trigger'
         );
    -- Mirror mergeIntelligenceMeta(extracted, { outcome, scanned_at }):
    -- the intelligence key is REPLACED wholesale, timestamp in the same
    -- ISO-8601 shape as Date.prototype.toISOString().
    NEW.extracted_data := coalesce(NEW.extracted_data, '{}'::jsonb)
      || jsonb_build_object(
           'intelligence', jsonb_build_object(
             'outcome', 'no_signal',
             'scanned_at', to_char(
               now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
             )
           )
         );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS capture_budget_enforcer ON public.capture_events;
CREATE TRIGGER capture_budget_enforcer
  BEFORE INSERT ON public.capture_events
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_capture_budget();

COMMENT ON FUNCTION public.enforce_capture_budget() IS
  'Atomic daily capture budget: stamps connector-intake rows noise past the cap. Authoritative over the app-side peek in capture-budget.ts (Sources plan 3.1b).';
