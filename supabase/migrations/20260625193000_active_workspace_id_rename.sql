-- ============================================================================
-- Migration: Active domain workspace_id rename
-- ============================================================================
--
-- M0.75 renamed the core tenant tables (`workspaces`, `workspace_members`) and
-- kept temporary studio-named compatibility views. This migration completes the
-- active product-table tenant column sweep from `studio_id` to `workspace_id`.
--
-- Historical migration files still mention studio naming by design. This file is
-- the forward live-schema migration for the active app surfaces.
-- ============================================================================

DO $$
DECLARE
  target_table text;
BEGIN
  FOR target_table IN
    SELECT unnest(ARRAY[
      -- Memory / relationships
      'people',
      'organizations',
      'teams',
      'entity_relations',
      'notes',

      -- Work / client-era tables still used by active routes
      'clients',
      'projects',
      'projects_new',
      'tasks',
      'project_files',
      'project_milestones',
      'client_meetings',
      'meeting_types',
      'meeting_templates',
      'client_emails',
      'client_email_attachments',
      'group_emails',
      'client_announcements',
      'client_knowledge_base',

      -- Plays / HQ
      'players',
      'play_templates',
      'play_runs',
      'play_run_sources',
      'opportunity_gaps',
      'activity_entries',
      'play_run_assignments',

      -- Capture / intelligence
      'capture_events',
      'capture_routing_decisions',
      'intelligence_findings',
      'intelligence_events',
      'intelligence_queue',
      'inbox_read_states',

      -- Billing / portal records that remain queried by active billing paths
      'portal_invoices',
      'portal_client_subscriptions',
      'portal_payment_events',
      'billing_records',
      'billing_payments',

      -- Integrations / sync logs
      'gmail_connections',
      'gmail_watches',
      'gmail_sync_logs',
      'calendar_connections',
      'calcom_connections',
      'seo_configs',
      'seo_audits',
      'seo_alerts',
      'workspace_tool_executions',
      'ask_salt_conversations',
      'ask_salt_messages'
    ])
  LOOP
    IF to_regclass(format('public.%I', target_table)) IS NOT NULL
       AND EXISTS (
         SELECT 1
         FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = target_table
           AND column_name = 'studio_id'
       )
       AND NOT EXISTS (
         SELECT 1
         FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = target_table
           AND column_name = 'workspace_id'
       ) THEN
      EXECUTE format('ALTER TABLE public.%I RENAME COLUMN studio_id TO workspace_id', target_table);
    END IF;
  END LOOP;
END $$;

-- Safety net: if an active table was missed above, rename any remaining public
-- base-table tenant column. Views and system schemas are excluded.
DO $$
DECLARE
  table_row record;
BEGIN
  FOR table_row IN
    SELECT table_schema, table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      AND EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = tables.table_schema
          AND table_name = tables.table_name
          AND column_name = 'studio_id'
      )
      AND NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = tables.table_schema
          AND table_name = tables.table_name
          AND column_name = 'workspace_id'
      )
  LOOP
    EXECUTE format(
      'ALTER TABLE %I.%I RENAME COLUMN studio_id TO workspace_id',
      table_row.table_schema,
      table_row.table_name
    );
  END LOOP;
END $$;

-- Update active helper functions that previously populated studio_id.
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

-- Rename common active indexes where the table/columns now exist. Index renames
-- are metadata-only and guarded so environments with schema drift continue.
DO $$
DECLARE
  rename_pair record;
