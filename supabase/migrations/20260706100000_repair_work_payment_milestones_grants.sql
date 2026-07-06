-- Repair: work_payment_milestones grants.
--
-- The original table (20260628130000_work_milestones.sql) granted only to
-- authenticated — service_role was never granted, so PostgREST service-role
-- reads returned 42501 (found by the pre-release work_id-wave verification,
-- 2026-07-06). The 20260704110000 rename carried the gap forward, and the
-- work_milestones compat view (security-invoker) surfaces the same denial.

GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_payment_milestones TO service_role;

-- Assert (post-push schema assertion iron rule)
DO $$
BEGIN
  IF NOT has_table_privilege('service_role', 'public.work_payment_milestones', 'SELECT') THEN
    RAISE EXCEPTION 'service_role still lacks SELECT on work_payment_milestones';
  END IF;
END $$;
