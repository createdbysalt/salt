-- ============================================================================
-- MARKETING SCHEMA PERMISSIONS
-- Grant access to service_role and authenticated users
-- ============================================================================

-- Grant schema usage
GRANT USAGE ON SCHEMA marketing TO service_role;
GRANT USAGE ON SCHEMA marketing TO authenticated;

-- Grant table permissions to service_role (full access for backend scripts)
GRANT ALL ON ALL TABLES IN SCHEMA marketing TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA marketing TO service_role;

-- Grant function execution
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA marketing TO service_role;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA marketing
  GRANT ALL ON TABLES TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA marketing
  GRANT ALL ON SEQUENCES TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA marketing
  GRANT EXECUTE ON FUNCTIONS TO service_role;
