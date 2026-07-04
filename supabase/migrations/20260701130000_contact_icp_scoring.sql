-- ============================================================================
-- Contact ICP Scoring: Add ICP-relevant fields to people and organizations
-- ============================================================================
-- Adds computed ICP fit scores and behavioral signals that Salt uses to
-- identify which contacts match defined ICP segments.
-- ============================================================================

-- ═══════════════════════════════════════════════════════════════════════════
-- PEOPLE TABLE EXTENSIONS
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── ICP fit scoring ────────────────────────────────────────────────────────
ALTER TABLE public.people
  ADD COLUMN IF NOT EXISTS icp_fit_score INTEGER
    CHECK (icp_fit_score IS NULL OR (icp_fit_score >= 0 AND icp_fit_score <= 100));

ALTER TABLE public.people
  ADD COLUMN IF NOT EXISTS icp_fit_status TEXT
    DEFAULT 'auto'
    CHECK (icp_fit_status IN ('auto', 'confirmed', 'dismissed'));

ALTER TABLE public.people
  ADD COLUMN IF NOT EXISTS icp_fit_signals JSONB DEFAULT '{}'::jsonb;

-- ─── Engagement signals ─────────────────────────────────────────────────────
ALTER TABLE public.people
  ADD COLUMN IF NOT EXISTS avg_response_time_hours NUMERIC;

ALTER TABLE public.people
  ADD COLUMN IF NOT EXISTS first_contact_at TIMESTAMPTZ;

ALTER TABLE public.people
  ADD COLUMN IF NOT EXISTS days_to_first_project INTEGER;

-- ─── Commercial signals ─────────────────────────────────────────────────────
ALTER TABLE public.people
  ADD COLUMN IF NOT EXISTS total_project_value_cents BIGINT DEFAULT 0;

ALTER TABLE public.people
  ADD COLUMN IF NOT EXISTS project_count INTEGER DEFAULT 0;

ALTER TABLE public.people
  ADD COLUMN IF NOT EXISTS successful_project_count INTEGER DEFAULT 0;

-- ─── Referral signals ───────────────────────────────────────────────────────
ALTER TABLE public.people
  ADD COLUMN IF NOT EXISTS referral_given BOOLEAN DEFAULT FALSE;

ALTER TABLE public.people
  ADD COLUMN IF NOT EXISTS referral_received BOOLEAN DEFAULT FALSE;

-- ─── Indexes for people ─────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_people_icp_fit_score
  ON public.people(workspace_id, icp_fit_score DESC NULLS LAST)
  WHERE icp_fit_score IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_people_icp_fit_status
  ON public.people(workspace_id, icp_fit_status)
  WHERE deleted_at IS NULL;

-- ═══════════════════════════════════════════════════════════════════════════
-- ORGANIZATIONS TABLE EXTENSIONS
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── ICP fit scoring ────────────────────────────────────────────────────────
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS icp_fit_score INTEGER
    CHECK (icp_fit_score IS NULL OR (icp_fit_score >= 0 AND icp_fit_score <= 100));

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS icp_fit_status TEXT
    DEFAULT 'auto'
    CHECK (icp_fit_status IN ('auto', 'confirmed', 'dismissed'));

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS icp_fit_signals JSONB DEFAULT '{}'::jsonb;

-- ─── Company sizing (inferred by Salt) ──────────────────────────────────────
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS estimated_company_size TEXT
    CHECK (estimated_company_size IS NULL OR estimated_company_size IN (
      'solo', '2-10', '11-50', '51-200', '200+'
    ));

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS estimated_budget_tier TEXT
    CHECK (estimated_budget_tier IS NULL OR estimated_budget_tier IN (
      'budget', 'mid-market', 'premium'
    ));

-- ─── Commercial signals ─────────────────────────────────────────────────────
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS total_project_value_cents BIGINT DEFAULT 0;

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS project_count INTEGER DEFAULT 0;

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS successful_project_count INTEGER DEFAULT 0;

-- ─── Indexes for organizations ──────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_organizations_icp_fit_score
  ON public.organizations(workspace_id, icp_fit_score DESC NULLS LAST)
  WHERE icp_fit_score IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_organizations_icp_fit_status
  ON public.organizations(workspace_id, icp_fit_status)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_organizations_estimated_company_size
  ON public.organizations(workspace_id, estimated_company_size)
  WHERE estimated_company_size IS NOT NULL AND deleted_at IS NULL;

-- ═══════════════════════════════════════════════════════════════════════════
-- COMMENTS
-- ═══════════════════════════════════════════════════════════════════════════

COMMENT ON COLUMN public.people.icp_fit_score IS
  'Overall ICP fit score (0-100) computed by Salt across all ICP segments';

COMMENT ON COLUMN public.people.icp_fit_status IS
  'auto = Salt computed, confirmed = user verified, dismissed = user rejected';

COMMENT ON COLUMN public.people.icp_fit_signals IS
  'Breakdown of scoring signals: {"industry": 30, "budget": 25, "engagement": 20}';

COMMENT ON COLUMN public.people.avg_response_time_hours IS
  'Average time to respond to emails, computed from thread timestamps';

COMMENT ON COLUMN public.people.total_project_value_cents IS
  'Sum of all project values with this person, in cents';

COMMENT ON COLUMN public.people.referral_given IS
  'TRUE if this person has referred other clients to you';

COMMENT ON COLUMN public.people.referral_received IS
  'TRUE if this person was referred to you by someone else';

COMMENT ON COLUMN public.people.days_to_first_project IS
  'Days from first contact to first project start (sales velocity)';

COMMENT ON COLUMN public.organizations.estimated_company_size IS
  'Salt-inferred company size from email signatures, LinkedIn, etc.';

COMMENT ON COLUMN public.organizations.estimated_budget_tier IS
  'Salt-inferred budget tier based on project history and signals';
