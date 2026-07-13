-- ============================================================================
-- TRUST LAYER: Provenance rollback + extended sources
-- Plan: Memory Trust Layer (2026-07-11)
-- ============================================================================
--
-- Adds columns to profile_field_provenance for:
-- 1. Rollback system (previous_value, previous_provenance_id)
-- 2. Reason tracking (because)
-- 3. Extended source types (ask_salt, playbook, rollback, enrichment, cron)
--
-- Also creates field_corrections table for correction learning.
-- ============================================================================

-- Helper to drop CHECK constraints by column name
CREATE OR REPLACE FUNCTION pg_temp.drop_column_checks(p_table regclass, p_column text)
RETURNS void AS $$
DECLARE
  c record;
BEGIN
  FOR c IN
    SELECT con.conname
    FROM pg_constraint con
    WHERE con.conrelid = p_table
      AND con.contype = 'c'
      AND EXISTS (
        SELECT 1 FROM unnest(con.conkey) AS k
        JOIN pg_attribute a ON a.attrelid = con.conrelid AND a.attnum = k
        WHERE a.attname = p_column
      )
  LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', p_table, c.conname);
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 1. Add rollback tracking columns
ALTER TABLE public.profile_field_provenance
  ADD COLUMN IF NOT EXISTS because text,
  ADD COLUMN IF NOT EXISTS previous_value jsonb,
  ADD COLUMN IF NOT EXISTS previous_provenance_id uuid REFERENCES public.profile_field_provenance(id);

-- 2. Update source CHECK to include all tool sources
SELECT pg_temp.drop_column_checks('public.profile_field_provenance', 'source');
ALTER TABLE public.profile_field_provenance
  ADD CONSTRAINT profile_field_provenance_source_check CHECK (
    source IN ('rule', 'ai_fallback', 'manual', 'ask_salt', 'playbook', 'rollback', 'enrichment', 'cron')
  );

-- 3. Create field_corrections table for correction learning
CREATE TABLE IF NOT EXISTS public.field_corrections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  field text NOT NULL,
  original_value jsonb,
  corrected_value jsonb,
  original_provenance_id uuid REFERENCES public.profile_field_provenance(id),
  reason text,
  corrected_at timestamptz NOT NULL DEFAULT now(),
  corrected_by uuid REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_field_corrections_entity
  ON public.field_corrections(workspace_id, entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_field_corrections_provenance
  ON public.field_corrections(original_provenance_id);

ALTER TABLE public.field_corrections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_members_view_field_corrections"
  ON public.field_corrections FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "workspace_members_insert_field_corrections"
  ON public.field_corrections FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

-- Index for rollback lookups
CREATE INDEX IF NOT EXISTS idx_profile_field_provenance_previous
  ON public.profile_field_provenance(previous_provenance_id)
  WHERE previous_provenance_id IS NOT NULL;

-- 4. Create field_conflicts table for conflict surfacing
CREATE TABLE IF NOT EXISTS public.field_conflicts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  field text NOT NULL,
  conflict_type text NOT NULL CHECK (conflict_type IN ('value_split', 'source_disagree', 'recency_unclear', 'user_vs_system')),
  candidates jsonb NOT NULL,
  detected_at timestamptz NOT NULL DEFAULT now(),
  resolved boolean NOT NULL DEFAULT false,
  resolved_by text CHECK (resolved_by IS NULL OR resolved_by IN ('user', 'tiebreaker', 'timeout')),
  resolved_at timestamptz,
  resolution_value jsonb
);

CREATE INDEX IF NOT EXISTS idx_field_conflicts_entity
  ON public.field_conflicts(workspace_id, entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_field_conflicts_unresolved
  ON public.field_conflicts(workspace_id, resolved)
  WHERE NOT resolved;

ALTER TABLE public.field_conflicts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_members_view_field_conflicts"
  ON public.field_conflicts FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "workspace_members_manage_field_conflicts"
  ON public.field_conflicts FOR ALL
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );
