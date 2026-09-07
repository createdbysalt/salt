-- ============================================================================
-- Platform health checks: synthetic-monitoring results (Founder Ops Phase 1)
-- ============================================================================
--
-- Design of record: docs/plans/2026-08-29-admin-dashboard-composio-canary.md
--
-- The Outlook slug break (double-prefix OUTLOOK_OUTLOOK_* 404'd when Composio
-- reverted server-side) silently stubbed 655 emails for weeks because nothing
-- probed tool slugs. The hourly slug canary (app/_lib/composio/canary.ts,
-- /api/cron/composio-canary) writes one row per probed slug here; the admin
-- dashboard reads the latest result per slug, and the alert threshold
-- (2 consecutive failures) is computed from this history.
--
-- Append-only ops telemetry. No workspace_id — the Composio tool catalog is
-- platform-global, not tenant data.
--
-- RLS: enabled with ZERO policies. Ops data never reaches clients; only the
-- service role (cron writer, admin dashboard) bypasses RLS.
--
-- Rollback: DROP TABLE public.platform_health_checks;
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.platform_health_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Probe family ('slug_canary') + what was probed (tool slug) + its toolkit.
  kind text NOT NULL,
  target text NOT NULL,
  toolkit text NOT NULL,

  status text NOT NULL CHECK (status IN ('ok', 'failed')),
  -- 'tool_not_found' (dead slug, cause status 404) | 'schema_missing'
  -- (200 but no input schema) | 'composio_5xx' | 'http_<status>' | 'probe_error'
  error_code text,
  error_message text,
  latency_ms integer,

  checked_at timestamptz NOT NULL DEFAULT now()
);

-- Streak computation + dashboard read the most recent rows per target.
CREATE INDEX IF NOT EXISTS platform_health_checks_target_recent_idx
  ON public.platform_health_checks (kind, target, checked_at DESC);

ALTER TABLE public.platform_health_checks ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.platform_health_checks IS
  'Append-only platform ops telemetry (slug canary results). Service-role only — no user reads; RLS enabled with no policies by design.';
