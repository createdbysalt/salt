-- ============================================================================
-- STRUCTURED GOALS
-- Extends operator_goals with typed goal templates for revenue, clients, etc.
-- ============================================================================

-- Goal type enum
CREATE TYPE public.operator_goal_type AS ENUM (
  'revenue_target',
  'new_clients',
  'project_minimum',
  'work_hours',
  'custom'
);

-- Goal unit enum
CREATE TYPE public.operator_goal_unit AS ENUM (
  'dollars',
  'clients',
  'projects',
  'hours'
);

-- Add structured goal columns to existing table
ALTER TABLE public.operator_goals
  ADD COLUMN IF NOT EXISTS goal_type public.operator_goal_type NOT NULL DEFAULT 'custom',
  ADD COLUMN IF NOT EXISTS target_value NUMERIC,
  ADD COLUMN IF NOT EXISTS target_unit public.operator_goal_unit,
  ADD COLUMN IF NOT EXISTS target_period TEXT,
  ADD COLUMN IF NOT EXISTS current_value NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ai_progress JSONB DEFAULT '{}'::jsonb;

-- Migrate existing goals: they become custom type with title preserved
-- (No data migration needed since custom is the default and title/detail remain)

-- Index for filtering by goal type
CREATE INDEX IF NOT EXISTS idx_operator_goals_type
  ON public.operator_goals(workspace_id, user_id, goal_type);

COMMENT ON COLUMN public.operator_goals.goal_type IS 'Structured goal type or custom for free-form';
COMMENT ON COLUMN public.operator_goals.target_value IS 'Numeric target (dollars, count, hours depending on unit)';
COMMENT ON COLUMN public.operator_goals.target_unit IS 'What target_value represents';
COMMENT ON COLUMN public.operator_goals.target_period IS 'Timeframe: 2026, Q3 2026, weekly, etc.';
COMMENT ON COLUMN public.operator_goals.current_value IS 'Current progress in same unit as target_value';
COMMENT ON COLUMN public.operator_goals.ai_progress IS 'Salt analysis: summary, signals, recommendations';
