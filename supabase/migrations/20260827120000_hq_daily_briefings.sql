-- ============================================================================
-- HQ Daily Briefings
-- ============================================================================
--
-- Persisted weekday-morning editorial briefing for HQ Today.
-- One row per workspace per calendar day (America/Toronto). The cron at
-- /api/cron/daily-briefing writes via service_role; workspace members may
-- SELECT their own rows. There is no authenticated write path — operators
-- do not author these rows.
--
-- Rollback:
--   DROP TABLE IF EXISTS public.hq_daily_briefings;
-- ============================================================================

CREATE TABLE public.hq_daily_briefings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  briefing_date date NOT NULL,
  content text NOT NULL,
  sections jsonb NOT NULL DEFAULT '{}'::jsonb,
  model text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT hq_daily_briefings_workspace_date_unique
    UNIQUE (workspace_id, briefing_date)
);

CREATE INDEX hq_daily_briefings_workspace_id_idx
  ON public.hq_daily_briefings(workspace_id);

ALTER TABLE public.hq_daily_briefings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_members_view_hq_daily_briefings"
  ON public.hq_daily_briefings
  FOR SELECT
  USING (public.is_workspace_member(workspace_id));

GRANT SELECT ON public.hq_daily_briefings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hq_daily_briefings TO service_role;
REVOKE INSERT, UPDATE, DELETE ON public.hq_daily_briefings FROM authenticated;
REVOKE ALL ON public.hq_daily_briefings FROM anon;

COMMENT ON TABLE public.hq_daily_briefings IS
  'HQ weekday-morning editorial briefing. Service-role writes (cron); members may SELECT.';
COMMENT ON COLUMN public.hq_daily_briefings.briefing_date IS
  'Calendar date in America/Toronto. Unique with workspace_id so the cron is idempotent.';
COMMENT ON COLUMN public.hq_daily_briefings.sections IS
  'Structured sections for HQ rendering: { urgent: string[], today: string[], relationships: string[] }.';
