-- Grants for Ask Salt chat + Composio execution log tables.
--
-- Staging's public schema has hardened (revoked) default privileges after the
-- June 2026 security batch, so tables created without explicit GRANTs are
-- unreadable even with valid RLS policies (42501 permission denied).
-- ask_salt_conversations / ask_salt_messages shipped with RLS policies but no
-- grants; workspace_tool_executions granted SELECT to authenticated only.
--
-- Row access remains constrained by the existing RLS policies — these grants
-- only restore table-level privileges for the roles each code path uses:
--   * authenticated  — Ask Salt server actions use the user-context client
--   * service_role   — execution log writes via the admin client

-- Ask Salt conversations: user-context CRUD (RLS scopes to workspace member)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ask_salt_conversations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ask_salt_messages TO authenticated;

-- Admin/service paths (RLS bypassed by role design; keep anon at zero access)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ask_salt_conversations TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ask_salt_messages TO service_role;

-- Execution audit log: written via admin client, read by workspace members
GRANT SELECT, INSERT ON public.workspace_tool_executions TO service_role;

-- Explicitly keep anon locked out (no-op if already absent)
REVOKE ALL ON public.ask_salt_conversations FROM anon;
REVOKE ALL ON public.ask_salt_messages FROM anon;
REVOKE ALL ON public.workspace_tool_executions FROM anon;
