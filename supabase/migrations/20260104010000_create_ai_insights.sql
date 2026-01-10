-- ============================================================================
-- CREATE: ai_insights cache table for storing generated insights
-- ============================================================================
-- Stores AI-generated insights per studio and time window
-- Reduces LLM API calls by caching weekly insights
-- ============================================================================

-- Create ai_insights table
CREATE TABLE IF NOT EXISTS public.ai_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id uuid NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,
  
  -- Time window for these insights
  timeframe text NOT NULL CHECK (timeframe = ANY (ARRAY['week'::text, 'month'::text, 'quarter'::text, 'year'::text])),
  range_start timestamptz NOT NULL,
  range_end timestamptz NOT NULL,
  
  -- Generated insights (array of insight objects)
  insights jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- Example: [
  --   {
  --     "statement": "Retainer clients have 3x higher LTV",
  --     "supporting_data": {"avg_retainer_ltv": 42000, "avg_project_ltv": 14000},
  --     "recommended_action": "Focus on converting project clients to retainers",
  --     "deep_link": "/dashboard/clients?filter=no-retainer"
  --   }
  -- ]
  
  -- Metadata
  generated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  model_used text, -- e.g., "gpt-4o-mini", "claude-3-5-sonnet"
  tokens_used integer,
  
  -- Timestamps
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  -- Unique constraint: one cache entry per studio + timeframe + range
  UNIQUE(studio_id, timeframe, range_start, range_end)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Lookup by studio + timeframe (most common query)
CREATE INDEX IF NOT EXISTS idx_ai_insights_studio_timeframe 
  ON public.ai_insights(studio_id, timeframe, range_end DESC);

-- Lookup by studio + generated date (for "last generated" checks)
CREATE INDEX IF NOT EXISTS idx_ai_insights_studio_generated 
  ON public.ai_insights(studio_id, generated_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;

-- Studio members can view cached insights for their studio
CREATE POLICY "Studio members can view their studio insights"
  ON public.ai_insights FOR SELECT
  USING (
    studio_id IN (
      SELECT studio_id FROM public.studio_members
      WHERE user_id = auth.uid()
    )
  );

-- Studio members can insert/update insights for their studio
CREATE POLICY "Studio members can create insights"
  ON public.ai_insights FOR INSERT
  WITH CHECK (
    studio_id IN (
      SELECT studio_id FROM public.studio_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Studio members can update their studio insights"
  ON public.ai_insights FOR UPDATE
  USING (
    studio_id IN (
      SELECT studio_id FROM public.studio_members
      WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.ai_insights IS 'Cached AI-generated insights per studio to reduce LLM API calls';
COMMENT ON COLUMN public.ai_insights.timeframe IS 'Time window: week, month, quarter, or year';
COMMENT ON COLUMN public.ai_insights.insights IS 'JSON array of insight objects with statement, data, action, and link';
COMMENT ON COLUMN public.ai_insights.model_used IS 'LLM model used for generation (e.g., gpt-4o-mini)';
COMMENT ON COLUMN public.ai_insights.tokens_used IS 'Total tokens consumed for this generation (for cost tracking)';

