-- ============================================================================
-- MODERN ENTITY FKS (schema-modernization Phase B, Batch 1)
-- ============================================================================
--
-- The four tables below could only reference the legacy `clients` table
-- (client_id NOT NULL), which is why live code still mints new clients rows
-- (capture executor, cal webhook, gmail sync). This migration:
--   1. adds nullable person_id / organization_id FKs to the modern tables
--   2. relaxes client_id to nullable so new rows can stop minting clients
--   3. backfills the new columns from the clients mapping columns
--      (clients.migrated_to_person_id / migrated_to_org_id)
--
-- Additive + data-safe. The clients table itself is NOT dropped here
-- (gated on the Pre-0.2 environment decision).
-- ============================================================================

-- ============================================================================
-- 1. ADD COLUMNS
-- ============================================================================

ALTER TABLE public.client_meetings
  ADD COLUMN IF NOT EXISTS person_id UUID REFERENCES public.people(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS person_id UUID REFERENCES public.people(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;

ALTER TABLE public.project_files
  ADD COLUMN IF NOT EXISTS person_id UUID REFERENCES public.people(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;

ALTER TABLE public.client_emails
  ADD COLUMN IF NOT EXISTS person_id UUID REFERENCES public.people(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_client_meetings_person_id ON public.client_meetings(person_id) WHERE person_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_projects_person_id ON public.projects(person_id) WHERE person_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_projects_organization_id ON public.projects(organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_project_files_person_id ON public.project_files(person_id) WHERE person_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_project_files_organization_id ON public.project_files(organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_client_emails_person_id ON public.client_emails(person_id) WHERE person_id IS NOT NULL;

-- ============================================================================
-- 2. RELAX client_id
-- ============================================================================

ALTER TABLE public.client_meetings ALTER COLUMN client_id DROP NOT NULL;
ALTER TABLE public.projects ALTER COLUMN client_id DROP NOT NULL;
ALTER TABLE public.project_files ALTER COLUMN client_id DROP NOT NULL;
ALTER TABLE public.client_emails ALTER COLUMN client_id DROP NOT NULL;

-- ============================================================================
-- 3. BACKFILL FROM THE CLIENTS MAPPING
-- ============================================================================
-- NOTE: the only mapping that exists is modern -> legacy
-- (people/organizations.migrated_from_client_id). The reverse columns
-- (clients.migrated_to_person_id / migrated_to_org_id) never existed —
-- app code that selects them fails silently today and gets ported in
-- Batch 3 to read the new columns below instead.

UPDATE public.client_meetings m
SET person_id = p.id
FROM public.people p
WHERE p.migrated_from_client_id = m.client_id
  AND m.person_id IS NULL;

UPDATE public.client_meetings m
SET organization_id = o.id
FROM public.organizations o
WHERE o.migrated_from_client_id = m.client_id
  AND m.organization_id IS NULL;

UPDATE public.projects pr
SET person_id = p.id
FROM public.people p
WHERE p.migrated_from_client_id = pr.client_id
  AND pr.person_id IS NULL;

UPDATE public.projects pr
SET organization_id = o.id
FROM public.organizations o
WHERE o.migrated_from_client_id = pr.client_id
  AND pr.organization_id IS NULL;

UPDATE public.project_files f
SET person_id = p.id
FROM public.people p
WHERE p.migrated_from_client_id = f.client_id
  AND f.person_id IS NULL;

UPDATE public.project_files f
SET organization_id = o.id
FROM public.organizations o
WHERE o.migrated_from_client_id = f.client_id
  AND f.organization_id IS NULL;

UPDATE public.client_emails e
SET person_id = p.id
FROM public.people p
WHERE p.migrated_from_client_id = e.client_id
  AND e.person_id IS NULL;

UPDATE public.client_emails e
SET organization_id = o.id
FROM public.organizations o
WHERE o.migrated_from_client_id = e.client_id
  AND e.organization_id IS NULL;

COMMENT ON COLUMN public.client_meetings.person_id IS
  'Modern FK to people. client_id is legacy (clients consolidation, schema-modernization Phase B).';
COMMENT ON COLUMN public.projects.organization_id IS
  'Modern FK to organizations. client_id is legacy (clients consolidation, schema-modernization Phase B).';

-- ============================================================================
-- DONE
-- ============================================================================
