-- ============================================================================
-- Phase 6.6 endgame: milestone renames, work_time_entries, drop dead tables
-- ============================================================================
--
-- Naming canon child-table rule (<parent-singular>_<thing>):
--   * project_milestones  -> work_delivery_milestones  (+ project_id -> work_id)
--   * work_milestones     -> work_payment_milestones   (already work_id)
--   * retainer_time_entries -> work_time_entries        (+ project_id -> work_id)
--   * project_retainers   -> DROP (fold target `work` retainer columns already
--     exist; ZERO rows on both projects, zero code references; exports in
--     .backups/pre-drop-retainers-members-*)
--   * project_members     -> DROP (spaces decision resolved by reality: zero
--     rows both projects, zero code references; same exports)
--
-- Milestone trigger machinery recreated under new names; the bespoke
-- updated_at function is replaced by the shared set_updated_at.
-- Compat views under the old names bridge the release window (milestones
-- views alias work_id AS project_id for pre-rename readers); they drop with
-- the rest of the compat views post-release.
--
-- NOTE deploy coupling: this migration (with 080000/090000/100000) applies
-- to STAGING now; production receives the whole set at the staging -> main
-- release, back-to-back with the deploy.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 0. Guard: no stray triggers/functions reference the tables being dropped
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  offender RECORD;
BEGIN
  FOR offender IN
    SELECT DISTINCT trg.tgname, cls.relname AS table_name, pro.proname AS function_name
    FROM pg_trigger trg
    JOIN pg_class cls ON cls.oid = trg.tgrelid
    JOIN pg_proc pro ON pro.oid = trg.tgfoid
    WHERE NOT trg.tgisinternal
      AND cls.relname NOT IN ('project_retainers', 'project_members')
      AND (pro.prosrc ILIKE '%project_retainers%' OR pro.prosrc ILIKE '%project_members%')
  LOOP
    RAISE EXCEPTION 'Trigger % on % (function %) references a table being dropped',
      offender.tgname, offender.table_name, offender.function_name;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 1. project_milestones -> work_delivery_milestones
-- ---------------------------------------------------------------------------
ALTER TABLE public.project_milestones RENAME TO work_delivery_milestones;
ALTER TABLE public.work_delivery_milestones RENAME COLUMN project_id TO work_id;

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.work_delivery_milestones'::regclass
      AND (conname LIKE '%project_milestones%' OR conname LIKE '%project_id%')
  LOOP
    EXECUTE format(
      'ALTER TABLE public.work_delivery_milestones RENAME CONSTRAINT %I TO %I',
      r.conname,
      replace(replace(r.conname, 'project_milestones', 'work_delivery_milestones'), 'project_id', 'work_id')
    );
  END LOOP;

  FOR r IN
    SELECT cls.relname
    FROM pg_index idx
    JOIN pg_class cls ON cls.oid = idx.indexrelid
    WHERE idx.indrelid = 'public.work_delivery_milestones'::regclass
      AND (cls.relname LIKE '%project%')
  LOOP
    EXECUTE format(
      'ALTER INDEX public.%I RENAME TO %I',
      r.relname,
      replace(replace(r.relname, 'project_milestones', 'work_delivery_milestones'), 'project_id', 'work_id')
    );
  END LOOP;
END $$;

-- Trigger machinery under new names
DROP TRIGGER IF EXISTS trg_set_project_milestone_workspace_id ON public.work_delivery_milestones;
DROP TRIGGER IF EXISTS trg_set_project_milestone_studio_id ON public.work_delivery_milestones;
DROP FUNCTION IF EXISTS public.set_project_milestone_workspace_id();
DROP FUNCTION IF EXISTS public.set_project_milestone_studio_id();

CREATE FUNCTION public.set_work_delivery_milestone_workspace_id()
RETURNS TRIGGER AS $$
BEGIN
  SELECT w.workspace_id INTO NEW.workspace_id
  FROM public.work w
  WHERE w.id = NEW.work_id;

  IF NEW.workspace_id IS NULL THEN
    RAISE EXCEPTION 'Cannot create milestone: work row % not found or has no workspace_id', NEW.work_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_set_work_delivery_milestone_workspace_id
  BEFORE INSERT ON public.work_delivery_milestones
  FOR EACH ROW
  WHEN (NEW.workspace_id IS NULL)
  EXECUTE FUNCTION public.set_work_delivery_milestone_workspace_id();

DROP TRIGGER IF EXISTS project_milestones_updated_at ON public.work_delivery_milestones;
DROP FUNCTION IF EXISTS public.update_project_milestones_updated_at();

CREATE TRIGGER work_delivery_milestones_updated_at
  BEFORE UPDATE ON public.work_delivery_milestones
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- auto_set_milestone_completed_at reads NEW only — trigger rides the rename

-- Compat view (aliases the renamed column for pre-rename readers)
CREATE VIEW public.project_milestones
WITH (security_invoker = true)
AS SELECT m.*, m.work_id AS project_id FROM public.work_delivery_milestones m;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_milestones TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_milestones TO service_role;

-- ---------------------------------------------------------------------------
-- 2. work_milestones -> work_payment_milestones
-- ---------------------------------------------------------------------------
ALTER TABLE public.work_milestones RENAME TO work_payment_milestones;

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.work_payment_milestones'::regclass
      AND conname LIKE '%work_milestones%'
  LOOP
    EXECUTE format(
      'ALTER TABLE public.work_payment_milestones RENAME CONSTRAINT %I TO %I',
      r.conname, replace(r.conname, 'work_milestones', 'work_payment_milestones')
    );
  END LOOP;

  FOR r IN
    SELECT cls.relname
    FROM pg_index idx
    JOIN pg_class cls ON cls.oid = idx.indexrelid
    WHERE idx.indrelid = 'public.work_payment_milestones'::regclass
      AND cls.relname LIKE '%work_milestones%'
  LOOP
    EXECUTE format(
      'ALTER INDEX public.%I RENAME TO %I',
      r.relname, replace(r.relname, 'work_milestones', 'work_payment_milestones')
    );
  END LOOP;
END $$;

CREATE VIEW public.work_milestones
WITH (security_invoker = true)
AS SELECT * FROM public.work_payment_milestones;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_milestones TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_milestones TO service_role;

-- ---------------------------------------------------------------------------
-- 3. retainer_time_entries -> work_time_entries
-- ---------------------------------------------------------------------------
ALTER TABLE public.retainer_time_entries RENAME TO work_time_entries;
ALTER TABLE public.work_time_entries RENAME COLUMN project_id TO work_id;

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.work_time_entries'::regclass
      AND (conname LIKE '%retainer_time_entries%' OR conname LIKE '%project_id%')
  LOOP
    EXECUTE format(
      'ALTER TABLE public.work_time_entries RENAME CONSTRAINT %I TO %I',
      r.conname,
      replace(replace(r.conname, 'retainer_time_entries', 'work_time_entries'), 'project_id', 'work_id')
    );
  END LOOP;

  FOR r IN
    SELECT cls.relname
    FROM pg_index idx
    JOIN pg_class cls ON cls.oid = idx.indexrelid
    WHERE idx.indrelid = 'public.work_time_entries'::regclass
      AND (cls.relname LIKE '%retainer_time%' OR cls.relname LIKE '%project%')
  LOOP
    EXECUTE format(
      'ALTER INDEX public.%I RENAME TO %I',
      r.relname,
      replace(replace(r.relname, 'retainer_time_entries', 'work_time_entries'), 'project_id', 'work_id')
    );
  END LOOP;
END $$;

CREATE VIEW public.retainer_time_entries
WITH (security_invoker = true)
AS SELECT t.*, t.work_id AS project_id FROM public.work_time_entries t;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.retainer_time_entries TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.retainer_time_entries TO service_role;

-- ---------------------------------------------------------------------------
-- 3b. Data migration: inbox read/archive state keyed by source_table
-- ---------------------------------------------------------------------------
UPDATE public.inbox_read_states
SET source_table = 'work_delivery_milestones'
WHERE source_table = 'project_milestones';

-- ---------------------------------------------------------------------------
-- 4. Drop the dead tables (zero rows both projects, zero code references)
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS public.project_retainers CASCADE;
DROP TABLE IF EXISTS public.project_members CASCADE;

-- ---------------------------------------------------------------------------
-- 5. Assertions
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.work_delivery_milestones') IS NULL
     OR to_regclass('public.work_payment_milestones') IS NULL
     OR to_regclass('public.work_time_entries') IS NULL THEN
    RAISE EXCEPTION 'a renamed endgame table is missing';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'project_milestones')
     OR NOT EXISTS (SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'work_milestones')
     OR NOT EXISTS (SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'retainer_time_entries') THEN
    RAISE EXCEPTION 'an endgame compatibility view is missing';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name IN ('work_delivery_milestones', 'work_time_entries')
      AND column_name = 'project_id'
  ) THEN
    RAISE EXCEPTION 'a project_id column survived the endgame renames';
  END IF;

  IF to_regclass('public.project_retainers') IS NOT NULL
     OR to_regclass('public.project_members') IS NOT NULL THEN
    RAISE EXCEPTION 'a dead table survived the drop (views excluded by regclass check)';
  END IF;
END $$;
