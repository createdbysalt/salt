-- ============================================================================
-- SERVICE ITEMS: Transactional bridge between services and work/billing
-- ============================================================================
-- Creates instances of services attached to work records or billing records.
-- This is the "middle layer" enabling: catalog → work → invoice flow.
-- ============================================================================

-- Pricing type enum for service items (matches workspace_services + adds milestone)
DO $$ BEGIN
  CREATE TYPE public.service_item_pricing_type AS ENUM (
    'fixed',
    'hourly',
    'retainer',
    'milestone'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Billing interval enum (reuse if exists, else create)
DO $$ BEGIN
  CREATE TYPE public.service_item_billing_interval AS ENUM (
    'monthly',
    'quarterly',
    'annually'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.service_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Tenant scoping (required)
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,

  -- Source service template (nullable - can be ad-hoc/custom item)
  service_id UUID REFERENCES public.workspace_services(id) ON DELETE SET NULL,

  -- Attached to ONE of these (nullable FKs, check constraint enforces at least one)
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  billing_record_id UUID REFERENCES public.billing_records(id) ON DELETE CASCADE,

  -- Item details (copied from service or entered directly)
  name TEXT NOT NULL,
  description TEXT,
  deliverables TEXT[] DEFAULT '{}',

  -- Pricing
  pricing_type public.service_item_pricing_type NOT NULL DEFAULT 'fixed',
  quantity NUMERIC(10,2) DEFAULT 1 CHECK (quantity > 0),
  unit_price_cents INTEGER CHECK (unit_price_cents >= 0),
  total_price_cents INTEGER CHECK (total_price_cents >= 0),
  currency TEXT NOT NULL DEFAULT 'USD' CHECK (currency IN ('USD', 'EUR', 'GBP', 'CAD', 'AUD')),

  -- Hourly work fields
  hours_estimate NUMERIC(10,2) CHECK (hours_estimate >= 0),
  hours_used NUMERIC(10,2) DEFAULT 0 CHECK (hours_used >= 0),
  hourly_rate_cents INTEGER CHECK (hourly_rate_cents >= 0),

  -- Retainer fields
  billing_interval public.service_item_billing_interval,
  hours_included NUMERIC(10,2) CHECK (hours_included >= 0),

  -- Completion tracking
  deliverables_completed INTEGER DEFAULT 0 CHECK (deliverables_completed >= 0),
  completed_at TIMESTAMPTZ,

  -- Sort order within parent
  sort_order INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- At least one parent must be set
  CONSTRAINT service_items_has_parent CHECK (
    project_id IS NOT NULL OR billing_record_id IS NOT NULL
  )
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_service_items_workspace
  ON public.service_items(workspace_id);

CREATE INDEX IF NOT EXISTS idx_service_items_project
  ON public.service_items(project_id)
  WHERE project_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_service_items_billing
  ON public.service_items(billing_record_id)
  WHERE billing_record_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_service_items_service
  ON public.service_items(service_id)
  WHERE service_id IS NOT NULL;

-- Updated_at trigger
CREATE TRIGGER service_items_updated_at
  BEFORE UPDATE ON public.service_items
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Enable RLS
ALTER TABLE public.service_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Workspace members can CRUD their own items
CREATE POLICY "workspace_members_view_service_items"
  ON public.service_items FOR SELECT
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "workspace_members_create_service_items"
  ON public.service_items FOR INSERT
  WITH CHECK (public.is_workspace_member(workspace_id));

CREATE POLICY "workspace_members_update_service_items"
  ON public.service_items FOR UPDATE
  USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));

CREATE POLICY "workspace_members_delete_service_items"
  ON public.service_items FOR DELETE
  USING (public.is_workspace_member(workspace_id));

-- Service role has full access (for system operations)
CREATE POLICY "service_role_manage_service_items"
  ON public.service_items FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_items TO authenticated;
GRANT ALL ON public.service_items TO service_role;

-- Documentation
COMMENT ON TABLE public.service_items IS 'Service instances attached to work records or billing records - bridges catalog to transactions';
COMMENT ON COLUMN public.service_items.service_id IS 'Source service template (nullable for ad-hoc items)';
COMMENT ON COLUMN public.service_items.project_id IS 'Work record this item belongs to';
COMMENT ON COLUMN public.service_items.billing_record_id IS 'Billing record (invoice) this item belongs to';
COMMENT ON COLUMN public.service_items.pricing_type IS 'How this item is priced: fixed, hourly, retainer, milestone';
COMMENT ON COLUMN public.service_items.hours_used IS 'Actual hours logged against this item';
COMMENT ON COLUMN public.service_items.hours_included IS 'Hours included in retainer (per billing interval)';
COMMENT ON COLUMN public.service_items.deliverables_completed IS 'Count of completed deliverables (for progress tracking)';
