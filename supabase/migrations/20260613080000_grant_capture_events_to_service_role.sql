-- Grant service_role full access to capture_events tables
-- Needed for background ingestion jobs that use createAdminClient()

GRANT ALL ON public.capture_events TO service_role;
GRANT ALL ON public.capture_routing_decisions TO service_role;
