-- ============================================================================
-- BILLING MEMORY: Unified receivables and payables
-- ============================================================================
-- Creates a workspace-scoped Memory table for billing records sourced from
-- finance connectors, Ask Salt, and uploaded documents.
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE public.billing_direction AS ENUM ('receivable', 'payable');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.billing_status AS ENUM (
    'draft',
    'due',
    'overdue',
    'paid',
    'partial',
    'refunded',
    'disputed'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.billing_category AS ENUM ('contractor', 'software', 'other');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.billing_provider AS ENUM (
    'stripe',
    'quickbooks',
    'square',
    'shopify',
    'lemonsqueezy',
    'mercury',
    'manual'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.billing_origin AS ENUM ('found', 'added');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.billing_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,

  direction public.billing_direction NOT NULL,
  number TEXT,
  status public.billing_status NOT NULL DEFAULT 'draft',
  amount_cents INTEGER NOT NULL CHECK (amount_cents <> 0),
  amount_paid_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'usd' CHECK (currency IN ('usd', 'cad', 'gbp', 'eur', 'aud')),

  issued_at TIMESTAMPTZ,
  due_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,

  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  person_id UUID REFERENCES public.people(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  vendor_label TEXT,
  category public.billing_category,

  provider public.billing_provider NOT NULL DEFAULT 'manual',
  source TEXT NOT NULL DEFAULT 'user' CHECK (source IN ('user', 'imported', 'salt_inferred')),
  origin public.billing_origin NOT NULL DEFAULT 'added',
  workspace_integration_id UUID REFERENCES public.workspace_integrations(id) ON DELETE SET NULL,
  capture_event_id UUID REFERENCES public.capture_events(id) ON DELETE SET NULL,
  source_external_id TEXT,
  app_url TEXT,

  line_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  tags TEXT[] NOT NULL DEFAULT '{}'::text[],
  worth_attention JSONB,
  recurrence_series_id UUID,
  recurrence_cadence TEXT CHECK (recurrence_cadence IS NULL OR recurrence_cadence IN ('weekly', 'monthly', 'yearly')),
  recurrence_next_at TIMESTAMPTZ,
  extraction JSONB,
  duplicate_of UUID REFERENCES public.billing_records(id) ON DELETE SET NULL,
  source_document_path TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  CONSTRAINT billing_records_source_unique UNIQUE NULLS NOT DISTINCT (
    workspace_id, source_external_id
  ),
  CONSTRAINT billing_records_amount_paid_non_negative CHECK (amount_paid_cents >= 0)
);

CREATE INDEX IF NOT EXISTS idx_billing_records_workspace ON public.billing_records(workspace_id);
CREATE INDEX IF NOT EXISTS idx_billing_records_direction_status
  ON public.billing_records(workspace_id, direction, status);
CREATE INDEX IF NOT EXISTS idx_billing_records_due_at ON public.billing_records(due_at);
CREATE INDEX IF NOT EXISTS idx_billing_records_recurrence_series
  ON public.billing_records(recurrence_series_id)
  WHERE recurrence_series_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_billing_records_capture
  ON public.billing_records(capture_event_id)
  WHERE capture_event_id IS NOT NULL;

CREATE TRIGGER billing_records_updated_at
  BEFORE UPDATE ON public.billing_records
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.billing_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_members_view_billing_records"
  ON public.billing_records FOR SELECT
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "workspace_members_create_billing_records"
  ON public.billing_records FOR INSERT
  WITH CHECK (public.is_workspace_member(workspace_id));

CREATE POLICY "workspace_members_update_billing_records"
  ON public.billing_records FOR UPDATE
  USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));

CREATE POLICY "workspace_members_delete_billing_records"
  ON public.billing_records FOR DELETE
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "service_role_manage_billing_records"
  ON public.billing_records FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.billing_records TO authenticated;
GRANT ALL ON public.billing_records TO service_role;

COMMENT ON TABLE public.billing_records IS 'Workspace-scoped Billing Memory records across finance connectors, Ask Salt, and document intake';
COMMENT ON COLUMN public.billing_records.source_external_id IS 'Dedup key from source system, e.g. stripe:invoice:in_123';
COMMENT ON COLUMN public.billing_records.extraction IS 'Document or Ask Salt extraction metadata such as confidence and fields needing review';
