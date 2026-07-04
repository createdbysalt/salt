-- ============================================================================
-- ENTITY LINKS CONVERGENCE (keeper-field-contracts Phase 4.1, step 1 of 2)
-- ============================================================================
--
-- entity_links becomes THE explicit-edge store (Obsidian model: structured
-- FKs stay in domain tables and are projected at query time; explicit edges
-- live here; note [[wikilink]] mentions sync here as relation_type='mention').
--
-- Step 1 (this migration, additive):
--   1. entity_links gains relation_type + provenance (source/confidence/because)
--   2. source/target_type CHECKs widen to the short entity-type dialect
--      (person, org, work, billing, meeting, file, note, space)
--   3. UNIQUE key widens to include relation_type
--   4. entity_relations rows are copied in with spellings normalized to the
--      short dialect and relation types mapped to the new vocabulary
--
-- Step 2 (separate migration, after all app readers/writers repoint):
--   DROP entity_relations + its orphaned get_entity_backlinks() RPC.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. New columns
-- ----------------------------------------------------------------------------

ALTER TABLE public.entity_links
  ADD COLUMN IF NOT EXISTS relation_type TEXT NOT NULL DEFAULT 'related'
    CHECK (relation_type IN ('employment', 'payment', 'attachment', 'mention', 'related')),
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual'
    CHECK (source IN ('manual', 'keeper', 'system')),
  ADD COLUMN IF NOT EXISTS confidence INTEGER
    CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 100)),
  ADD COLUMN IF NOT EXISTS because TEXT;

COMMENT ON COLUMN public.entity_links.relation_type IS
  'Edge semantics: employment (person<->org), payment (billing edges), attachment (file edges), mention (note wikilinks), related (generic manual link)';
COMMENT ON COLUMN public.entity_links.source IS
  'Who created the edge: manual (user), keeper (AI proposal applied), system (automatic sync e.g. wikilinks)';
COMMENT ON COLUMN public.entity_links.confidence IS
  '0-100 confidence for keeper/system edges (app-layer canonical scale)';

-- ----------------------------------------------------------------------------
-- 2. Widen type CHECKs to the short dialect (drop-by-column, names drift)
-- ----------------------------------------------------------------------------

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

-- relation_type/source/confidence checks were just added above; dropping by
-- column would remove them too, so drop only the type-column checks BEFORE
-- re-adding, scoped by column.
SELECT pg_temp.drop_column_checks('public.entity_links', 'source_type');
SELECT pg_temp.drop_column_checks('public.entity_links', 'target_type');

ALTER TABLE public.entity_links
  ADD CONSTRAINT entity_links_source_type_check CHECK (
    source_type IN ('person', 'org', 'work', 'billing', 'meeting', 'file', 'note', 'space')
  ),
  ADD CONSTRAINT entity_links_target_type_check CHECK (
    target_type IN ('person', 'org', 'work', 'billing', 'meeting', 'file', 'note', 'space')
  );

-- ----------------------------------------------------------------------------
-- 3. UNIQUE key includes relation_type
-- ----------------------------------------------------------------------------

ALTER TABLE public.entity_links
  DROP CONSTRAINT IF EXISTS entity_links_workspace_id_source_type_source_id_target_type_key;

-- Defensive: drop whatever unique constraint covers (workspace, source, target)
DO $$
DECLARE
  c record;
BEGIN
  FOR c IN
    SELECT con.conname
    FROM pg_constraint con
    WHERE con.conrelid = 'public.entity_links'::regclass
      AND con.contype = 'u'
  LOOP
    EXECUTE format('ALTER TABLE public.entity_links DROP CONSTRAINT %I', c.conname);
  END LOOP;
END;
$$;

ALTER TABLE public.entity_links
  ADD CONSTRAINT entity_links_edge_key
    UNIQUE (workspace_id, source_type, source_id, target_type, target_id, relation_type);

CREATE INDEX IF NOT EXISTS entity_links_relation_type_idx
  ON public.entity_links(workspace_id, relation_type);

-- ----------------------------------------------------------------------------
-- 4. Copy entity_relations rows in (normalized)
-- ----------------------------------------------------------------------------

INSERT INTO public.entity_links
  (workspace_id, source_type, source_id, target_type, target_id,
   relation_type, source, because, created_at, created_by)
SELECT
  er.workspace_id,
  CASE er.from_entity_type
    WHEN 'organization' THEN 'org'
    WHEN 'billing_record' THEN 'billing'
    WHEN 'project' THEN 'work'
    WHEN 'client_meeting' THEN 'meeting'
    ELSE er.from_entity_type
  END,
  er.from_entity_id,
  CASE er.to_entity_type
    WHEN 'organization' THEN 'org'
    WHEN 'billing_record' THEN 'billing'
    WHEN 'project' THEN 'work'
    WHEN 'client_meeting' THEN 'meeting'
    ELSE er.to_entity_type
  END,
  er.to_entity_id,
  CASE er.relation_type
    WHEN 'mentioned_in' THEN 'mention'
    WHEN 'works_at' THEN 'employment'
    WHEN 'contact_for' THEN 'employment'
    ELSE 'related'
  END,
  CASE WHEN er.relation_type = 'mentioned_in' THEN 'system' ELSE 'manual' END,
  er.context,
  er.created_at,
  er.created_by
FROM public.entity_relations er
WHERE
  -- Only spellings that normalize into the short dialect
  CASE er.from_entity_type
    WHEN 'organization' THEN 'org'
    WHEN 'billing_record' THEN 'billing'
    WHEN 'project' THEN 'work'
    WHEN 'client_meeting' THEN 'meeting'
    ELSE er.from_entity_type
  END IN ('person', 'org', 'work', 'billing', 'meeting', 'file', 'note', 'space')
  AND
  CASE er.to_entity_type
    WHEN 'organization' THEN 'org'
    WHEN 'billing_record' THEN 'billing'
    WHEN 'project' THEN 'work'
    WHEN 'client_meeting' THEN 'meeting'
    ELSE er.to_entity_type
  END IN ('person', 'org', 'work', 'billing', 'meeting', 'file', 'note', 'space')
ON CONFLICT (workspace_id, source_type, source_id, target_type, target_id, relation_type)
  DO NOTHING;

-- ============================================================================
-- DONE: entity_links is the unified explicit-edge store; entity_relations
-- stays readable until the app repoints, then drops in step 2.
-- ============================================================================
