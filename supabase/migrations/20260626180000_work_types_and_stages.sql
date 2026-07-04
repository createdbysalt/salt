-- Add work_type and lifecycle stage fields to work table

-- Work type enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'work_type') THEN
    CREATE TYPE public.projects_type AS ENUM (
      'project',
      'retainer',
      'hourly',
      'proposal',
      'quick',
      'event'
    );
  END IF;
END $$;

-- Add columns to work table
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS work_type public.projects_type DEFAULT 'project',
  ADD COLUMN IF NOT EXISTS stage TEXT,
  ADD COLUMN IF NOT EXISTS stage_entered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS progress_override INTEGER CHECK (progress_override >= 0 AND progress_override <= 100);

-- Index for filtering by work type
CREATE INDEX IF NOT EXISTS idx_work_type ON public.projects(work_type);

-- Index for filtering by stage
CREATE INDEX IF NOT EXISTS idx_work_stage ON public.projects(stage) WHERE stage IS NOT NULL;

-- Trigger to auto-update stage_entered_at when stage changes
CREATE OR REPLACE FUNCTION public.projects_stage_change_trigger()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.stage IS DISTINCT FROM NEW.stage THEN
    NEW.stage_entered_at = NOW();

    -- Log lifecycle event
    INSERT INTO public.lifecycle_events (
      workspace_id,
      entity_type,
      entity_id,
      event_type,
      from_value,
      to_value,
      source,
      because
    ) VALUES (
      NEW.workspace_id,
      'work',
      NEW.id,
      'status_change',
      OLD.stage,
      NEW.stage,
      'manual',
      'Stage changed'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS work_stage_change ON public.projects;
CREATE TRIGGER work_stage_change
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  WHEN (OLD.stage IS DISTINCT FROM NEW.stage)
  EXECUTE FUNCTION public.projects_stage_change_trigger();

-- Comment for documentation
COMMENT ON COLUMN public.projects.work_type IS 'Type of work: project, retainer, hourly, proposal, quick, event';
COMMENT ON COLUMN public.projects.stage IS 'Current lifecycle stage (varies by work_type)';
COMMENT ON COLUMN public.projects.stage_entered_at IS 'When the current stage was entered';
COMMENT ON COLUMN public.projects.started_at IS 'When work actually began';
COMMENT ON COLUMN public.projects.delivered_at IS 'When deliverables were handed off';
COMMENT ON COLUMN public.projects.closed_at IS 'When work was officially closed';
COMMENT ON COLUMN public.projects.progress_override IS 'Manual progress override (0-100), null = auto-calculate from stage';
