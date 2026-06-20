-- Grant authenticated role access to capture_events tables
-- RLS policies filter what they can actually see/modify

GRANT SELECT, INSERT, UPDATE ON public.capture_events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.capture_routing_decisions TO authenticated;
