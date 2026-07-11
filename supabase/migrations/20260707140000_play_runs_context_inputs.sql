-- Add context_inputs to play_runs for pre-filled entity references
-- Plan: .cursor/plans/2026-07-03-playbook-authoring-and-ask-salt.md (Phase 2)
--
-- When Ask SALT proposes a play from natural language ("send Dana the invoice"),
-- entity references resolve to IDs at proposal time and land here. The executor
-- merges them into the step context so fetch/llm/act steps can use them.

ALTER TABLE public.play_runs
  ADD COLUMN IF NOT EXISTS context_inputs jsonb DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.play_runs.context_inputs IS
  'Pre-filled entity refs from natural language: {person_id, org_id, work_id, billing_id, ...}. Merged into step context at run time.';
