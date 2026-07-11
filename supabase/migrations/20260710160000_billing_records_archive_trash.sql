-- ============================================================================
-- BILLING MEMORY: archive + trash lifecycle (parity with people/orgs/work)
-- Archive = archived_at set (hidden from active lists, reversible)
-- Trash = deleted_at set (auto-purged after 30 days)
-- ============================================================================

ALTER TABLE public.billing_records
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS idx_billing_records_archived_at
  ON public.billing_records(workspace_id, archived_at)
  WHERE archived_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_billing_records_deleted_at_purge
  ON public.billing_records(deleted_at)
  WHERE deleted_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_billing_records_active_list
  ON public.billing_records(workspace_id, direction, status)
  WHERE deleted_at IS NULL AND archived_at IS NULL;

COMMENT ON COLUMN public.billing_records.archived_at IS 'When billing record was archived. Hidden from active lists but restorable.';
COMMENT ON COLUMN public.billing_records.deleted_at IS 'When billing record was moved to trash. Permanently deleted after 30 days.';
COMMENT ON COLUMN public.billing_records.deleted_by IS 'User who moved billing record to trash (audit trail).';
