-- ============================================================================
-- CREATE: SEO Monitoring Tables (seo_configs and seo_audits)
-- ============================================================================
-- Powers SEO monitoring for projects via Lighthouse and CrUX APIs.
-- Studios can track performance, accessibility, best practices, and SEO scores.
-- Clients can view curated SEO metrics via Bridge.
-- ============================================================================

-- ============================================================================
-- SEO_CONFIGS TABLE
-- ============================================================================
-- One config per project. Stores domain, tracking toggle, and client visibility settings.
-- studio_id is denormalized for efficient RLS (same pattern as other tables).

CREATE TABLE public.seo_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  studio_id uuid NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,

  -- SEO configuration
  domain text,
  is_enabled boolean DEFAULT false NOT NULL,

  -- Client visibility settings (which metrics clients can see)
  client_visible_metrics jsonb DEFAULT '{
    "performance": true,
    "seo": true,
    "accessibility": true,
    "bestPractices": true,
    "detailedFindings": false,
    "trendCharts": true
  }'::jsonb NOT NULL,

  -- Timestamps
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,

  -- One config per project
  CONSTRAINT seo_configs_project_id_unique UNIQUE (project_id)
);

-- ============================================================================
-- SEO_AUDITS TABLE
-- ============================================================================
-- Stores audit results from Lighthouse and CrUX APIs.
-- Each audit captures scores and raw data for time-series analysis.

CREATE TABLE public.seo_audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  studio_id uuid NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,

  -- Audit type: 'lighthouse' for PageSpeed Insights, 'crux' for Core Web Vitals
  audit_type text NOT NULL,

  -- Scores (0-100 for Lighthouse, actual values for CrUX)
  scores jsonb NOT NULL,

  -- Full API response for detailed breakdowns
  raw_data jsonb,

  -- When the audit was performed
  audited_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,

  -- Timestamps
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,

  -- Constraints
  CONSTRAINT seo_audits_audit_type_check CHECK (
    audit_type IN ('lighthouse', 'crux')
  )
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- seo_configs: Query by project (fetch config for project)
CREATE INDEX idx_seo_configs_project_id
  ON public.seo_configs(project_id);

-- seo_configs: Query by studio (list all configs for studio)
CREATE INDEX idx_seo_configs_studio_id
  ON public.seo_configs(studio_id);

-- seo_configs: Query enabled configs (for cron jobs)
CREATE INDEX idx_seo_configs_enabled
  ON public.seo_configs(studio_id, is_enabled)
  WHERE is_enabled = true;

-- seo_audits: Query by project + time (most recent first)
CREATE INDEX idx_seo_audits_project_audited
  ON public.seo_audits(project_id, audited_at DESC);

-- seo_audits: Query by studio (list all audits for studio)
CREATE INDEX idx_seo_audits_studio_id
  ON public.seo_audits(studio_id);

-- seo_audits: Query by type (separate Lighthouse from CrUX)
CREATE INDEX idx_seo_audits_project_type
  ON public.seo_audits(project_id, audit_type, audited_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.seo_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_audits ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SEO_CONFIGS RLS POLICIES
-- ============================================================================

-- Studio members can view SEO configs for their studio's projects
CREATE POLICY "Studio members can view their SEO configs"
  ON public.seo_configs FOR SELECT
  USING (
    studio_id IN (
      SELECT studio_id FROM public.studio_members
      WHERE user_id = auth.uid()
    )
  );

-- Studio members can create SEO configs for their studio's projects
CREATE POLICY "Studio members can create SEO configs"
  ON public.seo_configs FOR INSERT
  WITH CHECK (
    studio_id IN (
      SELECT studio_id FROM public.studio_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin', 'member')
    )
  );

-- Studio members can update their studio's SEO configs
CREATE POLICY "Studio members can update SEO configs"
  ON public.seo_configs FOR UPDATE
  USING (
    studio_id IN (
      SELECT studio_id FROM public.studio_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin', 'member')
    )
  );

-- Studio members can delete their studio's SEO configs
CREATE POLICY "Studio members can delete SEO configs"
  ON public.seo_configs FOR DELETE
  USING (
    studio_id IN (
      SELECT studio_id FROM public.studio_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin', 'member')
    )
  );

-- Client users can view SEO configs for their projects (to check visibility settings)
CREATE POLICY "Client users can view their project SEO configs"
  ON public.seo_configs FOR SELECT
  USING (
    project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.client_users cu ON cu.client_id = p.client_id
      WHERE cu.user_id = auth.uid()
        AND cu.status = 'active'
    )
  );

