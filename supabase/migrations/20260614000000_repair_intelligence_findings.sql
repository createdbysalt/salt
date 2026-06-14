-- Repair migration: Ensure intelligence_findings table exists
-- The original migration may have been marked as applied without running

-- Create types if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'finding_type') THEN
    CREATE TYPE public.finding_type AS ENUM (
      'revenue_buying',
      'revenue_closing',
      'revenue_upsell',
      'revenue_risk',
      'new_person',
      'new_org',
      'referral',
      'pending_question',
      'pending_deliverable',
      'pending_reply'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'finding_state') THEN
    CREATE TYPE public.finding_state AS ENUM (
      'needs_you',
      'auto_handled',
      'acted',
      'dismissed'
    );
  END IF;
END $$;

-- Create table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.intelligence_findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  person_id UUID REFERENCES public.people(id) ON DELETE CASCADE,
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  finding_type public.finding_type NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  evidence JSONB,
  confidence INTEGER NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
  state public.finding_state NOT NULL DEFAULT 'needs_you',
  triggered_plays JSONB,
  corrected_at TIMESTAMPTZ,
  corrected_by UUID REFERENCES auth.users(id),
  correction_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  acted_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,
  CONSTRAINT finding_has_target CHECK (person_id IS NOT NULL OR org_id IS NOT NULL)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS intelligence_findings_queue_idx
  ON intelligence_findings(workspace_id, state, created_at DESC)
  WHERE state = 'needs_you';

CREATE INDEX IF NOT EXISTS intelligence_findings_auto_idx
  ON intelligence_findings(workspace_id, state, created_at DESC)
  WHERE state = 'auto_handled';

CREATE INDEX IF NOT EXISTS intelligence_findings_person_idx
  ON intelligence_findings(person_id, created_at DESC)
  WHERE person_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS intelligence_findings_org_idx
  ON intelligence_findings(org_id, created_at DESC)
  WHERE org_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS intelligence_findings_revenue_idx
  ON intelligence_findings(workspace_id, finding_type, created_at DESC)
  WHERE finding_type IN ('revenue_buying', 'revenue_closing', 'revenue_upsell', 'revenue_risk');

-- Enable RLS
ALTER TABLE intelligence_findings ENABLE ROW LEVEL SECURITY;

-- RLS policies (drop first to be idempotent)
DROP POLICY IF EXISTS "workspace_members_view_findings" ON intelligence_findings;
CREATE POLICY "workspace_members_view_findings" ON intelligence_findings
FOR SELECT USING (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "workspace_members_manage_findings" ON intelligence_findings;
CREATE POLICY "workspace_members_manage_findings" ON intelligence_findings
FOR ALL USING (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'member')
  )
);

-- Grant access
GRANT SELECT, INSERT, UPDATE, DELETE ON intelligence_findings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON intelligence_findings TO service_role;
