-- ============================================================================
-- RETAINER HOURS: Manual time tracking for retainer projects
-- ============================================================================
-- Enables studio members to log time entries for retainer projects
-- Clients can view hours used/remaining with monthly reset
-- ============================================================================

-- Create project_retainers table
CREATE TABLE IF NOT EXISTS public.project_retainers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id uuid NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  project_id uuid NOT NULL UNIQUE REFERENCES public.projects(id) ON DELETE CASCADE,
  
  -- Retainer configuration
  included_hours_per_month numeric NOT NULL,
  hourly_rate_cents integer NULL, -- Optional for value display
  active boolean NOT NULL DEFAULT true,
  
  -- Timestamps
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  -- Constraints
  CONSTRAINT valid_hours CHECK (included_hours_per_month > 0),
  CONSTRAINT valid_rate CHECK (hourly_rate_cents IS NULL OR hourly_rate_cents > 0)
);

-- Create retainer_time_entries table
CREATE TABLE IF NOT EXISTS public.retainer_time_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id uuid NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  retainer_id uuid NOT NULL REFERENCES public.project_retainers(id) ON DELETE CASCADE,
  
  -- Time entry details
  work_date date NOT NULL,
  hours numeric NOT NULL,
  description text NOT NULL,
  
  -- Tracking
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Timestamps
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  -- Constraints
  CONSTRAINT valid_hours CHECK (hours > 0 AND hours <= 24),
  CONSTRAINT valid_description CHECK (length(description) > 0 AND length(description) <= 500)
);

-- Indexes for performance
CREATE INDEX idx_project_retainers_studio_id ON public.project_retainers(studio_id);
CREATE INDEX idx_project_retainers_client_id ON public.project_retainers(client_id);
CREATE INDEX idx_project_retainers_project_id ON public.project_retainers(project_id);
CREATE INDEX idx_project_retainers_active ON public.project_retainers(studio_id, active) WHERE active = true;

CREATE INDEX idx_retainer_time_entries_retainer_id ON public.retainer_time_entries(retainer_id);
CREATE INDEX idx_retainer_time_entries_work_date ON public.retainer_time_entries(work_date DESC);
CREATE INDEX idx_retainer_time_entries_studio_id ON public.retainer_time_entries(studio_id);
CREATE INDEX idx_retainer_time_entries_project_id ON public.retainer_time_entries(project_id);

-- Composite indexes for monthly summaries
CREATE INDEX idx_retainer_time_entries_retainer_month ON public.retainer_time_entries(
  retainer_id,
  work_date DESC
);

-- Enable RLS
ALTER TABLE public.project_retainers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retainer_time_entries ENABLE ROW LEVEL SECURITY;

-- RLS Policies: project_retainers

-- Studio members can view retainers for their studios
CREATE POLICY "Studio members can view their retainers"
  ON public.project_retainers FOR SELECT
  USING (
    studio_id IN (
      SELECT studio_id FROM public.studio_members
      WHERE user_id = auth.uid()
    )
  );

-- Studio members can create retainers for their studios
CREATE POLICY "Studio members can create retainers"
  ON public.project_retainers FOR INSERT
  WITH CHECK (
    studio_id IN (
      SELECT studio_id FROM public.studio_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin', 'member')
    )
  );

-- Studio members can update their retainers
CREATE POLICY "Studio members can update their retainers"
  ON public.project_retainers FOR UPDATE
  USING (
    studio_id IN (
      SELECT studio_id FROM public.studio_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin', 'member')
    )
  );

-- Studio members can delete their retainers
CREATE POLICY "Studio members can delete their retainers"
  ON public.project_retainers FOR DELETE
  USING (
    studio_id IN (
      SELECT studio_id FROM public.studio_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

-- Client users can view retainers for their projects
CREATE POLICY "Client users can view their retainers"
  ON public.project_retainers FOR SELECT
  USING (
    client_id IN (
      SELECT client_id FROM public.client_users
      WHERE user_id = auth.uid()
    )
    AND active = true
  );

-- RLS Policies: retainer_time_entries

-- Studio members can view time entries for their studios
CREATE POLICY "Studio members can view their time entries"
  ON public.retainer_time_entries FOR SELECT
  USING (
    studio_id IN (
      SELECT studio_id FROM public.studio_members
      WHERE user_id = auth.uid()
    )
  );

-- Studio members can create time entries for their studios
CREATE POLICY "Studio members can create time entries"
  ON public.retainer_time_entries FOR INSERT
  WITH CHECK (
    studio_id IN (
      SELECT studio_id FROM public.studio_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin', 'member')
    )
  );

-- Studio members can update their time entries
CREATE POLICY "Studio members can update their time entries"
  ON public.retainer_time_entries FOR UPDATE
  USING (
    studio_id IN (
      SELECT studio_id FROM public.studio_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin', 'member')
    )
  );

-- Studio members can delete their time entries
CREATE POLICY "Studio members can delete their time entries"
  ON public.retainer_time_entries FOR DELETE
  USING (
    studio_id IN (
      SELECT studio_id FROM public.studio_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin', 'member')
    )
  );

-- Client users can view time entries for their retainers (read-only)
CREATE POLICY "Client users can view their time entries"
  ON public.retainer_time_entries FOR SELECT
  USING (
    client_id IN (
      SELECT client_id FROM public.client_users
      WHERE user_id = auth.uid()
    )
  );

-- Comments
COMMENT ON TABLE public.project_retainers IS 'Retainer configuration per project with monthly hour allocations';
COMMENT ON TABLE public.retainer_time_entries IS 'Manual time entries logged by studio members for retainer projects';
COMMENT ON COLUMN public.project_retainers.included_hours_per_month IS 'Monthly hour allocation (e.g., 8.0 hours)';
COMMENT ON COLUMN public.project_retainers.hourly_rate_cents IS 'Optional hourly rate for value display (in cents)';
COMMENT ON COLUMN public.retainer_time_entries.work_date IS 'Date the work was performed';
COMMENT ON COLUMN public.retainer_time_entries.hours IS 'Hours spent (can be fractional, e.g., 0.5)';
COMMENT ON COLUMN public.retainer_time_entries.description IS 'Brief description of work performed';


