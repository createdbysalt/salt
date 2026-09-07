-- ============================================================================
-- Earned-autonomy analytics: track dismissals alongside approvals (Phase 4)
-- ============================================================================
--
-- playbook_action_approvals counted only executed approvals. The approval
-- RATE (approved / (approved + dismissed)) is what informs ask → auto
-- promotion: a step the user keeps dismissing should never be offered
-- autonomy, no matter how many times it was approved before.
--
-- Rollback:
--   ALTER TABLE public.playbook_action_approvals
--     DROP COLUMN dismissed_count, DROP COLUMN last_dismissed_at;
-- ============================================================================

ALTER TABLE public.playbook_action_approvals
  ADD COLUMN IF NOT EXISTS dismissed_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_dismissed_at timestamptz;

COMMENT ON COLUMN public.playbook_action_approvals.dismissed_count IS
  'Queued approval runs the user dismissed for this playbook+tool. With approved_count, forms the approval rate that informs ask → auto promotion.';
