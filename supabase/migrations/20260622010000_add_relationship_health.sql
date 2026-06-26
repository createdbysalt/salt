-- ============================================================================
-- RELATIONSHIP HEALTH: Stored cache on people
-- ============================================================================
-- Archetype-aware relationship health scores for the People detail surface.
-- Mirrors the client health_score_cached pattern on clients.
-- ============================================================================

ALTER TABLE public.people
  ADD COLUMN IF NOT EXISTS relationship_health_score smallint,
  ADD COLUMN IF NOT EXISTS relationship_health_band text,
  ADD COLUMN IF NOT EXISTS relationship_health_archetype text,
  ADD COLUMN IF NOT EXISTS relationship_health_factors jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS relationship_health_version smallint DEFAULT 1,
  ADD COLUMN IF NOT EXISTS relationship_health_updated_at timestamptz;

ALTER TABLE public.people
  DROP CONSTRAINT IF EXISTS valid_relationship_health_score;

ALTER TABLE public.people
  ADD CONSTRAINT valid_relationship_health_score CHECK (
    relationship_health_score IS NULL
    OR (relationship_health_score >= 0 AND relationship_health_score <= 100)
  );

ALTER TABLE public.people
  DROP CONSTRAINT IF EXISTS valid_relationship_health_band;

ALTER TABLE public.people
  ADD CONSTRAINT valid_relationship_health_band CHECK (
    relationship_health_band IS NULL
    OR relationship_health_band = ANY (
      ARRAY['healthy'::text, 'watch'::text, 'risk'::text, 'insufficient'::text]
    )
  );

CREATE INDEX IF NOT EXISTS idx_people_relationship_health_score
  ON public.people (studio_id, relationship_health_score DESC)
  WHERE relationship_health_score IS NOT NULL;

COMMENT ON COLUMN public.people.relationship_health_score IS 'Cached relationship health score (0-100) by archetype rubric';
COMMENT ON COLUMN public.people.relationship_health_band IS 'Health band: healthy, watch, risk, or insufficient';
COMMENT ON COLUMN public.people.relationship_health_archetype IS 'Scoring archetype: revenue, pipeline, network, internal, neutral';
COMMENT ON COLUMN public.people.relationship_health_factors IS 'JSON array of contributing factors for UI explainability';
COMMENT ON COLUMN public.people.relationship_health_version IS 'Rubric version for future recalibration';
COMMENT ON COLUMN public.people.relationship_health_updated_at IS 'When relationship health was last computed';
