-- ============================================================================
-- project_id -> work_id: intelligence trio + seo trio
-- (connector-platform Phase 6.5 column wave)
-- ============================================================================
--
-- intelligence_events / intelligence_queue / ai_audits: zero app-code
-- references to project_id (queue + ai_audits have zero references at all)
-- — DB-only rename.
--
-- seo_configs / seo_audits / seo_alerts: the workspace-stamping trigger
-- functions recreated in 20260704070000 read NEW.project_id, so they are
-- recreated here against work_id in the same wave. App code (seo cron,
-- seo libs) is swept in the same PR.
-- ============================================================================

DO $$
DECLARE
  t TEXT;
  r RECORD;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'intelligence_events', 'intelligence_queue', 'ai_audits',
    'seo_configs', 'seo_audits', 'seo_alerts'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I RENAME COLUMN project_id TO work_id', t);

    FOR r IN
      SELECT conname
      FROM pg_constraint
      WHERE conrelid = format('public.%I', t)::regclass
        AND conname LIKE '%project_id%'
    LOOP
      EXECUTE format(
        'ALTER TABLE public.%I RENAME CONSTRAINT %I TO %I',
        t, r.conname, replace(r.conname, 'project_id', 'work_id')
      );
    END LOOP;

    FOR r IN
      SELECT cls.relname
      FROM pg_index idx
      JOIN pg_class cls ON cls.oid = idx.indexrelid
      WHERE idx.indrelid = format('public.%I', t)::regclass
        AND cls.relname LIKE '%project%'
    LOOP
      EXECUTE format(
        'ALTER INDEX public.%I RENAME TO %I',
        r.relname, replace(replace(r.relname, 'project_id', 'work_id'), 'project', 'work')
      );
    END LOOP;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- Recreate the seo workspace stampers against work_id
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_seo_configs_workspace_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.workspace_id IS NULL THEN
    SELECT w.workspace_id INTO NEW.workspace_id
    FROM public.work w
    WHERE w.id = NEW.work_id;
  END IF;

  IF NEW.workspace_id IS NULL THEN
    RAISE EXCEPTION 'seo_configs.work_id % does not map to a work row with a workspace_id', NEW.work_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.set_seo_audits_workspace_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.workspace_id IS NULL THEN
    SELECT w.workspace_id INTO NEW.workspace_id
    FROM public.work w
    WHERE w.id = NEW.work_id;
  END IF;

  IF NEW.workspace_id IS NULL THEN
    RAISE EXCEPTION 'seo_audits.work_id % does not map to a work row with a workspace_id', NEW.work_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.set_seo_alerts_workspace_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.workspace_id IS NULL THEN
    SELECT w.workspace_id INTO NEW.workspace_id
    FROM public.work w
    WHERE w.id = NEW.work_id;
  END IF;

  IF NEW.workspace_id IS NULL THEN
    RAISE EXCEPTION 'seo_alerts.work_id % does not map to a work row with a workspace_id', NEW.work_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ---------------------------------------------------------------------------
-- Assertions
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'intelligence_events', 'intelligence_queue', 'ai_audits',
    'seo_configs', 'seo_audits', 'seo_alerts'
  ] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = t AND column_name = 'work_id'
    ) THEN
      RAISE EXCEPTION '%.work_id missing after rename', t;
    END IF;
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = t AND column_name = 'project_id'
    ) THEN
      RAISE EXCEPTION '%.project_id survived the rename', t;
    END IF;
  END LOOP;

  IF EXISTS (
    SELECT 1 FROM pg_proc pro
    JOIN pg_namespace nsp ON nsp.oid = pro.pronamespace
    WHERE nsp.nspname = 'public'
      AND pro.proname LIKE 'set_seo_%_workspace_id'
      AND pro.prosrc LIKE '%project_id%'
  ) THEN
    RAISE EXCEPTION 'a seo stamper function still references project_id';
  END IF;
END $$;
