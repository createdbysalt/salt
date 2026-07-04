-- Grant authenticated role access to entity_source_history table
-- Required for RLS policies to work via PostgREST

GRANT SELECT, INSERT ON public.entity_source_history TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
