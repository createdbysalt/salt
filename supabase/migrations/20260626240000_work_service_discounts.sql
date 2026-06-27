-- Link work to services and add discount fields
-- Services act as templates; work instances can override pricing

-- Add service link to work (projects table)
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS service_id UUID REFERENCES public.workspace_services(id) ON DELETE SET NULL;

-- Add discount fields
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS discount_percent NUMERIC(5,2) CHECK (discount_percent >= 0 AND discount_percent <= 100),
  ADD COLUMN IF NOT EXISTS discount_amount_cents BIGINT CHECK (discount_amount_cents >= 0),
  ADD COLUMN IF NOT EXISTS discount_reason TEXT,
  ADD COLUMN IF NOT EXISTS final_price_cents BIGINT,
  ADD COLUMN IF NOT EXISTS estimated_timeline TEXT;

-- Index for filtering work by service
CREATE INDEX IF NOT EXISTS idx_projects_service_id ON public.projects(service_id) WHERE service_id IS NOT NULL;

-- Comments
COMMENT ON COLUMN public.projects.service_id IS 'Optional link to workspace service template. Null = custom/ad-hoc work.';
COMMENT ON COLUMN public.projects.discount_percent IS 'Percentage discount (0-100). Mutually exclusive with discount_amount_cents.';
COMMENT ON COLUMN public.projects.discount_amount_cents IS 'Flat discount in cents. Mutually exclusive with discount_percent.';
COMMENT ON COLUMN public.projects.discount_reason IS 'Why the discount was applied (e.g., returning client, referral, pilot).';
COMMENT ON COLUMN public.projects.final_price_cents IS 'Final price after discounts. Computed from contract_value_cents minus discount.';
COMMENT ON COLUMN public.projects.estimated_timeline IS 'Estimated timeline, copied from service or custom. E.g., "2-4 weeks".';
