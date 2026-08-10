-- Drop orphaned routing enums (Phase 1.16c follow-up)
--
-- routing_status and routing_action were only ever used by
-- capture_routing_decisions, dropped in 20260808090000.

DROP TYPE IF EXISTS public.routing_status;
DROP TYPE IF EXISTS public.routing_action;
