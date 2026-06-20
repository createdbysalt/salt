-- Ensure PostgREST roles can access intelligence_findings
GRANT SELECT, INSERT, UPDATE, DELETE ON public.intelligence_findings TO service_role;

NOTIFY pgrst, 'reload schema';
