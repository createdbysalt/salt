-- Add scope items and invoice-ready fields to work/projects table

-- Payment terms enum
CREATE TYPE public.work_payment_terms AS ENUM (
  'due_on_receipt',
  'net_15',
  'net_30',
  'net_60'
);

-- Billing cycle enum (for retainers)
CREATE TYPE public.work_billing_cycle AS ENUM (
  'monthly',
  'quarterly',
  'annually'
);

-- Add new billing/invoice fields
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS scope_items JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS payment_terms public.work_payment_terms DEFAULT 'net_30',
  ADD COLUMN IF NOT EXISTS billing_contact_id UUID REFERENCES public.people(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS retainer_start_date DATE,
  ADD COLUMN IF NOT EXISTS billing_cycle public.work_billing_cycle,
  ADD COLUMN IF NOT EXISTS po_number TEXT;

-- Index for billing contact lookups
CREATE INDEX IF NOT EXISTS projects_billing_contact_id_idx ON public.projects(billing_contact_id);

-- Comments for documentation
COMMENT ON COLUMN public.projects.scope_items IS 'Array of scope/line items: [{id, description, amount_cents, status, invoiced_at}]';
COMMENT ON COLUMN public.projects.payment_terms IS 'Invoice payment terms: due_on_receipt, net_15, net_30, net_60';
COMMENT ON COLUMN public.projects.billing_contact_id IS 'Person to send invoices to (may differ from primary contact)';
COMMENT ON COLUMN public.projects.currency IS 'Currency code for billing (USD, CAD, EUR, etc.)';
COMMENT ON COLUMN public.projects.retainer_start_date IS 'When the retainer agreement started';
COMMENT ON COLUMN public.projects.billing_cycle IS 'Billing frequency for retainers: monthly, quarterly, annually';
COMMENT ON COLUMN public.projects.po_number IS 'Client purchase order number for invoices';

-- Add constraint to validate scope_items structure
ALTER TABLE public.projects
  ADD CONSTRAINT scope_items_valid_json CHECK (
    scope_items IS NULL OR jsonb_typeof(scope_items) = 'array'
  );
