-- ============================================================================
-- Projects: Health score cache (mirrors clients.health_score_cached pattern)
-- ============================================================================

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS health_score_cached smallint,
  ADD COLUMN IF NOT EXISTS health_band text,
  ADD COLUMN IF NOT EXISTS health_factors jsonb,
  ADD COLUMN IF NOT EXISTS health_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS health_version integer DEFAULT 1;

ALTER TABLE public.projects
  DROP CONSTRAINT IF EXISTS valid_project_health_score;

ALTER TABLE public.projects
  ADD CONSTRAINT valid_project_health_score CHECK (
    health_score_cached IS NULL OR (health_score_cached >= 0 AND health_score_cached <= 100)
  );

CREATE INDEX IF NOT EXISTS idx_projects_health_score
  ON public.projects(studio_id, health_score_cached)
  WHERE health_score_cached IS NOT NULL AND deleted_at IS NULL;

COMMENT ON COLUMN public.projects.health_score_cached IS 'Cached work health score (0-100) for display and sorting.';
COMMENT ON COLUMN public.projects.health_band IS 'Health band label: Healthy, Watch, or Needs attention.';
COMMENT ON COLUMN public.projects.health_factors IS 'JSON array of factor objects explaining the health score.';
COMMENT ON COLUMN public.projects.health_updated_at IS 'When the health score was last recomputed.';
COMMENT ON COLUMN public.projects.health_version IS 'Scoring algorithm version for cache invalidation.';
