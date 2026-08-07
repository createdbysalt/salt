-- ============================================================================
-- Month-to-date COGS aggregate (pricing G7 — margin monitor / circuit breaker)
-- ============================================================================
--
-- `canSpend()` gates every vendor-spend exit point on one number: what this
-- workspace has cost us so far this billing period, in micro-USD. That is a
-- SUM over the ledger, and it has to be cheap enough to sit in front of an LLM
-- call without adding meaningful latency.
--
-- WHY AN RPC RATHER THAN A POSTGREST QUERY
-- ---------------------------------------------------------------------------
-- PostgREST aggregate functions are disabled by default in Supabase, so the
-- alternative is selecting every matching row and summing in Node. A busy
-- workspace generates one `llm_call` row per model call — the highest
-- cardinality type in the ledger — so that transfers thousands of rows across
-- the wire to produce a single integer, on a path that runs before every spend.
-- Aggregating in the database keeps it one round trip and one value.
--
-- SECURITY INVOKER, NOT DEFINER
-- ---------------------------------------------------------------------------
-- The only caller is the service-role client, which already bypasses RLS, so
-- SECURITY DEFINER would buy nothing and would leave a privilege-escalating
-- function sitting in a schema that `authenticated` can reach. EXECUTE is
-- granted to service_role alone; `authenticated` calling this would see only
-- rows its own RLS policy allows, which is the correct failure mode rather
-- than a leak.
--
-- Grants name service_role explicitly. Functions default to EXECUTE for
-- PUBLIC, and the REVOKE below removes that — which also removes it from
-- service_role, exactly the trap that left `usage_events` unwritable in
-- 20260806130000. Every role that needs the function is named after the
-- REVOKE, not assumed.
-- ============================================================================

-- Serves the aggregate as an index-only scan: the range is (workspace_id,
-- created_at) and the summed column rides along in the leaf, so the heap is
-- never touched. Distinct from idx_usage_events_billable_period, which is
-- partial on `billable = true` and therefore cannot answer a COGS question —
-- most spend is non-billable by design.
CREATE INDEX IF NOT EXISTS idx_usage_events_workspace_period
  ON public.usage_events(workspace_id, created_at DESC)
  INCLUDE (cost_estimate_micros);

CREATE OR REPLACE FUNCTION public.workspace_cogs_micros(
  p_workspace_id UUID,
  p_since TIMESTAMPTZ,
  p_until TIMESTAMPTZ DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE sql
STABLE
SET search_path = pg_catalog, public
AS $$
  -- Reversal rows carry cost 0 and the original keeps its COGS, so a plain SUM
  -- is already correct: a credited play still cost real vendor money and must
  -- stay visible to the margin monitor even though it left the invoice.
  SELECT COALESCE(SUM(cost_estimate_micros), 0)::BIGINT
    FROM public.usage_events
   WHERE workspace_id = p_workspace_id
     AND created_at >= p_since
     AND (p_until IS NULL OR created_at < p_until);
$$;

REVOKE ALL ON FUNCTION public.workspace_cogs_micros(UUID, TIMESTAMPTZ, TIMESTAMPTZ)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.workspace_cogs_micros(UUID, TIMESTAMPTZ, TIMESTAMPTZ)
  TO service_role;

COMMENT ON FUNCTION public.workspace_cogs_micros(UUID, TIMESTAMPTZ, TIMESTAMPTZ) IS
  'Month-to-date vendor COGS for a workspace in micro-USD. Drives canSpend() in app/_lib/usage/can-spend.ts. Service-role only.';
