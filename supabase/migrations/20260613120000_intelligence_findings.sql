-- ============================================================================
-- INTELLIGENCE FINDINGS: People-centric findings from the intelligence engine
-- Migration: Create intelligence_findings table + relationship_type on people
-- ============================================================================
--
-- Findings are always attached to a Person or Org — never orphaned.
-- The daily intelligence scan creates findings; they appear in the Plays queue.
--
-- Finding types:
-- - Revenue signals: buying, closing, upsell, risk
-- - Relationship signals: new person, new org, referral
-- - Pending actions: question, deliverable, reply needed
--
-- ============================================================================

-- ============================================================================
-- FINDING TYPES AND STATES
-- ============================================================================

CREATE TYPE public.finding_type AS ENUM (
  -- Revenue signals (highest priority)
  'revenue_buying',      -- "What would it cost...", "Do you have availability..."
  'revenue_closing',     -- "Let's move forward", "Send me the contract"
  'revenue_upsell',      -- Existing client mentions new need
  'revenue_risk',        -- "We need to pause", "Budget got cut"

  -- Relationship signals
  'new_person',          -- New person worth tracking
  'new_org',             -- New org worth tracking
  'referral',            -- "Got your name from Sarah"

  -- Pending actions
  'pending_question',    -- They asked something, you didn't answer
  'pending_deliverable', -- They're waiting on something from you
  'pending_reply'        -- Thread ended with their message, 3+ days ago
);

CREATE TYPE public.finding_state AS ENUM (
  'needs_you',      -- Low/medium confidence, needs human decision
  'auto_handled',   -- High confidence, Salt handled it
  'acted',          -- Human took action
  'dismissed'       -- Human dismissed
);

-- ============================================================================
-- INTELLIGENCE FINDINGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.intelligence_findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,

  -- Must be attached to a Person or Org (never orphaned)
  person_id UUID REFERENCES public.people(id) ON DELETE CASCADE,
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,

  -- Finding details
  finding_type public.finding_type NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  evidence JSONB,  -- Source emails, quotes, timestamps

  -- Confidence and state
  confidence INTEGER NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
  state public.finding_state NOT NULL DEFAULT 'needs_you',

  -- System plays triggered by this finding
  triggered_plays JSONB,  -- [{slug, input, result, at}]

  -- Correction tracking (for learning)
  corrected_at TIMESTAMPTZ,
  corrected_by UUID REFERENCES auth.users(id),
  correction_reason TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  acted_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,

  -- Must have a target
  CONSTRAINT finding_has_target CHECK (person_id IS NOT NULL OR org_id IS NOT NULL)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Queue queries (needs_you findings for a workspace)
CREATE INDEX intelligence_findings_queue_idx
  ON intelligence_findings(workspace_id, state, created_at DESC)
  WHERE state = 'needs_you';

-- Auto-handled audit view
CREATE INDEX intelligence_findings_auto_idx
  ON intelligence_findings(workspace_id, state, created_at DESC)
  WHERE state = 'auto_handled';

-- Findings by person
CREATE INDEX intelligence_findings_person_idx
  ON intelligence_findings(person_id, created_at DESC)
  WHERE person_id IS NOT NULL;

-- Findings by org
CREATE INDEX intelligence_findings_org_idx
  ON intelligence_findings(org_id, created_at DESC)
  WHERE org_id IS NOT NULL;

-- Revenue signals (highest priority)
CREATE INDEX intelligence_findings_revenue_idx
  ON intelligence_findings(workspace_id, finding_type, created_at DESC)
  WHERE finding_type IN ('revenue_buying', 'revenue_closing', 'revenue_upsell', 'revenue_risk');

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE intelligence_findings ENABLE ROW LEVEL SECURITY;

-- Workspace members can view findings in their workspace
CREATE POLICY "workspace_members_view_findings" ON intelligence_findings
FOR SELECT USING (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  )
);

-- Workspace members can manage findings in their workspace
CREATE POLICY "workspace_members_manage_findings" ON intelligence_findings
FOR ALL USING (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'member')
  )
);

-- ============================================================================
-- RELATIONSHIP TYPE ON PEOPLE
-- ============================================================================

-- Add relationship_type to people table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'people'
    AND column_name = 'relationship_type'
  ) THEN
    ALTER TABLE public.people
    ADD COLUMN relationship_type TEXT
    CHECK (relationship_type IN ('client', 'prospect', 'team', 'partner', 'vendor', 'personal', 'unknown'));
  END IF;
END $$;

-- Add created_via to track how entity was created
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'people'
    AND column_name = 'created_via'
  ) THEN
    ALTER TABLE public.people
    ADD COLUMN created_via TEXT
    CHECK (created_via IN ('manual', 'system_play', 'bootstrap', 'import'));
  END IF;
END $$;

-- Same for orgs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'orgs'
    AND column_name = 'created_via'
  ) THEN
    ALTER TABLE public.organizations
    ADD COLUMN created_via TEXT
    CHECK (created_via IN ('manual', 'system_play', 'bootstrap', 'import'));
  END IF;
END $$;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.intelligence_findings IS 'People-centric findings from the daily intelligence scan. Always attached to a Person or Org.';
COMMENT ON COLUMN public.intelligence_findings.evidence IS 'Source data: email IDs, quotes, timestamps that support this finding';
COMMENT ON COLUMN public.intelligence_findings.triggered_plays IS 'System plays executed as a result of this finding';
COMMENT ON COLUMN public.intelligence_findings.confidence IS '0-100 score. >85 = auto_handled, 50-85 = needs_you with inference flag, <50 = needs_you';
