-- ============================================================================
-- BILLING MEMORY: Payment reconciliation
-- ============================================================================
-- Stores payment events that can be matched to billing_records. This powers
-- the "payment received -> matched to invoice" magic moment while preserving
-- undo/review semantics.
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE public.billing_payment_match_status AS ENUM ('matched', 'unmatched', 'reversed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.billing_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  billing_record_id UUID REFERENCES public.billing_records(id) ON DELETE CASCADE,

  amount_cents INTEGER NOT NULL CHECK (amount_cents <> 0),
  currency TEXT NOT NULL DEFAULT 'usd' CHECK (currency IN ('usd', 'cad', 'gbp', 'eur', 'aud')),
  paid_at TIMESTAMPTZ,

  provider public.billing_provider NOT NULL,
  source_external_id TEXT,
  capture_event_id UUID REFERENCES public.capture_events(id) ON DELETE SET NULL,

  match_status public.billing_payment_match_status NOT NULL DEFAULT 'unmatched',
  match_confidence INTEGER CHECK (match_confidence >= 0 AND match_confidence <= 100),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  CONSTRAINT billing_payments_source_unique UNIQUE NULLS NOT DISTINCT (
    workspace_id, source_external_id
  )
);

CREATE INDEX IF NOT EXISTS idx_billing_payments_workspace ON public.billing_payments(workspace_id);
CREATE INDEX IF NOT EXISTS idx_billing_payments_record ON public.billing_payments(billing_record_id)
  WHERE billing_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_billing_payments_match_status
  ON public.billing_payments(workspace_id, match_status);
CREATE INDEX IF NOT EXISTS idx_billing_payments_capture ON public.billing_payments(capture_event_id)
  WHERE capture_event_id IS NOT NULL;

CREATE TRIGGER billing_payments_updated_at
  BEFORE UPDATE ON public.billing_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.billing_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_members_view_billing_payments"
  ON public.billing_payments FOR SELECT
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "workspace_members_create_billing_payments"
  ON public.billing_payments FOR INSERT
  WITH CHECK (public.is_workspace_member(workspace_id));

CREATE POLICY "workspace_members_update_billing_payments"
  ON public.billing_payments FOR UPDATE
  USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));

CREATE POLICY "workspace_members_delete_billing_payments"
  ON public.billing_payments FOR DELETE
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "service_role_manage_billing_payments"
  ON public.billing_payments FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.billing_payments TO authenticated;
GRANT ALL ON public.billing_payments TO service_role;

COMMENT ON TABLE public.billing_payments IS 'Payment events and reconciliation state for Billing Memory';
COMMENT ON COLUMN public.billing_payments.match_status IS 'matched, unmatched, or reversed to support reviewable reconciliation';
