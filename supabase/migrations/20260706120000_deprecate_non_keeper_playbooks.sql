-- ============================================================================
-- DEPRECATE NON-KEEPER ACTING PLAYBOOKS (pre-launch curation)
-- ============================================================================
--
-- Founder decision 2026-07-06: hide the three compiled acting playbooks
-- (meeting-recap, overdue-invoice-reminder, quiet-lead-nudge) from the Plays
-- Customize surface until playbook authoring v2 is planned
-- (.cursor/plans/2026-07-03-playbook-authoring-and-ask-salt.md). Keeper
-- record playbooks are unaffected.
--
-- Deprecation, not deletion: listPlaybookBlueprints() filters status =
-- 'active', so these rows disappear from the UI but keep their versions,
-- evals, and FK integrity. No workspace has adopted any of the three
-- (play_templates verified empty on staging 2026-07-06), so no adopted
-- templates or runs are orphaned. Reactivate by setting status back to
-- 'active'. Idempotent.
-- ============================================================================

UPDATE public.playbook_blueprints
SET status = 'deprecated', updated_at = now()
WHERE slug IN ('meeting-recap', 'overdue-invoice-reminder', 'quiet-lead-nudge')
  AND status = 'active';
