-- ============================================================================
-- User-authored playbook definitions (Phase 4 groundwork)
-- ============================================================================
--
-- Design of record: docs/plans/2026-08-08-playbook-definitions-storage.md
--
-- Playbook definitions become storage-agnostic: the same Zod schema
-- (PlaybookDefinitionV2Schema) loads from repo files (Salt-authored pre-mades)
-- or from these rows (user-authored). Validation happens in application code
-- on write (savePlaybookDefinition) and again on read — never as a DB CHECK.
--
-- play_runs references playbooks by slug in source_context (no FK), so
-- archiving a definition never breaks run history.
--
-- Rollback: DROP TABLE public.playbook_definitions;
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.playbook_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- NULL = Salt-authored row (reserved; not used while pre-mades live in the
  -- repo). Set = user-authored definition owned by that workspace.
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,

  -- Identity. User-authored slugs are namespaced per workspace so they can
  -- shadow or extend pre-mades without global collisions.
  slug text NOT NULL,
  version text NOT NULL,

  -- The full PlaybookDefinitionV2 document, validated with
  -- PlaybookDefinitionV2Schema in the server action BEFORE insert/update.
  definition jsonb NOT NULL,

  -- Provenance + lifecycle
  source text NOT NULL DEFAULT 'db' CHECK (source IN ('repo', 'db')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (workspace_id, slug)
);

CREATE INDEX IF NOT EXISTS playbook_definitions_workspace_idx
  ON public.playbook_definitions(workspace_id) WHERE status = 'active';

ALTER TABLE public.playbook_definitions ENABLE ROW LEVEL SECURITY;

-- Salt-authored rows (workspace_id IS NULL) readable by every member;
-- workspace rows follow the standard membership pattern.
CREATE POLICY "members_read_playbook_definitions" ON public.playbook_definitions
  FOR SELECT USING (
    workspace_id IS NULL
    OR workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "members_manage_own_playbook_definitions" ON public.playbook_definitions
  FOR ALL USING (
    workspace_id IS NOT NULL
    AND workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'member')
    )
  );

COMMENT ON TABLE public.playbook_definitions IS
  'User-authored playbook definitions (jsonb, Zod-validated on write). Repo files remain the only Salt-authored source; merge order gives workspace rows precedence on slug conflict.';
