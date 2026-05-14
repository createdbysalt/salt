-- ============================================================================
-- ENTITY ARCHITECTURE: Data Migration
-- Migration: Copy existing clients to organizations + people tables
-- ============================================================================
--
-- This migration copies data from `clients` to the new entity tables.
-- The `clients` table is NOT modified or deleted - it remains as fallback.
--
-- Migration strategy:
--   1. Organization clients → organizations + primary contact person
--   2. Individual clients → people directly
--   3. client_users → link to people.portal_user_id
--   4. Track lineage via migrated_from_client_id
--
-- ============================================================================

-- ============================================================================
-- 1. MIGRATE ORGANIZATION CLIENTS → ORGANIZATIONS
-- ============================================================================

INSERT INTO public.organizations (
  id,
  studio_id,
  name,
  slug,
  relationship_status,
  notes,
  metadata,
  created_at,
  updated_at,
  deleted_at,
  migrated_from_client_id
)
SELECT
  gen_random_uuid(),
  c.studio_id,
  c.name,
  c.slug,
  -- Map lifecycle_stage to relationship_status
  CASE
    WHEN c.lifecycle_stage IN ('lead', 'discovery', 'pitch', 'prospect') THEN 'prospect'
    WHEN c.lifecycle_stage IN ('active', 'client') THEN 'client'
    WHEN c.lifecycle_stage IN ('complete', 'on-hold') THEN 'past_client'
    WHEN c.lifecycle_stage = 'lost' THEN 'other'
    ELSE 'prospect'
  END,
  c.notes,
  COALESCE(c.settings, '{}'::jsonb),
  c.created_at,
  c.updated_at,
  c.deleted_at,
  c.id  -- Track source client
FROM public.clients c
WHERE c.client_type = 'organization'
  AND NOT EXISTS (
    SELECT 1 FROM public.organizations o
    WHERE o.migrated_from_client_id = c.id
  );

-- ============================================================================
-- 2. CREATE PRIMARY CONTACT PERSONS FOR ORGANIZATION CLIENTS
-- ============================================================================

INSERT INTO public.people (
  id,
  studio_id,
  name,
  email,
  phone,
  relationship_status,
  notes,
  metadata,
  created_at,
  updated_at,
  migrated_from_client_id
)
SELECT
  gen_random_uuid(),
  c.studio_id,
  -- Use primary contact name from settings, or generate from company name
  COALESCE(
    c.settings->>'primary_contact_name',
    c.name || ' (Primary Contact)'
  ),
  c.contact_email,
  c.contact_phone,
  -- Inherit relationship status from client
  CASE
    WHEN c.lifecycle_stage IN ('lead', 'discovery', 'pitch', 'prospect') THEN 'prospect'
    WHEN c.lifecycle_stage IN ('active', 'client') THEN 'client'
    WHEN c.lifecycle_stage IN ('complete', 'on-hold') THEN 'past_client'
    WHEN c.lifecycle_stage = 'lost' THEN 'other'
    ELSE 'prospect'
  END,
  NULL, -- Notes stay on organization
  '{}'::jsonb,
  c.created_at,
  c.updated_at,
  c.id  -- Track source client
FROM public.clients c
WHERE c.client_type = 'organization'
  AND (c.contact_email IS NOT NULL OR c.contact_phone IS NOT NULL)
  AND NOT EXISTS (
    SELECT 1 FROM public.people p
    WHERE p.migrated_from_client_id = c.id
  );

-- ============================================================================
-- 3. LINK PRIMARY CONTACTS TO THEIR ORGANIZATIONS
-- ============================================================================

INSERT INTO public.organization_people (
  organization_id,
  person_id,
  role,
  is_primary
)
SELECT
  o.id,
  p.id,
  'Primary Contact',
  TRUE
FROM public.organizations o
JOIN public.people p ON p.migrated_from_client_id = o.migrated_from_client_id
WHERE o.migrated_from_client_id IS NOT NULL
  AND p.migrated_from_client_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.organization_people op
    WHERE op.organization_id = o.id AND op.person_id = p.id
  );

-- ============================================================================
-- 4. MIGRATE INDIVIDUAL CLIENTS → PEOPLE
-- ============================================================================