BEGIN
  FOR rename_pair IN
    SELECT *
    FROM (
      VALUES
        ('idx_people_studio_id', 'idx_people_workspace_id'),
        ('idx_organizations_studio_id', 'idx_organizations_workspace_id'),
        ('idx_teams_studio_id', 'idx_teams_workspace_id'),
        ('idx_entity_relations_studio', 'idx_entity_relations_workspace'),
        ('idx_players_studio', 'idx_players_workspace'),
        ('idx_play_templates_studio', 'idx_play_templates_workspace'),
        ('idx_play_runs_studio_state', 'idx_play_runs_workspace_state'),
        ('idx_play_runs_studio_created', 'idx_play_runs_workspace_created'),
        ('idx_opportunity_gaps_studio', 'idx_opportunity_gaps_workspace'),
        ('idx_activity_entries_studio', 'idx_activity_entries_workspace'),
        ('idx_project_files_studio_archived', 'idx_project_files_workspace_archived'),
        ('idx_client_announcements_studio', 'idx_client_announcements_workspace'),
        ('idx_meeting_types_studio', 'idx_meeting_types_workspace'),
        ('idx_inbox_read_states_studio', 'idx_inbox_read_states_workspace')
    ) AS pairs(old_name, new_name)
  LOOP
    IF to_regclass(format('public.%I', rename_pair.old_name)) IS NOT NULL
       AND to_regclass(format('public.%I', rename_pair.new_name)) IS NULL THEN
      EXECUTE format('ALTER INDEX public.%I RENAME TO %I', rename_pair.old_name, rename_pair.new_name);
    END IF;
  END LOOP;
END $$;

-- Add canonical workspace indexes for active tenant-scoped tables. Existing
-- renamed or equivalent indexes make these no-ops.
DO $$
DECLARE
  target_table text;
BEGIN
  FOR target_table IN
    SELECT unnest(ARRAY[
      'people',
      'organizations',
      'teams',
      'entity_relations',
      'clients',
      'projects',
      'projects_new',
      'tasks',
      'project_files',
      'client_meetings',
      'meeting_types',
      'players',
      'play_templates',
      'play_runs',
      'play_run_sources',
      'opportunity_gaps',
      'activity_entries',
      'intelligence_findings',
      'intelligence_events',
      'intelligence_queue',
      'inbox_read_states',
      'billing_records',
      'billing_payments',
      'gmail_connections',
      'gmail_watches',
      'gmail_sync_logs',
      'seo_configs',
      'seo_audits',
      'seo_alerts'
    ])
  LOOP
    IF to_regclass(format('public.%I', target_table)) IS NOT NULL
       AND EXISTS (
         SELECT 1
         FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = target_table
           AND column_name = 'workspace_id'
       ) THEN
      EXECUTE format(
        'CREATE INDEX IF NOT EXISTS %I ON public.%I(workspace_id)',
        format('idx_%s_workspace_id', target_table),
        target_table
      );
    END IF;
  END LOOP;
END $$;

-- Recreate representative active RLS policies with workspace naming. Postgres
-- updates column references during RENAME COLUMN, but policy names and subqueries
-- can remain legacy. These canonical policies are additive and safe with RLS.
DO $$
DECLARE
  target_table text;
BEGIN
  FOR target_table IN
    SELECT unnest(ARRAY[
      'people',
      'organizations',
      'teams',
      'entity_relations',
      'clients',
      'projects',
      'projects_new',
      'tasks',
      'project_files',
      'client_meetings',
      'meeting_types',
      'players',
      'play_templates',
      'play_runs',
      'play_run_sources',
      'opportunity_gaps',
      'activity_entries',
      'intelligence_findings',
      'intelligence_events',
      'intelligence_queue',
      'billing_records',
      'billing_payments',
      'seo_configs',
      'seo_audits',
      'seo_alerts'
    ])
  LOOP
    IF to_regclass(format('public.%I', target_table)) IS NOT NULL
       AND EXISTS (
         SELECT 1
         FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = target_table
           AND column_name = 'workspace_id'
       ) THEN
      EXECUTE format(
        'DROP POLICY IF EXISTS %I ON public.%I',
        format('workspace_members_view_%s', target_table),
        target_table
      );
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR SELECT USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()))',
        format('workspace_members_view_%s', target_table),
        target_table
      );

      EXECUTE format(
        'DROP POLICY IF EXISTS %I ON public.%I',
        format('workspace_members_manage_%s', target_table),
        target_table
      );
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR ALL USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND role IN (''owner'', ''admin'', ''member''))) WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND role IN (''owner'', ''admin'', ''member'')))',
        format('workspace_members_manage_%s', target_table),
        target_table
      );
    END IF;
  END LOOP;
END $$;

COMMENT ON FUNCTION public.is_workspace_member(uuid) IS 'Checks whether auth.uid() belongs to the workspace.';
COMMENT ON FUNCTION public.is_studio_member(uuid) IS 'Deprecated compatibility wrapper for is_workspace_member(uuid).';
