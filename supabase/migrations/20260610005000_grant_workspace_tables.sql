-- ============================================================================
-- Migration: Grant workspace table privileges after physical rename
-- ============================================================================
--
-- M0.75 renamed the compatibility views into physical workspace tables. The
-- app now queries workspace_* tables directly, so authenticated needs table
-- privileges in addition to RLS policies.
-- ============================================================================

DO $$
DECLARE
  workspace_table text;
BEGIN
  FOR workspace_table IN
    SELECT unnest(ARRAY[
      'workspaces',
      'workspace_members',
      'workspace_integrations',
      'workspace_domains',
      'workspace_calendar_connections',
      'workspace_brand_config',
      'workspace_services',
      'workspace_portfolio',
      'workspace_email_templates',
      'workspace_project_types',
      'workspace_tags',
      'workspace_portfolio_tags',
      'workspace_portfolio_items',
      'workspace_portfolio_item_tags',
      'workspace_client_tags',
      'workspace_project_tags',
      'workspace_portfolio_client_tags',
      'workspace_portfolio_project_tags'
    ])
  LOOP
    IF to_regclass(format('public.%I', workspace_table)) IS NOT NULL THEN
      EXECUTE format(
        'GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated',
        workspace_table
      );
    END IF;
  END LOOP;
END $$;