-- ============================================================================
-- SEO_AUDITS RLS POLICIES
-- ============================================================================

-- Studio members can view SEO audits for their studio's projects
CREATE POLICY "Studio members can view their SEO audits"
  ON public.seo_audits FOR SELECT
  USING (
    studio_id IN (
      SELECT studio_id FROM public.studio_members
      WHERE user_id = auth.uid()
    )
  );

-- Studio members can create SEO audits for their studio's projects
CREATE POLICY "Studio members can create SEO audits"
  ON public.seo_audits FOR INSERT
  WITH CHECK (
    studio_id IN (
      SELECT studio_id FROM public.studio_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin', 'member')
    )
  );

-- Studio members can delete their studio's SEO audits (for cleanup)
CREATE POLICY "Studio members can delete SEO audits"
  ON public.seo_audits FOR DELETE
  USING (
    studio_id IN (
      SELECT studio_id FROM public.studio_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin', 'member')
    )
  );

-- Client users can view SEO audits for their projects
CREATE POLICY "Client users can view their project SEO audits"
  ON public.seo_audits FOR SELECT
  USING (
    project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.client_users cu ON cu.client_id = p.client_id
      WHERE cu.user_id = auth.uid()
        AND cu.status = 'active'
    )
  );

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update seo_configs.updated_at on changes
CREATE OR REPLACE FUNCTION public.update_seo_configs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER seo_configs_updated_at
  BEFORE UPDATE ON public.seo_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_seo_configs_updated_at();

-- Automatically set studio_id from project on insert
CREATE OR REPLACE FUNCTION public.set_seo_configs_studio_id()
RETURNS TRIGGER AS $$
BEGIN
  SELECT p.studio_id INTO NEW.studio_id
  FROM public.projects p
  WHERE p.id = NEW.project_id;

  IF NEW.studio_id IS NULL THEN
    RAISE EXCEPTION 'seo_configs.project_id % does not map to a project with a studio_id', NEW.project_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_set_seo_configs_studio_id
  BEFORE INSERT ON public.seo_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.set_seo_configs_studio_id();

-- Automatically set studio_id from project on insert for audits
CREATE OR REPLACE FUNCTION public.set_seo_audits_studio_id()
RETURNS TRIGGER AS $$
BEGIN
  SELECT p.studio_id INTO NEW.studio_id
  FROM public.projects p
  WHERE p.id = NEW.project_id;

  IF NEW.studio_id IS NULL THEN
    RAISE EXCEPTION 'seo_audits.project_id % does not map to a project with a studio_id', NEW.project_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_set_seo_audits_studio_id
  BEFORE INSERT ON public.seo_audits
  FOR EACH ROW
  EXECUTE FUNCTION public.set_seo_audits_studio_id();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.seo_configs IS 'SEO monitoring configuration per project - domain, enabled status, client visibility';
COMMENT ON COLUMN public.seo_configs.domain IS 'Website domain to audit (e.g., https://example.com)';
COMMENT ON COLUMN public.seo_configs.is_enabled IS 'Whether SEO tracking is enabled for this project';
COMMENT ON COLUMN public.seo_configs.client_visible_metrics IS 'JSONB object controlling which metrics clients can see in Bridge';

COMMENT ON TABLE public.seo_audits IS 'SEO audit results from Lighthouse and CrUX APIs';
COMMENT ON COLUMN public.seo_audits.audit_type IS 'Source of audit: lighthouse (PageSpeed Insights) or crux (Chrome UX Report)';
COMMENT ON COLUMN public.seo_audits.scores IS 'JSONB with category scores (0-100 for Lighthouse, actual values for CrUX)';
COMMENT ON COLUMN public.seo_audits.raw_data IS 'Full API response for detailed audit breakdowns';
COMMENT ON COLUMN public.seo_audits.audited_at IS 'When the audit was performed';
