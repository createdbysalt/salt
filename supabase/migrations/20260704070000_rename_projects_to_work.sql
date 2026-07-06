-- ============================================================================
-- RENAME projects -> work (connector-platform Phase 6.5, the big one)
-- ============================================================================
--
-- Naming canon: memory record tables are the sidebar product nouns, plural
-- (Work is the surface; `work` is the record table). Column renames
-- (project_id -> work_id on the 18 inbound-FK tables) ride separate PRs,
-- one owning table per PR — this migration renames the table itself and
-- everything that carries its name.
--
-- Rename mechanics (iron rule 2):
--   * constraints + indexes carrying "projects" rename dynamically
--   * RLS policies, inbound FKs, and views (workspace_mrr/studio_mrr) are
--     OID-based and survive untouched
--   * FUNCTION BODIES are text and do not survive: five functions reference
--     public.projects and are recreated here. Four of them
--     (set_seo_{configs,audits,alerts}_studio_id, set_project_milestone_
--     studio_id) were ALREADY latently broken — they read p.studio_id /
--     NEW.studio_id, columns that became workspace_id in the 2026-06-10
--     studios rename. They are recreated corrected (work + workspace_id).
--   * compatibility view `projects` (auto-updatable) bridges the deploy
--     window; drops in the Phase 6.6 endgame
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 0. Guard: no function bodies reference projects besides the five handled
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  offender RECORD;
BEGIN
  FOR offender IN
    SELECT pro.proname
    FROM pg_proc pro
    JOIN pg_namespace nsp ON nsp.oid = pro.pronamespace
    WHERE nsp.nspname = 'public'
      AND pro.proname NOT IN (
        'set_seo_configs_studio_id',
        'set_seo_audits_studio_id',
        'set_seo_alerts_studio_id',
        'set_project_milestone_studio_id',
        'update_project_stage_entered_at'
      )
      -- match the table name as a token, not project_id / project_milestones
      AND pro.prosrc ~* '\mprojects\M'
  LOOP
    RAISE EXCEPTION
      'Function public.%() references projects — recreate it against work in this migration before renaming',
      offender.proname;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 1. Rename the table + its enums (era-prefix ban applies to type names too)
-- ---------------------------------------------------------------------------
ALTER TABLE public.projects RENAME TO work;
ALTER TYPE public.projects_type RENAME TO work_type;
ALTER TYPE public.projects_payment_type RENAME TO work_payment_type;

-- ---------------------------------------------------------------------------
-- 2. Rename constraints + indexes that carry the old name
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.work'::regclass
      AND conname LIKE '%projects%'
  LOOP
    EXECUTE format(
      'ALTER TABLE public.work RENAME CONSTRAINT %I TO %I',
      r.conname, replace(r.conname, 'projects', 'work')
    );
  END LOOP;

  FOR r IN
    SELECT cls.relname
    FROM pg_index idx
    JOIN pg_class cls ON cls.oid = idx.indexrelid
    WHERE idx.indrelid = 'public.work'::regclass
      AND cls.relname LIKE '%projects%'
  LOOP
    EXECUTE format(
      'ALTER INDEX public.%I RENAME TO %I',
      r.relname, replace(r.relname, 'projects', 'work')
    );
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 3. Recreate the stage_entered_at trigger machinery under work names
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_update_project_stage_entered_at ON public.work;
DROP FUNCTION IF EXISTS public.update_project_stage_entered_at();

CREATE FUNCTION public.update_work_stage_entered_at()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    NEW.stage_entered_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_work_stage_entered_at
  BEFORE UPDATE OF status ON public.work
  FOR EACH ROW
  EXECUTE FUNCTION public.update_work_stage_entered_at();

-- ---------------------------------------------------------------------------
-- 4. Recreate the four workspace-stamping trigger functions (corrected:
--    they still read studio_id — broken since the studios rename)
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_set_seo_configs_studio_id ON public.seo_configs;
DROP FUNCTION IF EXISTS public.set_seo_configs_studio_id();

CREATE FUNCTION public.set_seo_configs_workspace_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.workspace_id IS NULL THEN
    SELECT w.workspace_id INTO NEW.workspace_id
    FROM public.work w
    WHERE w.id = NEW.project_id;
  END IF;

  IF NEW.workspace_id IS NULL THEN
    RAISE EXCEPTION 'seo_configs.project_id % does not map to a work row with a workspace_id', NEW.project_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_set_seo_configs_workspace_id
  BEFORE INSERT ON public.seo_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.set_seo_configs_workspace_id();

DROP TRIGGER IF EXISTS trg_set_seo_audits_studio_id ON public.seo_audits;
DROP FUNCTION IF EXISTS public.set_seo_audits_studio_id();

CREATE FUNCTION public.set_seo_audits_workspace_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.workspace_id IS NULL THEN
    SELECT w.workspace_id INTO NEW.workspace_id
    FROM public.work w
    WHERE w.id = NEW.project_id;
  END IF;

  IF NEW.workspace_id IS NULL THEN
    RAISE EXCEPTION 'seo_audits.project_id % does not map to a work row with a workspace_id', NEW.project_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_set_seo_audits_workspace_id
  BEFORE INSERT ON public.seo_audits
  FOR EACH ROW
  EXECUTE FUNCTION public.set_seo_audits_workspace_id();

DROP TRIGGER IF EXISTS trg_set_seo_alerts_studio_id ON public.seo_alerts;
DROP FUNCTION IF EXISTS public.set_seo_alerts_studio_id();

CREATE FUNCTION public.set_seo_alerts_workspace_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.workspace_id IS NULL THEN
    SELECT w.workspace_id INTO NEW.workspace_id
    FROM public.work w
    WHERE w.id = NEW.project_id;
  END IF;

  IF NEW.workspace_id IS NULL THEN
    RAISE EXCEPTION 'seo_alerts.project_id % does not map to a work row with a workspace_id', NEW.project_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_set_seo_alerts_workspace_id
  BEFORE INSERT ON public.seo_alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.set_seo_alerts_workspace_id();

DROP TRIGGER IF EXISTS trg_set_project_milestone_studio_id ON public.project_milestones;
DROP FUNCTION IF EXISTS public.set_project_milestone_studio_id();

CREATE FUNCTION public.set_project_milestone_workspace_id()
RETURNS TRIGGER AS $$
BEGIN
  SELECT w.workspace_id INTO NEW.workspace_id
  FROM public.work w
  WHERE w.id = NEW.project_id;

  IF NEW.workspace_id IS NULL THEN
    RAISE EXCEPTION 'Cannot create milestone: work row % not found or has no workspace_id', NEW.project_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_set_project_milestone_workspace_id
  BEFORE INSERT ON public.project_milestones
  FOR EACH ROW
  WHEN (NEW.workspace_id IS NULL)
  EXECUTE FUNCTION public.set_project_milestone_workspace_id();

-- ---------------------------------------------------------------------------
-- 5. Compatibility view under the old name (auto-updatable single-table
--    view: old deployed code's reads AND writes keep working; drops at 6.6)
-- ---------------------------------------------------------------------------
CREATE VIEW public.projects
WITH (security_invoker = true)
AS SELECT * FROM public.work;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO service_role;

-- ---------------------------------------------------------------------------
-- 6. Post-rename assertions (the ledger has lied before)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.work') IS NULL THEN
    RAISE EXCEPTION 'work table missing after rename';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'projects'
  ) THEN
    RAISE EXCEPTION 'projects compatibility view missing';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.work'::regclass
      AND conname LIKE '%projects%'
  ) OR EXISTS (
    SELECT 1 FROM pg_index idx
    JOIN pg_class cls ON cls.oid = idx.indexrelid
    WHERE idx.indrelid = 'public.work'::regclass
      AND cls.relname LIKE '%projects%'
  ) THEN
    RAISE EXCEPTION 'stale projects-named constraint/index survived the rename';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'public.work'::regclass
      AND tgname = 'trg_update_work_stage_entered_at'
  ) THEN
    RAISE EXCEPTION 'trg_update_work_stage_entered_at trigger missing';
  END IF;

  -- no function body may still reference the old table name
  IF EXISTS (
    SELECT 1 FROM pg_proc pro
    JOIN pg_namespace nsp ON nsp.oid = pro.pronamespace
    WHERE nsp.nspname = 'public'
      AND pro.prosrc ~* '\mprojects\M'
  ) THEN
    RAISE EXCEPTION 'a function body still references projects after the rename';
  END IF;
END $$;
