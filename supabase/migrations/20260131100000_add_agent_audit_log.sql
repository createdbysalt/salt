-- ============================================================================
-- Migration: Add Agent Audit Log
-- Description: Tracks all database operations performed by AI agents
--              (database-keeper, ralph, etc.) for security auditing.
-- ============================================================================

-- ============================================================================
-- Table: agent_audit_log
-- Purpose: Immutable audit trail for all agent database operations
-- ============================================================================

CREATE TABLE public.agent_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Agent identification
  agent_id text NOT NULL,           -- 'database-keeper', 'ralph', 'architect', etc.
  agent_session text,               -- Session/conversation ID if available

  -- Operation classification
  operation_type text NOT NULL CHECK (operation_type IN (
    -- Tier 1: Read-only operations
    'schema_read',        -- Reading table/column definitions
    'data_read',          -- SELECT queries
    'rls_audit',          -- Analyzing RLS policies
    'explain_analyze',    -- Query performance analysis
    'index_analysis',     -- Index coverage analysis

    -- Tier 2: Migration authoring (draft only, never executed)
    'migration_draft',    -- Drafting migration SQL
    'migration_validate', -- Validating migration against patterns

    -- System operations
    'session_start',      -- Agent session began
    'session_end'         -- Agent session ended
  )),

  operation_tier integer NOT NULL DEFAULT 1 CHECK (operation_tier IN (1, 2)),

  -- Target information
  target_tables text[],             -- Tables affected/analyzed
  target_schema text DEFAULT 'public',

  -- Query details (for Tier 1 read operations)
  sql_query text,                   -- The query executed (if applicable)
  sql_hash text,                    -- MD5 hash for deduplication/analysis
  row_count integer,                -- Number of rows returned (if applicable)

  -- Context
  user_request text,                -- The original user request that triggered this
  escalation_reason text,           -- Why Tier 2 was needed (if applicable)

  -- Result
  result_status text NOT NULL DEFAULT 'success' CHECK (
    result_status IN ('success', 'error', 'denied', 'pending_review')
  ),
  result_summary text,              -- Brief description of outcome
  error_message text,               -- If failed, why

  -- Output reference (for migration drafts)
  output_file_path text,            -- Path to drafted migration file

  -- Timestamps
  created_at timestamptz DEFAULT now() NOT NULL,
  duration_ms integer               -- How long the operation took
);

-- Table comment
COMMENT ON TABLE public.agent_audit_log IS
  'Immutable audit trail for AI agent database operations. System-level table, not tenant-scoped. Service role access only.';

-- Column comments
COMMENT ON COLUMN public.agent_audit_log.agent_id IS
  'Identifier for the agent: database-keeper, ralph, architect, etc.';
COMMENT ON COLUMN public.agent_audit_log.operation_tier IS
  'Permission tier: 1=read-only, 2=migration authoring (draft only)';
COMMENT ON COLUMN public.agent_audit_log.sql_hash IS
  'MD5 hash of sql_query for deduplication and pattern analysis';
COMMENT ON COLUMN public.agent_audit_log.result_status IS
  'Outcome: success, error, denied (blocked by safety rules), pending_review (awaiting human)';

-- ============================================================================
-- Indexes for common queries
-- ============================================================================

-- Find operations by agent
CREATE INDEX agent_audit_log_agent_idx
  ON agent_audit_log(agent_id);

-- Find operations by type
CREATE INDEX agent_audit_log_operation_idx
  ON agent_audit_log(operation_type);

-- Find Tier 2 operations (migration drafts requiring review)
CREATE INDEX agent_audit_log_tier_idx
  ON agent_audit_log(operation_tier)
  WHERE operation_tier = 2;

-- Recent operations (most common query)
CREATE INDEX agent_audit_log_created_idx
  ON agent_audit_log(created_at DESC);

-- Failed/denied operations (security monitoring)
CREATE INDEX agent_audit_log_status_idx
  ON agent_audit_log(result_status)
  WHERE result_status != 'success';

-- Find by table (for impact analysis)
CREATE INDEX agent_audit_log_tables_idx
  ON agent_audit_log USING GIN (target_tables);

-- ============================================================================
-- RLS: Service role only
-- This is a system-level table, NOT tenant-scoped.
-- Only the service role (used by agents) can read/write.
-- ============================================================================

ALTER TABLE agent_audit_log ENABLE ROW LEVEL SECURITY;

-- Service role can insert audit logs (agents authenticate with service key)
CREATE POLICY "service_role_insert_audit_logs"
  ON agent_audit_log
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Service role can read audit logs (for analysis/debugging)
CREATE POLICY "service_role_view_audit_logs"
  ON agent_audit_log
  FOR SELECT
  TO service_role
  USING (true);

-- No UPDATE or DELETE policies intentionally!
-- Audit logs are IMMUTABLE - no one can modify or delete them.
-- This ensures a tamper-proof audit trail.

-- ============================================================================
-- Helper function: Log an agent operation
-- ============================================================================

CREATE OR REPLACE FUNCTION log_agent_operation(
  p_agent_id text,
  p_operation_type text,
  p_operation_tier integer DEFAULT 1,
  p_target_tables text[] DEFAULT NULL,
  p_sql_query text DEFAULT NULL,
  p_user_request text DEFAULT NULL,
  p_result_status text DEFAULT 'success',
  p_result_summary text DEFAULT NULL,
  p_error_message text DEFAULT NULL,
  p_output_file_path text DEFAULT NULL,
  p_duration_ms integer DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id uuid;
  v_sql_hash text;
BEGIN
  -- Generate hash for SQL query if provided
  IF p_sql_query IS NOT NULL THEN
    v_sql_hash := md5(p_sql_query);
  END IF;

  INSERT INTO agent_audit_log (
    agent_id,
    operation_type,
    operation_tier,
    target_tables,
    sql_query,
    sql_hash,
    user_request,
    result_status,
    result_summary,
    error_message,
    output_file_path,
    duration_ms
  ) VALUES (
    p_agent_id,
    p_operation_type,
    p_operation_tier,
    p_target_tables,
    p_sql_query,
    v_sql_hash,
    p_user_request,
    p_result_status,
    p_result_summary,
    p_error_message,
    p_output_file_path,
    p_duration_ms
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

COMMENT ON FUNCTION log_agent_operation IS
  'Helper function to log agent database operations. Called by database-keeper and other agents.';
