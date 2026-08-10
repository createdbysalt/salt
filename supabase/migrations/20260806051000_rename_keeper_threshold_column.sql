-- Memory Care: rename the workspace auto-apply threshold column.
--
-- The column was introduced as keeper_auto_execute_threshold when Memory
-- maintenance ran as "Keeper" system playbooks. That system is retired and
-- replaced by Memory Care (app/_features/memory/care); the column keeps the
-- same semantics (workspace-level standard-tier bar, 50-100, default 85).

ALTER TABLE public.workspaces
  RENAME COLUMN keeper_auto_execute_threshold TO memory_care_auto_apply_threshold;

COMMENT ON COLUMN public.workspaces.memory_care_auto_apply_threshold IS
  'Memory Care auto-apply threshold (50-100). Standard-tier bar; sensitive and destructive field tiers raise it. Default 85.';
