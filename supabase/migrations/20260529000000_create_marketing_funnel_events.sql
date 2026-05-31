-- ============================================================================
-- MARKETING FUNNEL EVENTS
-- Lightweight event log for waitlist conversion measurement (homepage view → signup).
-- Inserts via service role from /api/marketing/waitlist-funnel.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.marketing_funnel_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event text NOT NULL,
  path text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT marketing_funnel_events_event_not_blank CHECK (length(trim(event)) > 0)
);

CREATE INDEX IF NOT EXISTS marketing_funnel_events_event_created_at_idx
  ON public.marketing_funnel_events (event, created_at DESC);

ALTER TABLE public.marketing_funnel_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_manage_marketing_funnel_events"
  ON public.marketing_funnel_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

GRANT ALL ON TABLE public.marketing_funnel_events TO service_role;
