-- Create billing_accounts table for computed billing metrics
-- This denormalizes billing metrics for faster queries and removes legacy dependency

CREATE TABLE IF NOT EXISTS public.billing_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,

  -- Entity link (either org or person, not both)
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  person_id UUID REFERENCES public.people(id) ON DELETE CASCADE,

  -- Computed metrics
  mrr_cents INTEGER DEFAULT 0,
  lifetime_revenue_cents INTEGER DEFAULT 0,
  outstanding_cents INTEGER DEFAULT 0,
  total_paid_cents INTEGER DEFAULT 0,
  retainer_label TEXT,

  -- Source tracking
  source TEXT DEFAULT 'billing_records' CHECK (source IN ('billing_records', 'manual', 'legacy_migration')),
  last_computed_at TIMESTAMPTZ,

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Either org or person, not both
  CONSTRAINT billing_account_entity CHECK (
    (organization_id IS NOT NULL AND person_id IS NULL) OR
    (organization_id IS NULL AND person_id IS NOT NULL)
  )
);

-- Indexes for lookups
CREATE INDEX IF NOT EXISTS idx_billing_accounts_org ON billing_accounts(organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_billing_accounts_person ON billing_accounts(person_id) WHERE person_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_billing_accounts_workspace ON billing_accounts(workspace_id);

-- Unique constraint: one billing account per entity
CREATE UNIQUE INDEX IF NOT EXISTS idx_billing_accounts_unique_org ON billing_accounts(organization_id) WHERE organization_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_billing_accounts_unique_person ON billing_accounts(person_id) WHERE person_id IS NOT NULL;

-- Enable RLS
ALTER TABLE billing_accounts ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Workspace members can view billing accounts"
  ON billing_accounts FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage billing accounts"
  ON billing_accounts FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Updated_at trigger
CREATE TRIGGER set_billing_accounts_updated_at
  BEFORE UPDATE ON billing_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Grant permissions
GRANT SELECT ON billing_accounts TO authenticated;
GRANT ALL ON billing_accounts TO service_role;
