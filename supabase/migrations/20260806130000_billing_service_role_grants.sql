-- ============================================================================
-- Billing tables: grant service_role the privileges it actually needs
-- ============================================================================
--
-- THE BUG
-- ----------------------------------------------------------------------------
-- `usage_events` and `workspace_subscriptions` denied `service_role` every
-- operation, including SELECT. Since `service_role` is the *only* writer of
-- both tables, the billing ledger could not record anything: every
-- `recordUsageEvent` call returned `permission denied for table usage_events`
-- (SQLSTATE 42501) from the moment the tables shipped on 2026-08-05.
--
-- It was silent because the ledger is deliberately non-fatal — metering must
-- never break the feature it observes — so each failure logged and the request
-- carried on. Play metering, Ask Salt fair use, and LLM cost tracking were all
-- writing into a void. Verified empirically against the linked project: the
-- two tables below denied SELECT to `service_role` while `play_runs`,
-- `workspaces`, and `tool_classifications` allowed it.
--
-- WHY IT HAPPENED
-- ----------------------------------------------------------------------------
-- Both creating migrations wrote an explicit grant block that named only
-- `authenticated` and `anon`:
--
--     GRANT SELECT ON public.usage_events TO authenticated;
--     REVOKE INSERT, UPDATE, DELETE ON public.usage_events FROM authenticated;
--     REVOKE ALL ON public.usage_events FROM anon;
--
-- and a comment reading "service_role bypasses RLS entirely and is the only
-- writer." That comment is true and irrelevant: bypassing RLS is not the same
-- as holding table privileges. `service_role` has BYPASSRLS, so no policy can
-- stop it — but a missing GRANT stops it before any policy is consulted.
-- Writing an explicit privilege block for a table opts it out of relying on
-- inherited defaults, and the block omitted the one role that mattters.
--
-- The lesson generalises: when a migration takes manual control of grants on a
-- table, it must name every role that touches it, including `service_role`.
--
-- ============================================================================

-- ─── usage_events ───────────────────────────────────────────────────────────
--
-- SELECT and INSERT only. UPDATE and DELETE are deliberately withheld even
-- from the sole writer: the `usage_events_immutable` trigger already rejects
-- them, and withholding the privilege as well means an application bug cannot
-- even attempt to rewrite billing history. Corrections are reversal rows.

GRANT SELECT, INSERT ON public.usage_events TO service_role;

-- ─── workspace_subscriptions ────────────────────────────────────────────────
--
-- UPDATE is required here, unlike above: `syncWorkspaceSubscription` upserts
-- on the Stripe webhook path, so a status or tier change is an UPDATE of the
-- existing row. DELETE stays withheld — cancellation is a status transition,
-- never a row removal, so billing history survives it.

GRANT SELECT, INSERT, UPDATE ON public.workspace_subscriptions TO service_role;

-- ─── Comments ───────────────────────────────────────────────────────────────

COMMENT ON TABLE public.usage_events IS
  'Append-only billing ledger (pricing G1). service_role holds SELECT + INSERT only; UPDATE/DELETE are withheld from every role and rejected by the usage_events_immutable trigger. Corrections are reversal rows, never updates.';
