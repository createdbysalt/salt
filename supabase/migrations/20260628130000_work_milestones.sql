-- Work milestones for milestone-based payment tracking
-- Enables splitting payments (e.g., 50% kickoff, 50% delivery)
-- Milestones can be triggered by stage progression or specific dates

CREATE TABLE IF NOT EXISTS public.work_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  work_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  percent NUMERIC(5,2) CHECK (percent > 0 AND percent <= 100),
  amount_cents INTEGER CHECK (amount_cents > 0),
  trigger_type TEXT NOT NULL DEFAULT 'manual' CHECK (trigger_type IN ('stage', 'date', 'manual')),
  trigger_stage TEXT,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'due', 'invoiced', 'paid', 'skipped')),
  became_due_at TIMESTAMPTZ,
  invoice_ref TEXT,
  paid_at TIMESTAMPTZ,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT work_milestones_has_value CHECK (percent IS NOT NULL OR amount_cents IS NOT NULL),
  CONSTRAINT work_milestones_trigger_stage CHECK (trigger_type != 'stage' OR trigger_stage IS NOT NULL),
  CONSTRAINT work_milestones_trigger_date CHECK (trigger_type != 'date' OR due_date IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS work_milestones_work_idx ON public.work_milestones(work_id);
CREATE INDEX IF NOT EXISTS work_milestones_workspace_idx ON public.work_milestones(workspace_id);
CREATE INDEX IF NOT EXISTS work_milestones_status_idx ON public.work_milestones(work_id, status) WHERE status IN ('pending', 'due', 'invoiced');
CREATE INDEX IF NOT EXISTS work_milestones_trigger_idx ON public.work_milestones(work_id, trigger_type, trigger_stage) WHERE trigger_type = 'stage' AND status = 'pending';

COMMENT ON TABLE public.work_milestones IS 'Payment milestones for work items (e.g., 50% kickoff, 50% delivery)';
COMMENT ON COLUMN public.work_milestones.percent IS 'Percentage of contract value for this milestone';
COMMENT ON COLUMN public.work_milestones.amount_cents IS 'Fixed amount in cents (alternative to percent)';
COMMENT ON COLUMN public.work_milestones.trigger_type IS 'When milestone becomes due: stage (on stage entry), date (on specific date), or manual';
COMMENT ON COLUMN public.work_milestones.trigger_stage IS 'Stage that triggers this milestone (when trigger_type = stage)';
COMMENT ON COLUMN public.work_milestones.status IS 'Payment status: pending, due, invoiced, paid, or skipped';
COMMENT ON COLUMN public.work_milestones.became_due_at IS 'When the milestone became due (stage reached or date passed)';
COMMENT ON COLUMN public.work_milestones.invoice_ref IS 'External invoice reference (Stripe invoice ID or manual ref)';

-- RLS
ALTER TABLE public.work_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_members_view_milestones" ON public.work_milestones
FOR SELECT USING (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "workspace_members_manage_milestones" ON public.work_milestones
FOR ALL USING (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'member')
  )
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_milestones TO authenticated;
