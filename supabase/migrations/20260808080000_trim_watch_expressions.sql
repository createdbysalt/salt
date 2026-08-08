-- Remove the pending_contact half of entity_watch_expressions (Phase 1.16b)
--
-- pending_contact watches were a dead feature on a live table:
-- createPendingContactWatch had zero callers, the known-entity gate never
-- received admission signals, and graduation never ran. pending_evidence
-- (Fellegi-Sunter) is the canonical watch-then-propose system for new records.
-- entity_watch_expressions survives purely as the known-entity match index
-- (existing_entity): register on create, match at the gate, re-enrich.
--
-- Also drops record_capture_decisions.watch_expression_id — it only ever
-- pointed at pending_contact expressions and was never written.

-- 1. Dead FK column first (never written; only meaningful for pending_contact)
DROP INDEX IF EXISTS public.idx_rcd_watch_expression;
ALTER TABLE public.record_capture_decisions
  DROP COLUMN IF EXISTS watch_expression_id;

-- 2. Remove dead pending_contact rows
DELETE FROM public.entity_watch_expressions
  WHERE watch_purpose = 'pending_contact';

-- 3. Expiry machinery was pending_contact-only (existing_entity watches
--    don't expire)
DROP TRIGGER IF EXISTS trg_set_watch_expiry ON public.entity_watch_expressions;
DROP TRIGGER IF EXISTS trg_reset_watch_expiry ON public.entity_watch_expressions;
DROP FUNCTION IF EXISTS public.set_watch_expiry();
DROP FUNCTION IF EXISTS public.reset_watch_expiry_on_activity();
DROP INDEX IF EXISTS public.idx_watch_expires_at;

-- 4. Drop the pending_contact columns
ALTER TABLE public.entity_watch_expressions
  DROP COLUMN IF EXISTS watch_purpose,
  DROP COLUMN IF EXISTS accumulated_signals,
  DROP COLUMN IF EXISTS capture_count,
  DROP COLUMN IF EXISTS initial_reason,
  DROP COLUMN IF EXISTS expires_at;
