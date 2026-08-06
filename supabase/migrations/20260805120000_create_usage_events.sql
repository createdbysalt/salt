-- ============================================================================
-- Usage Events Ledger (Pricing G1 — metering integrity)
-- ============================================================================
--
-- Append-only ledger. The single source of truth for everything Salt bills.
-- Every other pricing guardrail (G4 auto-credit, G5 overage, G7 margin
-- monitor, G10 cost variance) reads from this table.
--
-- SECURITY MODEL — read this before adding a policy
-- ------------------------------------------------------------------------
-- Workspace members may SELECT their own usage. Nobody with a user session
-- may INSERT, UPDATE, or DELETE. Writes happen exclusively through the
-- service-role client in `app/_lib/usage/ledger.ts`.
--
-- This is deliberate and load-bearing. `workspaces` grants UPDATE to
-- `authenticated` under a policy of `USING (owner_id = auth.uid())` with no
-- WITH CHECK, so any owner can PATCH their own workspace row through
-- PostgREST. Billing state must therefore never live on a table a user can
-- write, and the ledger must never accept a client-supplied row.
--
-- Do NOT add a `workspace_members_manage_usage_events` policy. The bulk
-- policy loop in 20260625193000_active_workspace_id_rename.sql generates
-- that shape for every workspace-scoped table; this table is an intentional
-- exception, enforced below by REVOKE and by an immutability trigger.
--
-- Append-only is enforced at the database, not by convention: the
-- `usage_events_immutable` trigger rejects UPDATE and DELETE even from
-- service_role, so an application bug cannot rewrite billing history.
-- Corrections are made by inserting a reversal row (see `reverses_event_id`).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,

  -- Nullable. Reserved for the deferred team model (G6 per-seat attribution).
  -- Single-seat workspaces attribute all usage at the workspace level.
  seat_id UUID REFERENCES public.workspace_members(id) ON DELETE SET NULL,

  event_type TEXT NOT NULL CHECK (event_type IN (
    'play_executed',
    'action_sent',
    'ask_salt_query',
    'capture_ingested',
    'capture_processed',
    'storage_delta'
  )),

  -- Whether this event consumes the workspace's play bundle. Internal/system
  -- plays are recorded with billable = false: they are LEARN-layer spend that
  -- must stay visible to the margin monitor without ever reaching an invoice.
  billable BOOLEAN NOT NULL DEFAULT false,

  -- Itemized COGS (G10). Micro-USD (millionths of a dollar) because a single
  -- Composio action costs ~$0.002 and would round to zero in whole cents.
  -- Integer math throughout — no floating point in the billing path.
  cost_estimate_micros BIGINT NOT NULL DEFAULT 0
    CHECK (cost_estimate_micros >= 0),
  -- e.g. {"ai": 12000, "composio": 4000, "tools": ["GMAIL_SEND_EMAIL"]}
  cost_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Idempotency (G1). A play that retries three times bills once: the key is
  -- derived from the play run id, which is stable across retries.
  idempotency_key TEXT NOT NULL,

  play_run_id UUID REFERENCES public.play_runs(id) ON DELETE SET NULL,
  -- Derived from tool contracts at execution time, not judged per play.
  external_effect BOOLEAN,

  -- Reversal support (G4 auto-credit). A correction is a new row pointing at
  -- the row it cancels, never a mutation of the original.
  reverses_event_id UUID REFERENCES public.usage_events(id) ON DELETE RESTRICT,
  reversal_reason TEXT CHECK (reversal_reason IN (
    'play_failed',
    'user_thumbs_down',
    'support_credit',
    'billing_correction'
  )),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT usage_events_idempotency UNIQUE (workspace_id, idempotency_key),
  -- A reversal must say why; a normal event must not claim a reason.
  CONSTRAINT usage_events_reversal_coherent CHECK (
    (reverses_event_id IS NULL AND reversal_reason IS NULL)
    OR (reverses_event_id IS NOT NULL AND reversal_reason IS NOT NULL)
  )
);

-- ─── Indexes ────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_usage_events_workspace
  ON public.usage_events(workspace_id);

-- Serves the hot path: "billable plays for this workspace this period".
-- Partial so the bundle count never scans unbillable LEARN-layer rows.
CREATE INDEX IF NOT EXISTS idx_usage_events_billable_period
  ON public.usage_events(workspace_id, event_type, created_at DESC)
  WHERE billable = true;

CREATE INDEX IF NOT EXISTS idx_usage_events_play_run
  ON public.usage_events(play_run_id)
  WHERE play_run_id IS NOT NULL;

-- Nightly reconciliation (G1) walks reversals to net the ledger.
CREATE INDEX IF NOT EXISTS idx_usage_events_reverses
  ON public.usage_events(reverses_event_id)
  WHERE reverses_event_id IS NOT NULL;

-- ─── Append-only enforcement ────────────────────────────────────────────────
--
-- Applies to service_role too. Billing history is immutable by construction,
-- so a bug in application code can only ever add rows, never rewrite them.

CREATE OR REPLACE FUNCTION public.reject_usage_event_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  RAISE EXCEPTION
    'usage_events is append-only: % rejected. Insert a reversal row instead.',
    TG_OP
    USING ERRCODE = 'restrict_violation';
END;
$$;

DROP TRIGGER IF EXISTS usage_events_immutable ON public.usage_events;
CREATE TRIGGER usage_events_immutable
  BEFORE UPDATE OR DELETE ON public.usage_events
  FOR EACH ROW EXECUTE FUNCTION public.reject_usage_event_mutation();

-- ─── RLS ────────────────────────────────────────────────────────────────────

ALTER TABLE public.usage_events ENABLE ROW LEVEL SECURITY;

-- Read-only visibility so the billing page can show a workspace its own usage.
CREATE POLICY "workspace_members_view_usage_events"
  ON public.usage_events FOR SELECT
  USING (public.is_workspace_member(workspace_id));

-- No INSERT / UPDATE / DELETE policy exists for `authenticated` by design.
-- service_role bypasses RLS entirely and is the only writer.

-- ─── Grants ─────────────────────────────────────────────────────────────────

GRANT SELECT ON public.usage_events TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.usage_events FROM authenticated;
REVOKE ALL ON public.usage_events FROM anon;

-- ─── Comments ───────────────────────────────────────────────────────────────

COMMENT ON TABLE public.usage_events IS
  'Append-only billing ledger (pricing G1). Service-role writes only; enforced append-only by the usage_events_immutable trigger. Corrections are reversal rows, never updates.';
COMMENT ON COLUMN public.usage_events.idempotency_key IS
  'Stable per billable occurrence. Play metering uses play_<run_id> so retries of the same run bill exactly once.';
COMMENT ON COLUMN public.usage_events.cost_estimate_micros IS
  'Itemized COGS in micro-USD (1e-6 USD). Integer to keep the billing path free of floating point.';
COMMENT ON COLUMN public.usage_events.billable IS
  'False for internal/system plays and LEARN-layer spend: visible to the margin monitor, never invoiced.';
COMMENT ON COLUMN public.usage_events.seat_id IS
  'Reserved for the deferred team model (G6). Null for single-seat workspaces.';
