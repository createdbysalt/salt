-- Drop dead capture RPCs (Phase 1.4)
--
-- get_pending_captures + get_capture_stream were the read path for the
-- queue-era UI deleted in 1.1, and the TS query layer that called them was
-- removed with the legacy surface-routing engine in 1.3. Zero call sites
-- remain (only generated database.types.ts references). Both are
-- SECURITY DEFINER, so dropping them also closes unnecessary
-- privilege-escalation surface.
--
-- record_capture_correction (same creating migration) is NOT dropped here:
-- its survivor ruling is part of the held 1.16(b) decision.

DROP FUNCTION IF EXISTS public.get_pending_captures(UUID);
DROP FUNCTION IF EXISTS public.get_capture_stream(UUID, INTEGER, INTEGER);
