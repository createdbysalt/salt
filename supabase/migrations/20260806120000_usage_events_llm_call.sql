-- ============================================================================
-- Usage Events: `llm_call` event type (Pricing G10 — cost meter)
-- ============================================================================
--
-- Adds the event type for raw language-model spend recorded at `sendLlm`.
--
-- WHY A NEW TYPE RATHER THAN REUSING ONE
-- ----------------------------------------------------------------------------
-- The existing types describe *outcomes* a customer would recognise: a play
-- ran, an action was sent, a capture was processed. `sendLlm` spend is not an
-- outcome — it is the raw cost underneath many different outcomes (voice
-- extraction, record summaries, capture classification, play drafting). Folding
-- it into `capture_processed` would make that type mean two different things
-- and quietly corrupt any per-outcome cost analysis built on it.
--
-- These rows are always `billable = false`. They feed the margin monitor and
-- the circuit breaker; they never reach a customer invoice. Customers are
-- billed per play, never per token.
--
-- VOLUME NOTE
-- ----------------------------------------------------------------------------
-- This is the highest-cardinality event type in the ledger: one row per model
-- call, and a single capture scan can make hundreds. The partial index on
-- `billable = true` deliberately excludes these rows, so bundle counting stays
-- fast no matter how much LEARN-layer spend accumulates. The new index below
-- covers the complementary read — "cost by type for this workspace in this
-- window" — which is what the margin monitor and the Ask Salt fair-use window
-- both run, and which previously fell back to a workspace-wide scan.
-- ============================================================================

-- ─── Extend the event type constraint ───────────────────────────────────────
--
-- The original constraint is inline and therefore auto-named. Dropping by the
-- generated name with IF EXISTS keeps this migration idempotent and safe to
-- re-run against a project where it has already applied.

ALTER TABLE public.usage_events
  DROP CONSTRAINT IF EXISTS usage_events_event_type_check;

ALTER TABLE public.usage_events
  ADD CONSTRAINT usage_events_event_type_check
  CHECK (event_type IN (
    'play_executed',
    'action_sent',
    'ask_salt_query',
    'capture_ingested',
    'capture_processed',
    'storage_delta',
    'llm_call'
  ));

-- ─── Index for cost-meter and fair-use reads ────────────────────────────────
--
-- Complements idx_usage_events_billable_period, which is partial on
-- `billable = true` and so cannot serve reads over non-billable rows —
-- precisely the rows the cost meter cares about.

CREATE INDEX IF NOT EXISTS idx_usage_events_type_period
  ON public.usage_events(workspace_id, event_type, created_at DESC);

-- ─── Comments ───────────────────────────────────────────────────────────────

COMMENT ON INDEX public.idx_usage_events_type_period IS
  'Cost meter and Ask Salt fair-use window: usage by type for a workspace over a period. Non-partial because the rows it serves are billable = false.';
