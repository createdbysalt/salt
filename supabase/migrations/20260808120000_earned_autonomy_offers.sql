-- Earned-autonomy offers (Plays canon, Phase 4 / GROW).
-- Autonomy is granted by the user from an offer card, never silently flipped:
-- crossing the approval threshold creates a queued "autonomy offer" play_run;
-- granting sets autonomy_granted_at; the offer re-appears every
-- EARNED_AUTONOMY_THRESHOLD additional approvals if declined. Grants are
-- revocable in Settings → Plays.

ALTER TABLE public.playbook_action_approvals
  ADD COLUMN IF NOT EXISTS autonomy_granted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS autonomy_offered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS autonomy_declined_at TIMESTAMPTZ;

COMMENT ON COLUMN public.playbook_action_approvals.autonomy_granted_at IS
  'Set when the user accepts the autonomy offer. hasEarnedAutonomy checks this column only — no silent flips.';
COMMENT ON COLUMN public.playbook_action_approvals.autonomy_offered_at IS
  'Set when an offer play_run is created. Prevents duplicate offers while one is open.';
COMMENT ON COLUMN public.playbook_action_approvals.autonomy_declined_at IS
  'Set when the user dismisses an offer. The offer re-appears after another threshold of approvals.';
