-- ============================================================================
-- CREATE: project_milestones table for one-time project tracking
-- ============================================================================
-- Milestones = major phases (client-facing, part of contract).
-- Tasks = individual work items (internal, grouped by milestone).
-- ============================================================================

-- Create project_milestones table
CREATE TABLE public.project_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id uuid NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  
  -- Milestone info
  title text NOT NULL,
  description text,
  
  -- Timeline
  due_at timestamptz,
  completed_at timestamptz,
  
  -- Status
  status text DEFAULT 'not_started',
  
  -- Ordering (for drag-and-drop / sequencing)
  order_index integer NOT NULL,
  
  -- Dependencies
  depends_on_milestone_id uuid REFERENCES public.project_milestones(id) ON DELETE SET NULL,
  
  -- Visibility
  client_visible boolean DEFAULT true,
  
  -- Timestamps
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  -- Constraints
  CONSTRAINT valid_milestone_status CHECK (
    status = ANY (ARRAY['not_started'::text, 'in_progress'::text, 'complete'::text])
  ),
  CONSTRAINT valid_order_index CHECK (order_index >= 0)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Fetch milestones for a project (ordered)
CREATE INDEX idx_project_milestones_project_order 
  ON public.project_milestones(project_id, order_index);

-- Lookup by studio (for aggregate queries)
CREATE INDEX idx_project_milestones_studio 
  ON public.project_milestones(studio_id);

-- Client-visible milestones
CREATE INDEX idx_project_milestones_client_visible 
  ON public.project_milestones(project_id, order_index) 
  WHERE client_visible = true;

-- Incomplete milestones (filter by date in query for overdue check)
CREATE INDEX idx_project_milestones_incomplete
  ON public.project_milestones(project_id, due_at)
  WHERE status != 'complete';

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.project_milestones ENABLE ROW LEVEL SECURITY;

-- Studio members can view milestones for their studio projects
CREATE POLICY "Studio members can view their project milestones"
  ON public.project_milestones FOR SELECT
  USING (
    studio_id IN (
      SELECT studio_id FROM public.studio_members
      WHERE user_id = auth.uid()
    )
  );

-- Studio members can create milestones for their studio projects
CREATE POLICY "Studio members can create project milestones"
  ON public.project_milestones FOR INSERT
  WITH CHECK (
    studio_id IN (
      SELECT studio_id FROM public.studio_members
      WHERE user_id = auth.uid()
    )
  );

-- Studio members can update their project milestones
CREATE POLICY "Studio members can update their project milestones"
  ON public.project_milestones FOR UPDATE
  USING (
    studio_id IN (
      SELECT studio_id FROM public.studio_members
      WHERE user_id = auth.uid()
    )
  );

-- Studio members can delete their project milestones
CREATE POLICY "Studio members can delete their project milestones"
  ON public.project_milestones FOR DELETE
  USING (
    studio_id IN (
      SELECT studio_id FROM public.studio_members
      WHERE user_id = auth.uid()
    )
  );

-- Client users can view milestones for their projects (only client-visible ones)
CREATE POLICY "Client users can view their project milestones"
  ON public.project_milestones FOR SELECT
  USING (
    client_visible = true
    AND project_id IN (
      SELECT p.id FROM public.projects p
      WHERE p.client_id IN (
        SELECT client_id FROM public.client_users
        WHERE user_id = auth.uid()
          AND status = 'active'
      )
    )
  );

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-set studio_id from project on insert
CREATE OR REPLACE FUNCTION public.set_project_milestone_studio_id()
RETURNS TRIGGER AS $$
BEGIN
  SELECT studio_id INTO NEW.studio_id
  FROM public.projects
  WHERE id = NEW.project_id;
  
  IF NEW.studio_id IS NULL THEN
    RAISE EXCEPTION 'Cannot create milestone: project % not found or has no studio_id', NEW.project_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_set_project_milestone_studio_id
  BEFORE INSERT ON public.project_milestones
  FOR EACH ROW
  WHEN (NEW.studio_id IS NULL)
  EXECUTE FUNCTION public.set_project_milestone_studio_id();

-- Update updated_at on changes
CREATE OR REPLACE FUNCTION public.update_project_milestones_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER project_milestones_updated_at
  BEFORE UPDATE ON public.project_milestones
  FOR EACH ROW
  EXECUTE FUNCTION public.update_project_milestones_updated_at();

-- Auto-set completed_at when status changes to 'complete'
CREATE OR REPLACE FUNCTION public.auto_set_milestone_completed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'complete' AND OLD.status != 'complete' THEN
    NEW.completed_at = now();
  ELSIF NEW.status != 'complete' AND OLD.status = 'complete' THEN
    -- If reverting from complete, clear completed_at
    NEW.completed_at = NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_auto_set_milestone_completed_at
  BEFORE UPDATE OF status ON public.project_milestones
  FOR EACH ROW
  WHEN (NEW.status IS DISTINCT FROM OLD.status)
  EXECUTE FUNCTION public.auto_set_milestone_completed_at();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.project_milestones IS 'Project milestones for one-time projects (major phases, client-facing)';
COMMENT ON COLUMN public.project_milestones.order_index IS 'Ordering for display and drag-and-drop (0-indexed)';
COMMENT ON COLUMN public.project_milestones.depends_on_milestone_id IS 'Optional dependency: this milestone depends on another milestone being completed first';
COMMENT ON COLUMN public.project_milestones.client_visible IS 'Whether clients can see this milestone in the Bridge (default true)';
COMMENT ON COLUMN public.project_milestones.status IS 'Milestone status: not_started, in_progress, or complete';

