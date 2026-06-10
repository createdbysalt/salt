-- ============================================================================
-- Migration: Spaces + play ownership
-- ============================================================================
--
-- Adds the durable collaboration and accountability layer:
-- - Existing teams become the workspace-scoped internal ownership primitive.
-- - Spaces replace Roundtables as role-aware collaboration containers.
-- - Plays gain human/team ownership, assignment, and target context.
--
-- This migration intentionally uses studio_id because the workspace rename is a
-- separate high-blast-radius migration.
-- ============================================================================

-- ============================================================================
-- 1. Extend existing teams for durable product use
-- ============================================================================

ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.teams
  DROP CONSTRAINT IF EXISTS teams_status_check;

ALTER TABLE public.teams
  ADD CONSTRAINT teams_status_check
  CHECK (status IN ('active', 'archived'));

CREATE UNIQUE INDEX IF NOT EXISTS idx_teams_studio_slug
  ON public.teams(studio_id, slug)
  WHERE slug IS NOT NULL;

COMMENT ON COLUMN public.teams.studio_id IS 'RENAME CHECKLIST: studio_id -> workspace_id in workspace-rename wave';
COMMENT ON TABLE public.teams IS 'Workspace-scoped internal groups used for ownership, assignments, and visibility.';

-- ============================================================================
-- 2. Spaces
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.spaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id uuid NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,

  slug text,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('kickoff', 'active', 'stalled', 'closed', 'archived')),

  linked_entity_type text
    CHECK (
      linked_entity_type IS NULL OR linked_entity_type IN (
        'person',
        'organization',
        'project',
        'work',
        'client',
        'opportunity_gap',
        'play_run',
        'custom'
      )
    ),
  linked_entity_id uuid,

  owner_member_id uuid REFERENCES public.studio_members(id) ON DELETE SET NULL,
  owner_team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,

  visibility text NOT NULL DEFAULT 'internal'
    CHECK (visibility IN ('internal', 'team', 'client', 'mixed')),
  worth_attention text,
  is_pinned boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,

  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CHECK (owner_member_id IS NULL OR owner_team_id IS NULL),
  CHECK (
    (linked_entity_type IS NULL AND linked_entity_id IS NULL)
    OR
    (linked_entity_type IS NOT NULL AND linked_entity_id IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_spaces_studio_slug
  ON public.spaces(studio_id, slug)
  WHERE slug IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_spaces_studio_status
  ON public.spaces(studio_id, status);

CREATE INDEX IF NOT EXISTS idx_spaces_studio_pinned
  ON public.spaces(studio_id, is_pinned)
  WHERE is_pinned = true;

CREATE INDEX IF NOT EXISTS idx_spaces_owner_member
  ON public.spaces(owner_member_id)
  WHERE owner_member_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_spaces_owner_team
  ON public.spaces(owner_team_id)
  WHERE owner_team_id IS NOT NULL;

DROP TRIGGER IF EXISTS spaces_updated_at ON public.spaces;
CREATE TRIGGER spaces_updated_at
  BEFORE UPDATE ON public.spaces
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.spaces IS 'Role-aware collaboration containers around active client, project, relationship, or work context.';
COMMENT ON COLUMN public.spaces.studio_id IS 'RENAME CHECKLIST: studio_id -> workspace_id in workspace-rename wave';
COMMENT ON COLUMN public.spaces.owner_member_id IS 'Workspace member accountable for the Space; mutually exclusive with owner_team_id.';
COMMENT ON COLUMN public.spaces.owner_team_id IS 'Team accountable for the Space; mutually exclusive with owner_member_id.';

-- ============================================================================
-- 3. Space participants
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.space_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id uuid NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,
  space_id uuid NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,

  studio_member_id uuid REFERENCES public.studio_members(id) ON DELETE CASCADE,
  team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE,
  person_id uuid REFERENCES public.people(id) ON DELETE CASCADE,

  role text NOT NULL DEFAULT 'member'
    CHECK (role IN ('owner', 'admin', 'member', 'client', 'guest', 'watcher', 'player')),
  visibility_scope text NOT NULL DEFAULT 'internal'
    CHECK (visibility_scope IN ('internal', 'team', 'client', 'all')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,

  created_at timestamptz NOT NULL DEFAULT now(),

  CHECK (
    num_nonnulls(studio_member_id, team_id, person_id) = 1
  )
);

CREATE INDEX IF NOT EXISTS idx_space_participants_studio
  ON public.space_participants(studio_id);

CREATE INDEX IF NOT EXISTS idx_space_participants_space
  ON public.space_participants(space_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_space_participants_member_unique
  ON public.space_participants(space_id, studio_member_id)
  WHERE studio_member_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_space_participants_team_unique
  ON public.space_participants(space_id, team_id)
  WHERE team_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_space_participants_person_unique
  ON public.space_participants(space_id, person_id)
  WHERE person_id IS NOT NULL;

COMMENT ON TABLE public.space_participants IS 'Members, teams, and external people participating in a Space.';
COMMENT ON COLUMN public.space_participants.studio_id IS 'RENAME CHECKLIST: studio_id -> workspace_id in workspace-rename wave';

-- ============================================================================
-- 4. Space links
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.space_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id uuid NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,
  space_id uuid NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,

  entity_type text NOT NULL
    CHECK (
      entity_type IN (
        'person',
        'organization',
        'project',
        'work',
        'client',
        'file',
        'conversation',
        'meeting',
        'note',
        'play_run',
        'opportunity_gap',
        'team'
      )
    ),
  entity_id uuid NOT NULL,
  relation_type text,
  label text,
  visibility_scope text NOT NULL DEFAULT 'internal'
    CHECK (visibility_scope IN ('internal', 'team', 'client', 'all')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,

  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (space_id, entity_type, entity_id, relation_type)
);

CREATE INDEX IF NOT EXISTS idx_space_links_studio
  ON public.space_links(studio_id);

CREATE INDEX IF NOT EXISTS idx_space_links_space
  ON public.space_links(space_id);

CREATE INDEX IF NOT EXISTS idx_space_links_entity
  ON public.space_links(entity_type, entity_id);

COMMENT ON TABLE public.space_links IS 'Context graph links attached to a Space.';
COMMENT ON COLUMN public.space_links.studio_id IS 'RENAME CHECKLIST: studio_id -> workspace_id in workspace-rename wave';

-- ============================================================================
-- 5. Space decisions
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.space_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id uuid NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,
  space_id uuid NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,

  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'proposed', 'approved', 'declined', 'superseded')),
  visibility_scope text NOT NULL DEFAULT 'internal'
    CHECK (visibility_scope IN ('internal', 'team', 'client', 'all')),

  source_type text,
  source_id uuid,
  decided_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  decided_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,

  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_space_decisions_studio
  ON public.space_decisions(studio_id);

CREATE INDEX IF NOT EXISTS idx_space_decisions_space_status
  ON public.space_decisions(space_id, status);

DROP TRIGGER IF EXISTS space_decisions_updated_at ON public.space_decisions;
CREATE TRIGGER space_decisions_updated_at
  BEFORE UPDATE ON public.space_decisions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.space_decisions IS 'Open and resolved decisions attached to a Space.';
COMMENT ON COLUMN public.space_decisions.studio_id IS 'RENAME CHECKLIST: studio_id -> workspace_id in workspace-rename wave';

-- ============================================================================
-- 6. Play ownership + target context
-- ============================================================================

ALTER TABLE public.play_runs
  ADD COLUMN IF NOT EXISTS prepared_by_player_id uuid REFERENCES public.players(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS owner_member_id uuid REFERENCES public.studio_members(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS owner_team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS space_id uuid REFERENCES public.spaces(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS target_type text,
  ADD COLUMN IF NOT EXISTS target_id uuid,
  ADD COLUMN IF NOT EXISTS target_label text;

UPDATE public.play_runs
SET prepared_by_player_id = player_id
WHERE prepared_by_player_id IS NULL
  AND player_id IS NOT NULL;

ALTER TABLE public.play_runs
  DROP CONSTRAINT IF EXISTS play_runs_owner_check,
  DROP CONSTRAINT IF EXISTS play_runs_target_check,
  DROP CONSTRAINT IF EXISTS play_runs_target_type_check;

ALTER TABLE public.play_runs
  ADD CONSTRAINT play_runs_owner_check
  CHECK (owner_member_id IS NULL OR owner_team_id IS NULL),
  ADD CONSTRAINT play_runs_target_check
  CHECK (
    (target_type IS NULL AND target_id IS NULL)
    OR
    (target_type IS NOT NULL AND target_id IS NOT NULL)
  ),
  ADD CONSTRAINT play_runs_target_type_check
  CHECK (
    target_type IS NULL OR target_type IN (
      'person',
      'organization',
      'project',
      'work',
      'client',
      'space',
      'opportunity_gap',
      'conversation',
      'meeting',
      'file',
      'custom'
    )
  );

CREATE INDEX IF NOT EXISTS idx_play_runs_owner_member
  ON public.play_runs(owner_member_id)
  WHERE owner_member_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_play_runs_owner_team
  ON public.play_runs(owner_team_id)
  WHERE owner_team_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_play_runs_space
  ON public.play_runs(space_id)
  WHERE space_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_play_runs_target
  ON public.play_runs(studio_id, target_type, target_id)
  WHERE target_type IS NOT NULL AND target_id IS NOT NULL;

COMMENT ON COLUMN public.play_runs.prepared_by_player_id IS 'AI Player that prepared or recommended the Play. Existing player_id remains for compatibility.';
COMMENT ON COLUMN public.play_runs.owner_member_id IS 'Workspace member accountable for the Play outcome; mutually exclusive with owner_team_id.';
COMMENT ON COLUMN public.play_runs.owner_team_id IS 'Team accountable for the Play outcome; mutually exclusive with owner_member_id.';
COMMENT ON COLUMN public.play_runs.space_id IS 'Optional Space this Play belongs to.';
COMMENT ON COLUMN public.play_runs.target_type IS 'Entity type this Play is about. Paired with target_id.';
COMMENT ON COLUMN public.play_runs.target_id IS 'Entity id this Play is about. Paired with target_type.';

-- ============================================================================
-- 7. Play run assignments
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.play_run_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id uuid NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,
  play_run_id uuid NOT NULL REFERENCES public.play_runs(id) ON DELETE CASCADE,

  assignee_member_id uuid REFERENCES public.studio_members(id) ON DELETE CASCADE,
  assignee_team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE,

  role text NOT NULL DEFAULT 'executor'
    CHECK (role IN ('owner', 'executor', 'reviewer', 'approver', 'watcher')),
  status text NOT NULL DEFAULT 'assigned'
    CHECK (status IN ('assigned', 'in_progress', 'completed', 'dismissed')),
  due_at timestamptz,
  completed_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,

  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CHECK (
    num_nonnulls(assignee_member_id, assignee_team_id) = 1
  )
);

CREATE INDEX IF NOT EXISTS idx_play_run_assignments_studio
  ON public.play_run_assignments(studio_id);

CREATE INDEX IF NOT EXISTS idx_play_run_assignments_run
  ON public.play_run_assignments(play_run_id);

CREATE INDEX IF NOT EXISTS idx_play_run_assignments_member
  ON public.play_run_assignments(assignee_member_id)
  WHERE assignee_member_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_play_run_assignments_team
  ON public.play_run_assignments(assignee_team_id)
  WHERE assignee_team_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_play_run_assignments_member_role_unique
  ON public.play_run_assignments(play_run_id, assignee_member_id, role)
  WHERE assignee_member_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_play_run_assignments_team_role_unique
  ON public.play_run_assignments(play_run_id, assignee_team_id, role)
  WHERE assignee_team_id IS NOT NULL;

DROP TRIGGER IF EXISTS play_run_assignments_updated_at ON public.play_run_assignments;
CREATE TRIGGER play_run_assignments_updated_at
  BEFORE UPDATE ON public.play_run_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.play_run_assignments IS 'Human and Team assignments for Play execution, review, approval, or watching.';
COMMENT ON COLUMN public.play_run_assignments.studio_id IS 'RENAME CHECKLIST: studio_id -> workspace_id in workspace-rename wave';

-- ============================================================================
-- 8. RLS
-- ============================================================================

ALTER TABLE public.spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.space_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.space_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.space_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.play_run_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "studio_members_view_spaces" ON public.spaces;
DROP POLICY IF EXISTS "studio_members_manage_spaces" ON public.spaces;
CREATE POLICY "studio_members_view_spaces" ON public.spaces
FOR SELECT USING (
  studio_id IN (SELECT studio_id FROM public.studio_members WHERE user_id = auth.uid())
);
CREATE POLICY "studio_members_manage_spaces" ON public.spaces
FOR ALL USING (
  studio_id IN (
    SELECT studio_id FROM public.studio_members
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'member')
  )
)
WITH CHECK (
  studio_id IN (
    SELECT studio_id FROM public.studio_members
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'member')
  )
);

DROP POLICY IF EXISTS "studio_members_view_space_participants" ON public.space_participants;
DROP POLICY IF EXISTS "studio_members_manage_space_participants" ON public.space_participants;
CREATE POLICY "studio_members_view_space_participants" ON public.space_participants
FOR SELECT USING (
  studio_id IN (SELECT studio_id FROM public.studio_members WHERE user_id = auth.uid())
);
CREATE POLICY "studio_members_manage_space_participants" ON public.space_participants
FOR ALL USING (
  studio_id IN (
    SELECT studio_id FROM public.studio_members
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'member')
  )
)
WITH CHECK (
  studio_id IN (
    SELECT studio_id FROM public.studio_members
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'member')
  )
);

