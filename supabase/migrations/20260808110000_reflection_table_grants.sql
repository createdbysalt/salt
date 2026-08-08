-- Grant table privileges on the reflection-pass tables (fix)
--
-- 20260807100000_reflection_pass_schema.sql created reflection_triggers and
-- signal_source_weights with RLS policies but no GRANTs, so every role
-- (including service_role) got 42501 "permission denied" — surfacing in the
-- app as "[weights] Query error: {}" on Memory → Rules.

GRANT SELECT, INSERT, UPDATE, DELETE ON public.reflection_triggers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reflection_triggers TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.signal_source_weights TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.signal_source_weights TO service_role;
