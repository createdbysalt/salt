-- Scope-aware Tools list (launch checklist 2.4, founder decision 2026-07-06):
-- store each tool's provider-accepted OAuth scopes from the Composio catalog
-- so the UI can hide tools the connection's grant provably cannot execute.
-- NULL = Composio publishes no scope data for the tool (never filtered).

ALTER TABLE public.connector_tools
  ADD COLUMN IF NOT EXISTS required_scopes jsonb;

COMMENT ON COLUMN public.connector_tools.required_scopes IS
  'Provider OAuth scopes accepted for this tool (any-of), synced from Composio; null = unknown, never filtered on';

-- Assert (post-push schema assertion iron rule)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'connector_tools'
      AND column_name = 'required_scopes'
  ) THEN
    RAISE EXCEPTION 'connector_tools.required_scopes missing after migration';
  END IF;
END $$;
