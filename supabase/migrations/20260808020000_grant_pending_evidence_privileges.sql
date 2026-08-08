-- Repair: pending_evidence / pending_evidence_signals were created with RLS
-- policies (20260711200000) but no table privileges. On environments where
-- the tables missed the default-privilege grants, every authenticated read
-- fails with 42501 ("permission denied for table pending_evidence") and
-- /memory dies before render.
--
-- Idempotent: GRANT is a no-op when the privilege already exists.

GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.pending_evidence
  TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.pending_evidence_signals
  TO authenticated;

GRANT ALL
  ON TABLE public.pending_evidence
  TO service_role;

GRANT ALL
  ON TABLE public.pending_evidence_signals
  TO service_role;
