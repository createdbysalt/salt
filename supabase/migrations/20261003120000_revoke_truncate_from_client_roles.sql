-- Revoke destructive and DDL-adjacent table privileges that pg_dump-derived
-- migrations granted to client roles (notably 20260704000000_repair_ledger_lied_tables.sql).
--
-- Row-level security filters SELECT/INSERT/UPDATE/DELETE. It does NOT filter
-- TRUNCATE, so a TRUNCATE grant to `anon` or `authenticated` lets any caller
-- holding the public key empty the table regardless of tenant policies.
-- REFERENCES, TRIGGER and MAINTAIN are likewise never needed by a client role.
-- Nothing in the application relies on these grants.

-- 1) Schema-wide: no client role may truncate, reference, trigger or maintain any table.
REVOKE TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON ALL TABLES IN SCHEMA public FROM anon, authenticated;

-- 2) Tables where `anon` was granted ALL: anon holds no row verbs either.
--    (RLS still applies, but anon has no business writing these.)
REVOKE ALL ON TABLE public.capture_sender_profiles FROM anon;
REVOKE ALL ON TABLE public.contract_templates FROM anon;
REVOKE ALL ON TABLE public.workspace_brand_config FROM anon;
REVOKE ALL ON TABLE public.workspace_email_templates FROM anon;

-- 3) Future tables inherit the same posture.
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE TRUNCATE, REFERENCES, TRIGGER ON TABLES FROM anon, authenticated;

-- 4) Verify: fail loudly if any client role still holds TRUNCATE in public.
DO $$
DECLARE offending text;
BEGIN
  SELECT string_agg(table_name || ' (' || grantee || ')', ', ')
    INTO offending
    FROM information_schema.role_table_grants
   WHERE table_schema = 'public'
     AND grantee IN ('anon', 'authenticated')
     AND privilege_type = 'TRUNCATE';
  IF offending IS NOT NULL THEN
    RAISE EXCEPTION 'client roles still hold TRUNCATE on: %', offending;
  END IF;
END $$;
