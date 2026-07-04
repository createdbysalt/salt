-- ============================================================================
-- ENTITY SOURCE TRACKING: Add provider/source fields to memory entities
-- Migration: Add source tracking columns to people, organizations, projects,
--            client_meetings, and project_files tables
-- ============================================================================
--
-- Adds the same source tracking pattern used in billing_records to other
-- memory entities so we can track where records came from (e.g., HubSpot,
-- Gmail, Asana) and link back to the original resource.
--
-- New columns on each table:
--   - provider: enum of supported integrations (hubspot, gmail, asana, etc.)
--   - source_origin: how the record was created (found, created, extracted, imported)
--   - source_external_id: dedup key from source system
--   - app_url: link to original resource in source app
--   - capture_event_id: FK to capture_events if extracted from capture
--
-- ============================================================================

-- ============================================================================
-- 1. CREATE SHARED ENUMS
-- ============================================================================

-- Entity provider enum (shared across people, orgs, work, meetings, files)
-- This is a superset of all providers - each entity type uses a subset
DO $$ BEGIN
  CREATE TYPE public.entity_provider AS ENUM (
    'manual',
    -- CRM providers
    'hubspot',
    'salesforce',
    'pipedrive',
    -- Email/Calendar providers
    'gmail',
    'outlook',
    'google-calendar',
    'calendly',
    'calcom',
    -- Meeting providers
    'zoom',
    'fireflies',
    'granola',
    'recall',
    -- Project management providers
    'asana',
    'linear',
    'jira',
    'clickup',
    'monday',
    'trello',
    'notion',
    'airtable',
    -- Developer tools
    'github',
    'figma',
    -- Document providers
    'google-drive',
    'google-docs',
    'google-sheets',
    'docusign',
    'pandadoc',
    -- Communication
    'slack',
    -- Finance (for orgs synced from billing)
    'stripe',
    'quickbooks',
    'square'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Source origin enum (how record was created)
DO $$ BEGIN
  CREATE TYPE public.entity_source_origin AS ENUM (
    'found',      -- Found by Salt in a connected app
    'created',    -- Manually created by user
    'extracted',  -- Extracted from document/email by Ask Salt
    'imported'    -- Bulk imported
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- 2. ADD SOURCE COLUMNS TO PEOPLE TABLE
-- ============================================================================

ALTER TABLE public.people
  ADD COLUMN IF NOT EXISTS provider public.entity_provider DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS source_origin public.entity_source_origin DEFAULT 'created',
  ADD COLUMN IF NOT EXISTS source_external_id TEXT,
  ADD COLUMN IF NOT EXISTS app_url TEXT,
  ADD COLUMN IF NOT EXISTS capture_event_id UUID REFERENCES public.capture_events(id) ON DELETE SET NULL;

-- Index for dedup lookups
CREATE INDEX IF NOT EXISTS idx_people_source_external_id
  ON public.people(workspace_id, source_external_id)
  WHERE source_external_id IS NOT NULL;

-- Index for provider filtering
CREATE INDEX IF NOT EXISTS idx_people_provider
  ON public.people(workspace_id, provider)
  WHERE provider != 'manual';

COMMENT ON COLUMN public.people.provider IS 'Source integration (hubspot, gmail, etc.) or manual';
COMMENT ON COLUMN public.people.source_origin IS 'How record was created: found in app, created manually, extracted by Salt, or imported';
COMMENT ON COLUMN public.people.source_external_id IS 'Dedup key from source system, e.g. hubspot:contact:123';
COMMENT ON COLUMN public.people.app_url IS 'URL to view record in source app';
COMMENT ON COLUMN public.people.capture_event_id IS 'FK to capture_events if extracted from capture';

-- ============================================================================
-- 3. ADD SOURCE COLUMNS TO ORGANIZATIONS TABLE
-- ============================================================================

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS provider public.entity_provider DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS source_origin public.entity_source_origin DEFAULT 'created',
  ADD COLUMN IF NOT EXISTS source_external_id TEXT,
  ADD COLUMN IF NOT EXISTS app_url TEXT,
  ADD COLUMN IF NOT EXISTS capture_event_id UUID REFERENCES public.capture_events(id) ON DELETE SET NULL;

-- Index for dedup lookups
CREATE INDEX IF NOT EXISTS idx_organizations_source_external_id
  ON public.organizations(workspace_id, source_external_id)
  WHERE source_external_id IS NOT NULL;

-- Index for provider filtering
CREATE INDEX IF NOT EXISTS idx_organizations_provider
  ON public.organizations(workspace_id, provider)
  WHERE provider != 'manual';

COMMENT ON COLUMN public.organizations.provider IS 'Source integration (hubspot, stripe, etc.) or manual';
COMMENT ON COLUMN public.organizations.source_origin IS 'How record was created: found in app, created manually, extracted by Salt, or imported';
COMMENT ON COLUMN public.organizations.source_external_id IS 'Dedup key from source system, e.g. hubspot:company:123';
COMMENT ON COLUMN public.organizations.app_url IS 'URL to view record in source app';
COMMENT ON COLUMN public.organizations.capture_event_id IS 'FK to capture_events if extracted from capture';

-- ============================================================================
-- 4. ADD SOURCE COLUMNS TO PROJECTS TABLE (Work)
-- ============================================================================

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS provider public.entity_provider DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS source_origin public.entity_source_origin DEFAULT 'created',
  ADD COLUMN IF NOT EXISTS source_external_id TEXT,
  ADD COLUMN IF NOT EXISTS app_url TEXT,
  ADD COLUMN IF NOT EXISTS capture_event_id UUID REFERENCES public.capture_events(id) ON DELETE SET NULL;

-- Index for dedup lookups
CREATE INDEX IF NOT EXISTS idx_projects_source_external_id
  ON public.projects(workspace_id, source_external_id)
  WHERE source_external_id IS NOT NULL;

-- Index for provider filtering
CREATE INDEX IF NOT EXISTS idx_projects_provider
  ON public.projects(workspace_id, provider)
  WHERE provider != 'manual';

COMMENT ON COLUMN public.projects.provider IS 'Source integration (asana, linear, etc.) or manual';
COMMENT ON COLUMN public.projects.source_origin IS 'How record was created: found in app, created manually, extracted by Salt, or imported';
COMMENT ON COLUMN public.projects.source_external_id IS 'Dedup key from source system, e.g. asana:project:123';
COMMENT ON COLUMN public.projects.app_url IS 'URL to view record in source app';
COMMENT ON COLUMN public.projects.capture_event_id IS 'FK to capture_events if extracted from capture';

-- ============================================================================
-- 5. ADD SOURCE COLUMNS TO CLIENT_MEETINGS TABLE
-- ============================================================================
-- Note: client_meetings already has external_provider but it's calendar-specific.
-- We add generic source tracking alongside it.

ALTER TABLE public.client_meetings
  ADD COLUMN IF NOT EXISTS provider public.entity_provider DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS source_origin public.entity_source_origin DEFAULT 'created',
  ADD COLUMN IF NOT EXISTS source_external_id TEXT,
  ADD COLUMN IF NOT EXISTS app_url TEXT,
  ADD COLUMN IF NOT EXISTS capture_event_id UUID REFERENCES public.capture_events(id) ON DELETE SET NULL;

-- Migrate existing external_provider data to new provider column
UPDATE public.client_meetings
SET provider = CASE
  WHEN external_provider = 'google' THEN 'google-calendar'::public.entity_provider
  ELSE 'manual'::public.entity_provider
END,
source_origin = CASE
  WHEN origin = 'google' THEN 'found'::public.entity_source_origin
  ELSE 'created'::public.entity_source_origin
END,
source_external_id = CASE
  WHEN external_event_id IS NOT NULL THEN 'gcal:' || external_calendar_id || ':' || external_event_id
  ELSE NULL
END
WHERE provider IS NULL OR provider = 'manual';

-- Index for dedup lookups
CREATE INDEX IF NOT EXISTS idx_client_meetings_source_external_id
  ON public.client_meetings(workspace_id, source_external_id)
  WHERE source_external_id IS NOT NULL;

-- Index for provider filtering
CREATE INDEX IF NOT EXISTS idx_client_meetings_provider
  ON public.client_meetings(workspace_id, provider)
  WHERE provider != 'manual';

COMMENT ON COLUMN public.client_meetings.provider IS 'Source integration (google-calendar, zoom, etc.) or manual';
COMMENT ON COLUMN public.client_meetings.source_origin IS 'How record was created: found in app, created manually, extracted by Salt, or imported';
COMMENT ON COLUMN public.client_meetings.source_external_id IS 'Dedup key from source system, e.g. gcal:calendarId:eventId';
COMMENT ON COLUMN public.client_meetings.app_url IS 'URL to view meeting in source app';
COMMENT ON COLUMN public.client_meetings.capture_event_id IS 'FK to capture_events if extracted from capture';

-- ============================================================================
-- 6. ADD SOURCE COLUMNS TO PROJECT_FILES TABLE
-- ============================================================================

ALTER TABLE public.project_files
  ADD COLUMN IF NOT EXISTS provider public.entity_provider DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS source_origin public.entity_source_origin DEFAULT 'created',
  ADD COLUMN IF NOT EXISTS source_external_id TEXT,
  ADD COLUMN IF NOT EXISTS app_url TEXT,
  ADD COLUMN IF NOT EXISTS capture_event_id UUID REFERENCES public.capture_events(id) ON DELETE SET NULL;

-- Index for dedup lookups
CREATE INDEX IF NOT EXISTS idx_project_files_source_external_id
  ON public.project_files(workspace_id, source_external_id)
  WHERE source_external_id IS NOT NULL;

-- Index for provider filtering
CREATE INDEX IF NOT EXISTS idx_project_files_provider
  ON public.project_files(workspace_id, provider)
  WHERE provider != 'manual';

COMMENT ON COLUMN public.project_files.provider IS 'Source integration (google-drive, figma, etc.) or manual';
COMMENT ON COLUMN public.project_files.source_origin IS 'How record was created: found in app, uploaded manually, extracted by Salt, or imported';
COMMENT ON COLUMN public.project_files.source_external_id IS 'Dedup key from source system, e.g. gdrive:fileId';
COMMENT ON COLUMN public.project_files.app_url IS 'URL to view file in source app';
COMMENT ON COLUMN public.project_files.capture_event_id IS 'FK to capture_events if extracted from capture';

-- ============================================================================
-- 7. GRANT PERMISSIONS
-- ============================================================================

-- Grant usage on new enums to authenticated users
GRANT USAGE ON TYPE public.entity_provider TO authenticated;
GRANT USAGE ON TYPE public.entity_source_origin TO authenticated;
