-- ============================================================================
-- Work Health v2: Add archetype column
-- ============================================================================
-- Archetypes determine which scoring factors apply:
--   recurring (retainer), delivery (project/event), utilization (hourly),
--   pipeline (proposal), transactional (quick)
-- ============================================================================

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS health_archetype text;

ALTER TABLE public.projects
  DROP CONSTRAINT IF EXISTS valid_project_health_archetype;

ALTER TABLE public.projects
  ADD CONSTRAINT valid_project_health_archetype CHECK (
    health_archetype IS NULL OR health_archetype IN (
      'recurring', 'delivery', 'utilization', 'pipeline', 'transactional'
    )
  );

COMMENT ON COLUMN public.projects.health_archetype IS 'Work health archetype: recurring, delivery, utilization, pipeline, or transactional. Derived from work_type.';