DROP POLICY IF EXISTS "studio_members_view_space_links" ON public.space_links;
DROP POLICY IF EXISTS "studio_members_manage_space_links" ON public.space_links;
CREATE POLICY "studio_members_view_space_links" ON public.space_links
FOR SELECT USING (
  studio_id IN (SELECT studio_id FROM public.studio_members WHERE user_id = auth.uid())
);
CREATE POLICY "studio_members_manage_space_links" ON public.space_links
FOR ALL USING (
  studio_id IN (
    SELECT studio_id FROM public.studio_members
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'member')
  )
)
WITH CHECK (
  studio_id IN (
    SELECT studio_id FROM public.studio_members
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'member')
  )
);

DROP POLICY IF EXISTS "studio_members_view_space_decisions" ON public.space_decisions;
DROP POLICY IF EXISTS "studio_members_manage_space_decisions" ON public.space_decisions;
CREATE POLICY "studio_members_view_space_decisions" ON public.space_decisions
FOR SELECT USING (
  studio_id IN (SELECT studio_id FROM public.studio_members WHERE user_id = auth.uid())
);
CREATE POLICY "studio_members_manage_space_decisions" ON public.space_decisions
FOR ALL USING (
  studio_id IN (
    SELECT studio_id FROM public.studio_members
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'member')
  )
)
WITH CHECK (
  studio_id IN (
    SELECT studio_id FROM public.studio_members
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'member')
  )
);

DROP POLICY IF EXISTS "studio_members_view_play_run_assignments" ON public.play_run_assignments;
DROP POLICY IF EXISTS "studio_members_manage_play_run_assignments" ON public.play_run_assignments;
CREATE POLICY "studio_members_view_play_run_assignments" ON public.play_run_assignments
FOR SELECT USING (
  studio_id IN (SELECT studio_id FROM public.studio_members WHERE user_id = auth.uid())
);
CREATE POLICY "studio_members_manage_play_run_assignments" ON public.play_run_assignments
FOR ALL USING (
  studio_id IN (
    SELECT studio_id FROM public.studio_members
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'member')
  )
)
WITH CHECK (
  studio_id IN (
    SELECT studio_id FROM public.studio_members
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'member')
  )
);
