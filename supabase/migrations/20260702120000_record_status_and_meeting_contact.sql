-- ============================================================================
-- RECORD STATUS + MEETING CONTACT FIELDS (Phase 1.3 / 2.3 of keeper-field-contracts)
-- ============================================================================
--
-- 1. record_status on people + organizations.
--    Today the Active/Inactive control on both detail pages is pure client
--    state. Definition (canon, keeper-field-contracts):
--      A person is ACTIVE when ANY of: communication either direction in the
--      last 90 days; contact on open work; billing activity in the last 90
--      days or an open receivable/payable; something scheduled ahead.
--      An org is ACTIVE when those signals aggregate across its people/work.
--    Precedence: a user selection always wins immediately (source=manual);
--    Keeper only auto-updates keeper-sourced or never-set statuses and logs
--    to lifecycle_events; sustained contradiction raises an ask-first play.
--
-- 2. client_meetings.address / phone_number — the Overview tab already
--    renders editors for both (in-person + phone meetings); the columns
--    never existed, so saves were rejected by the allow-list.
-- ============================================================================

-- ============================================================================
-- 1. RECORD STATUS
-- ============================================================================

ALTER TABLE public.people
  ADD COLUMN IF NOT EXISTS record_status TEXT NOT NULL DEFAULT 'active'
    CHECK (record_status IN ('active', 'inactive')),
  ADD COLUMN IF NOT EXISTS record_status_source TEXT
    CHECK (record_status_source IN ('manual', 'keeper')),
  ADD COLUMN IF NOT EXISTS record_status_changed_at TIMESTAMPTZ;

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS record_status TEXT NOT NULL DEFAULT 'active'
    CHECK (record_status IN ('active', 'inactive')),
  ADD COLUMN IF NOT EXISTS record_status_source TEXT
    CHECK (record_status_source IN ('manual', 'keeper')),
  ADD COLUMN IF NOT EXISTS record_status_changed_at TIMESTAMPTZ;

COMMENT ON COLUMN public.people.record_status IS
  'active | inactive. NULL source = never explicitly set (Keeper may derive). See keeper-field-contracts canon for the 90-day signal definition.';
COMMENT ON COLUMN public.people.record_status_source IS
  'manual = user set it (Keeper never silently overrides); keeper = derived from activity signals.';
COMMENT ON COLUMN public.organizations.record_status IS
  'active | inactive. NULL source = never explicitly set (Keeper may derive). See keeper-field-contracts canon for the aggregated signal definition.';
COMMENT ON COLUMN public.organizations.record_status_source IS
  'manual = user set it (Keeper never silently overrides); keeper = derived from activity signals.';

CREATE INDEX IF NOT EXISTS idx_people_record_status
  ON public.people(workspace_id, record_status);
CREATE INDEX IF NOT EXISTS idx_organizations_record_status
  ON public.organizations(workspace_id, record_status);

-- ============================================================================
-- 2. MEETING CONTACT FIELDS
-- ============================================================================

ALTER TABLE public.client_meetings
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS phone_number TEXT;

COMMENT ON COLUMN public.client_meetings.address IS
  'Physical address for in-person meetings (location_type = in-person).';
COMMENT ON COLUMN public.client_meetings.phone_number IS
  'Dial-in number for phone meetings (location_type = phone).';

-- ============================================================================
-- DONE
-- ============================================================================
