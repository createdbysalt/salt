-- ============================================================================
-- Sources plan 6.1 (INV-1) first catch: playbook_action_approvals grants
--
-- The verify_billing_rls() guard flagged that service_role holds NO
-- privileges on playbook_action_approvals (created 2026-08-06 without
-- grants). earned-autonomy.ts writes it via the admin client and swallows
-- the 42501 with a console.warn — approval counts (the earned-autonomy
-- ladder's input) have been silently failing to persist since the table
-- shipped. Same failure class as the usage_events void-write incident.
--
-- Fix matches the connector-platform tables pattern: full DML to
-- service_role, nothing beyond the existing member SELECT policy for
-- authenticated.
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.playbook_action_approvals TO service_role;
