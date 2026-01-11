-- ============================================================================
-- CREATE: SEO Alerts Table (seo_alerts)
-- ============================================================================
-- Tracks significant score changes in SEO audits.
-- Alerts are created when any Lighthouse category drops >10 points.
-- Studios can dismiss alerts after reviewing them.
-- ============================================================================

-- ============================================================================
-- SEO_ALERTS TABLE
-- ============================================================================
-- Stores alert records when significant score drops are detected.
-- studio_id is denormalized for efficient RLS (same pattern as other tables).

CREATE TABLE public.seo_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  studio_id uuid NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,

  -- Alert type (extensible for future alert types)
  alert_type text NOT NULL,

  -- Human-readable message
  message text NOT NULL,

  -- Additional metadata (category, old score, new score, etc.)
  metadata jsonb DEFAULT '{}'::jsonb NOT NULL,

  -- Dismissal tracking
  is_dismissed boolean DEFAULT false NOT NULL,
  dismissed_at timestamptz,
  dismissed_by uuid REFERENCES auth.users(id),

  -- Timestamps
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,

  -- Constraints
  CONSTRAINT seo_alerts_alert_type_check CHECK (
    alert_type IN ('score_drop', 'critical_score', 'audit_failed')
  )
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Query by project (alerts for a specific project)
CREATE INDEX idx_seo_alerts_project_id
  ON public.seo_alerts(project_id);

-- Query by studio (all alerts for studio dashboard)
CREATE INDEX idx_seo_alerts_studio_id
  ON public.seo_alerts(studio_id);

-- Query undismissed alerts (most common query for badge counts)
CREATE INDEX idx_seo_alerts_undismissed
  ON public.seo_alerts(studio_id, is_dismissed, created_at DESC)
  WHERE is_dismissed = false;

-- Query by project + dismissed status
CREATE INDEX idx_seo_alerts_project_status
  ON public.seo_alerts(project_id, is_dismissed, created_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.seo_alerts ENABLE ROW LEVEL SECURITY;

-- Studio members can view SEO alerts for their studio's projects
CREATE POLICY "Studio members can view their SEO alerts"
  ON public.seo_alerts FOR SELECT
  USING (
    studio_id IN (
      SELECT studio_id FROM public.studio_members
      WHERE user_id = auth.uid()
    )
  );

-- Studio members can create SEO alerts for their studio's projects
CREATE POLICY "Studio members can create SEO alerts"
  ON public.seo_alerts FOR INSERT
  WITH CHECK (
    studio_id IN (
      SELECT studio_id FROM public.studio_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin', 'member')
    )
  );

-- Studio members can update their studio's SEO alerts (for dismissal)
CREATE POLICY "Studio members can update SEO alerts"
  ON public.seo_alerts FOR UPDATE
  USING (
    studio_id IN (
      SELECT studio_id FROM public.studio_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin', 'member')
    )
  );

-- Studio members can delete their studio's SEO alerts
CREATE POLICY "Studio members can delete SEO alerts"
  ON public.seo_alerts FOR DELETE
  USING (
    studio_id IN (
      SELECT studio_id FROM public.studio_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin', 'member')
    )
  );

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Automatically set studio_id from project on insert
CREATE OR REPLACE FUNCTION public.set_seo_alerts_studio_id()
RETURNS TRIGGER AS $$
BEGIN
  SELECT p.studio_id INTO NEW.studio_id
  FROM public.projects p
  WHERE p.id = NEW.project_id;

  IF NEW.studio_id IS NULL THEN
    RAISE EXCEPTION 'seo_alerts.project_id % does not map to a project with a studio_id', NEW.project_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_set_seo_alerts_studio_id
  BEFORE INSERT ON public.seo_alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.set_seo_alerts_studio_id();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.seo_alerts IS 'SEO alerts for significant score changes and issues';
COMMENT ON COLUMN public.seo_alerts.alert_type IS 'Type of alert: score_drop, critical_score, audit_failed';
COMMENT ON COLUMN public.seo_alerts.message IS 'Human-readable alert message';
COMMENT ON COLUMN public.seo_alerts.metadata IS 'JSONB with category, old_score, new_score, etc.';
COMMENT ON COLUMN public.seo_alerts.is_dismissed IS 'Whether the alert has been reviewed and dismissed';