INSERT INTO public.people (
  id,
  studio_id,
  name,
  email,
  phone,
  relationship_status,
  notes,
  metadata,
  created_at,
  updated_at,
  deleted_at,
  migrated_from_client_id
)
SELECT
  gen_random_uuid(),
  c.studio_id,
  c.name,
  c.contact_email,
  c.contact_phone,
  -- Map lifecycle_stage to relationship_status
  CASE
    WHEN c.lifecycle_stage IN ('lead', 'discovery', 'pitch', 'prospect') THEN 'prospect'
    WHEN c.lifecycle_stage IN ('active', 'client') THEN 'client'
    WHEN c.lifecycle_stage IN ('complete', 'on-hold') THEN 'past_client'
    WHEN c.lifecycle_stage = 'lost' THEN 'other'
    ELSE 'prospect'
  END,
  c.notes,
  COALESCE(c.settings, '{}'::jsonb),
  c.created_at,
  c.updated_at,
  c.deleted_at,
  c.id  -- Track source client
FROM public.clients c
WHERE c.client_type = 'individual'
  AND NOT EXISTS (
    SELECT 1 FROM public.people p
    WHERE p.migrated_from_client_id = c.id
  );

-- ============================================================================
-- 5. LINK CLIENT_USERS TO PEOPLE (Portal Access)
-- ============================================================================

-- First, create people records for client_users that don't have one
INSERT INTO public.people (
  id,
  studio_id,
  name,
  email,
  relationship_status,
  portal_user_id,
  created_at,
  updated_at,
  migrated_from_client_user_id
)
SELECT
  gen_random_uuid(),
  c.studio_id,
  COALESCE(p.raw_user_meta_data->>'full_name', p.raw_user_meta_data->>'name', cu.email),
  cu.email,
  'client',
  cu.user_id,
  cu.created_at,
  cu.updated_at,
  cu.id
FROM public.client_users cu
JOIN public.clients c ON c.id = cu.client_id
JOIN auth.users p ON p.id = cu.user_id
WHERE NOT EXISTS (
  -- Don't duplicate if we already have a person for this client
  SELECT 1 FROM public.people pe
  WHERE pe.migrated_from_client_id = cu.client_id
    AND pe.email = cu.email
)
AND NOT EXISTS (
  -- Don't duplicate if already migrated
  SELECT 1 FROM public.people pe
  WHERE pe.migrated_from_client_user_id = cu.id
);

-- Update existing people records with portal_user_id if they match by email
UPDATE public.people p
SET portal_user_id = cu.user_id
FROM public.client_users cu
JOIN public.clients c ON c.id = cu.client_id
WHERE p.migrated_from_client_id = c.id
  AND p.email = cu.email
  AND p.portal_user_id IS NULL;

-- ============================================================================
-- 6. VALIDATION QUERIES (Run manually to verify)
-- ============================================================================

-- Check migration counts
DO $$
DECLARE
  v_org_clients INTEGER;
  v_orgs INTEGER;
  v_ind_clients INTEGER;
  v_people_from_ind INTEGER;
  v_people_total INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_org_clients FROM clients WHERE client_type = 'organization';
  SELECT COUNT(*) INTO v_orgs FROM organizations WHERE migrated_from_client_id IS NOT NULL;
  SELECT COUNT(*) INTO v_ind_clients FROM clients WHERE client_type = 'individual';
  SELECT COUNT(*) INTO v_people_from_ind FROM people WHERE migrated_from_client_id IN (SELECT id FROM clients WHERE client_type = 'individual');
  SELECT COUNT(*) INTO v_people_total FROM people;

  RAISE NOTICE 'Migration Summary:';
  RAISE NOTICE '  Organization clients: % → Organizations: %', v_org_clients, v_orgs;
  RAISE NOTICE '  Individual clients: % → People (from individuals): %', v_ind_clients, v_people_from_ind;
  RAISE NOTICE '  Total people created: %', v_people_total;
END $$;

-- ============================================================================
-- DONE: Data migrated
-- The clients table is unchanged and serves as fallback
-- Next: Update queries to read from new tables
-- ============================================================================
