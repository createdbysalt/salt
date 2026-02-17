-- ============================================================================
-- Add companies table and company_id to clients
-- ============================================================================
-- Companies represent organizations that clients may belong to.
-- A client (individual) can optionally be associated with a company.
-- ============================================================================

-- ============================================================================
-- STEP 1: CREATE COMPANIES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id uuid NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  website text,
  industry text,
  settings jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(studio_id, slug)
);

-- ============================================================================
-- STEP 2: CREATE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS companies_studio_id_idx ON public.companies(studio_id);
CREATE INDEX IF NOT EXISTS companies_name_idx ON public.companies(studio_id, name);

-- ============================================================================
-- STEP 3: ENABLE RLS
-- ============================================================================

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 4: CREATE RLS POLICIES
-- ============================================================================

-- Studio members can view companies in their studio
CREATE POLICY "studio_members_view_companies" ON public.companies
FOR SELECT USING (
  studio_id IN (
    SELECT studio_id FROM public.studio_members
    WHERE user_id = auth.uid()
  )
);

-- Studio members can manage companies
CREATE POLICY "studio_members_manage_companies" ON public.companies
FOR ALL USING (
  studio_id IN (
    SELECT studio_id FROM public.studio_members
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'member')
  )
);

-- ============================================================================
-- STEP 5: ADD COMPANY_ID TO CLIENTS
-- ============================================================================

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL;

-- Index for efficient company lookups
CREATE INDEX IF NOT EXISTS clients_company_id_idx ON public.clients(company_id)
  WHERE company_id IS NOT NULL;

-- ============================================================================
-- STEP 6: CREATE UPDATED_AT TRIGGER
-- ============================================================================

-- Create or replace the trigger function (may already exist)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for companies table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_companies_updated_at'
  ) THEN
    CREATE TRIGGER update_companies_updated_at
    BEFORE UPDATE ON public.companies
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END;
$$;

-- ============================================================================
-- STEP 7: ADD COMMENTS
-- ============================================================================

COMMENT ON TABLE public.companies IS 'Organizations that clients may belong to. Studio-scoped.';
COMMENT ON COLUMN public.companies.studio_id IS 'The studio that owns this company record.';
COMMENT ON COLUMN public.companies.name IS 'Company display name.';
COMMENT ON COLUMN public.companies.slug IS 'URL-safe identifier, unique per studio.';
COMMENT ON COLUMN public.companies.website IS 'Company website URL.';
COMMENT ON COLUMN public.companies.industry IS 'Industry category.';
COMMENT ON COLUMN public.clients.company_id IS 'Optional reference to the company this client belongs to.';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
--
-- Summary of changes:
-- ✅ Created companies table with RLS
-- ✅ Added company_id column to clients with foreign key
-- ✅ Added indexes for efficient querying
-- ✅ Added RLS policies for studio member access
--
-- ============================================================================
