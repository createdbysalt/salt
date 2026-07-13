-- Add enabled flag to profile_playbook_settings
-- Allows users to disable non-system playbooks

ALTER TABLE public.profile_playbook_settings
  ADD COLUMN IF NOT EXISTS enabled boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.profile_playbook_settings.enabled IS
  'Whether the playbook is enabled for this workspace. System playbooks cannot be disabled.';
