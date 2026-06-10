-- ============================================================================
-- Migration: Physical workspace rename with legacy compatibility views
-- ============================================================================
--
-- This migration makes the core tenant model workspace-named at the database
-- level while keeping studio-named views for the current application cleanup
-- window. The legacy views are intentionally temporary and should be removed
-- after all runtime queries move to workspace_* / workspace_id.
-- ============================================================================

-- Drop the forward compatibility views from the previous migration so their
-- names are available for the real workspace tables.
DROP VIEW IF EXISTS public.workspace_domains;
DROP VIEW IF EXISTS public.workspace_integrations;
DROP VIEW IF EXISTS public.workspace_members;
DROP VIEW IF EXISTS public.workspaces;

DO $$
DECLARE
  rename_pair record;
BEGIN
  FOR rename_pair IN
    SELECT *
    FROM (
      VALUES
        ('studios', 'workspaces'),
        ('studio_members', 'workspace_members'),
        ('studio_integrations', 'workspace_integrations'),
        ('studio_domains', 'workspace_domains'),
        ('studio_calendar_connections', 'workspace_calendar_connections'),
        ('studio_brand_config', 'workspace_brand_config'),
        ('studio_services', 'workspace_services'),
        ('studio_portfolio', 'workspace_portfolio'),
        ('studio_email_templates', 'workspace_email_templates'),
        ('studio_project_types', 'workspace_project_types'),
        ('studio_tags', 'workspace_tags'),
        ('studio_portfolio_tags', 'workspace_portfolio_tags'),
        ('studio_portfolio_items', 'workspace_portfolio_items'),
        ('studio_portfolio_item_tags', 'workspace_portfolio_item_tags'),
        ('studio_client_tags', 'workspace_client_tags'),
        ('studio_project_tags', 'workspace_project_tags'),
        ('studio_portfolio_client_tags', 'workspace_portfolio_client_tags'),
        ('studio_portfolio_project_tags', 'workspace_portfolio_project_tags')
    ) AS pairs(old_name, new_name)
  LOOP
    IF to_regclass(format('public.%I', rename_pair.old_name)) IS NOT NULL
       AND to_regclass(format('public.%I', rename_pair.new_name)) IS NULL THEN
      EXECUTE format(
        'ALTER TABLE public.%I RENAME TO %I',
        rename_pair.old_name,
        rename_pair.new_name
      );
    END IF;

    IF to_regclass(format('public.%I', rename_pair.new_name)) IS NOT NULL
       AND EXISTS (
         SELECT 1
         FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = rename_pair.new_name
           AND column_name = 'studio_id'
       )
       AND NOT EXISTS (
         SELECT 1
         FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = rename_pair.new_name
           AND column_name = 'workspace_id'
       ) THEN
      EXECUTE format(
        'ALTER TABLE public.%I RENAME COLUMN studio_id TO workspace_id',
        rename_pair.new_name
      );
    END IF;
  END LOOP;
END $$;

-- Recreate membership helpers against the workspace-native table.
CREATE OR REPLACE FUNCTION public.is_workspace_member(p_workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspace_members wm
    WHERE wm.workspace_id = p_workspace_id
      AND wm.user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_studio_member(p_studio_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_workspace_member(p_studio_id);
$$;

GRANT EXECUTE ON FUNCTION public.is_workspace_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_studio_member(uuid) TO authenticated;

-- The previous compatibility migration granted DML on workspace-named views.
-- After the physical rename, app code talks directly to the workspace tables,
-- so authenticated must have table privileges for RLS policies to evaluate.
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

-- Generate temporary studio-named views over the renamed workspace tables.
-- The generated select list aliases workspace_id back to studio_id so older
-- Supabase queries keep working while application DB-field references are
-- moved to workspace_id.
DO $$
DECLARE
  view_pair record;
  select_list text;
BEGIN
  FOR view_pair IN
    SELECT *
    FROM (
      VALUES
        ('studios', 'workspaces'),
        ('studio_members', 'workspace_members'),
        ('studio_integrations', 'workspace_integrations'),
        ('studio_domains', 'workspace_domains'),
        ('studio_calendar_connections', 'workspace_calendar_connections'),
        ('studio_brand_config', 'workspace_brand_config'),
        ('studio_services', 'workspace_services'),
        ('studio_portfolio', 'workspace_portfolio'),
        ('studio_email_templates', 'workspace_email_templates'),
        ('studio_project_types', 'workspace_project_types'),
        ('studio_tags', 'workspace_tags'),
        ('studio_portfolio_tags', 'workspace_portfolio_tags'),
        ('studio_portfolio_items', 'workspace_portfolio_items'),
        ('studio_portfolio_item_tags', 'workspace_portfolio_item_tags'),
        ('studio_client_tags', 'workspace_client_tags'),
        ('studio_project_tags', 'workspace_project_tags'),
        ('studio_portfolio_client_tags', 'workspace_portfolio_client_tags'),
        ('studio_portfolio_project_tags', 'workspace_portfolio_project_tags')
    ) AS pairs(old_name, new_name)
  LOOP
    IF to_regclass(format('public.%I', view_pair.new_name)) IS NOT NULL
       AND to_regclass(format('public.%I', view_pair.old_name)) IS NULL THEN
      SELECT string_agg(
        CASE
          WHEN column_name = 'workspace_id' THEN format('%I AS studio_id', column_name)
          ELSE format('%I', column_name)
        END,
        ', ' ORDER BY ordinal_position
      )
      INTO select_list
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = view_pair.new_name;

      EXECUTE format(
        'CREATE VIEW public.%I WITH (security_invoker = true) AS SELECT %s FROM public.%I',
        view_pair.old_name,
        select_list,
        view_pair.new_name
      );

      EXECUTE format(
        'GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated',
        view_pair.old_name
      );
    END IF;
  END LOOP;
END $$;

-- Canonical MRR view with workspace naming; keep this optional because staging
-- environments may not all have the legacy billing subscription table.
DO $$
BEGIN
  IF to_regclass('public.bridge_client_subscriptions') IS NOT NULL THEN
    EXECUTE $view$
      CREATE OR REPLACE VIEW public.workspace_mrr
      WITH (security_invoker = true)
      AS
      SELECT
        studio_id AS workspace_id,
        SUM(
          CASE
            WHEN interval = 'month' THEN amount_cents / 100.0
            WHEN interval = 'year' THEN (amount_cents / 100.0) / 12
            ELSE 0
          END
        ) AS mrr_usd,
        COUNT(*) AS active_subscriptions
      FROM public.bridge_client_subscriptions
      WHERE status IN ('active', 'trialing')
      GROUP BY studio_id
    $view$;

    GRANT SELECT ON public.workspace_mrr TO authenticated;
    COMMENT ON VIEW public.workspace_mrr IS 'Monthly recurring revenue by workspace from active client subscriptions.';
  END IF;
END $$;

COMMENT ON TABLE public.workspaces IS 'Workspace tenant boundary. Renamed from studios.';
COMMENT ON TABLE public.workspace_members IS 'Workspace membership. Renamed from studio_members.';
COMMENT ON FUNCTION public.is_workspace_member(uuid) IS 'Checks whether auth.uid() belongs to the workspace.';
COMMENT ON FUNCTION public.is_studio_member(uuid) IS 'Deprecated compatibility wrapper for is_workspace_member(uuid).';
COMMENT ON VIEW public.studios IS 'Deprecated compatibility view over workspaces.';
COMMENT ON VIEW public.studio_members IS 'Deprecated compatibility view over workspace_members.';
