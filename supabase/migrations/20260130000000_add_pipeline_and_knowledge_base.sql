-- ============================================================================
-- SPRINT 1: PIPELINE AND KNOWLEDGE BASE MIGRATION
-- Migration: Add lifecycle stages to clients, create knowledge base table
-- ============================================================================

-- ============================================================================
-- STEP 1: ADD LIFECYCLE COLUMNS TO CLIENTS TABLE
-- ============================================================================

-- Add lifecycle_stage column with constraint
ALTER TABLE public.clients
ADD COLUMN lifecycle_stage text DEFAULT 'lead'
CHECK (lifecycle_stage IN ('lead', 'discovery', 'pitch', 'active', 'complete', 'archived'));

-- Add stage_order_index for ordering within a stage
ALTER TABLE public.clients
ADD COLUMN stage_order_index integer DEFAULT 0;

-- Create index for efficient pipeline queries
CREATE INDEX clients_lifecycle_stage_idx ON public.clients(studio_id, lifecycle_stage);

-- Migrate existing clients to 'active' stage
UPDATE public.clients SET lifecycle_stage = 'active' WHERE lifecycle_stage IS NULL;

-- ============================================================================
-- STEP 2: CREATE CLIENT KNOWLEDGE BASE TABLE
-- ============================================================================

CREATE TABLE public.client_knowledge_base (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id uuid NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  title text NOT NULL,
  content_type text NOT NULL CHECK (content_type IN ('document', 'transcript', 'intake_response', 'note', 'link')),
  content text,
  file_path text,
  file_name text,
  file_size_bytes integer,
  mime_type text,
  external_url text,
  source text DEFAULT 'manual',
  tags text[] DEFAULT '{}',
  is_pinned boolean DEFAULT false,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- ============================================================================
-- STEP 3: CREATE INDEXES FOR KNOWLEDGE BASE
-- ============================================================================

CREATE INDEX client_knowledge_base_studio_id_idx ON public.client_knowledge_base(studio_id);
CREATE INDEX client_knowledge_base_client_id_idx ON public.client_knowledge_base(client_id);
CREATE INDEX client_knowledge_base_content_type_idx ON public.client_knowledge_base(client_id, content_type);
CREATE INDEX client_knowledge_base_is_pinned_idx ON public.client_knowledge_base(client_id, is_pinned);

-- ============================================================================
-- STEP 4: ENABLE RLS ON KNOWLEDGE BASE
-- ============================================================================

ALTER TABLE public.client_knowledge_base ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 5: CREATE RLS POLICIES FOR KNOWLEDGE BASE
-- ============================================================================

-- Studio members can view knowledge base items for their clients
CREATE POLICY "studio_members_view_knowledge_base" ON public.client_knowledge_base
FOR SELECT USING (
  studio_id IN (
    SELECT studio_id FROM public.studio_members
    WHERE user_id = auth.uid()
  )
);

-- Studio members can manage knowledge base items
CREATE POLICY "studio_members_manage_knowledge_base" ON public.client_knowledge_base
FOR ALL USING (
  studio_id IN (
    SELECT studio_id FROM public.studio_members
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'member')
  )
);

-- Client users can view their own knowledge base items
CREATE POLICY "client_users_view_knowledge_base" ON public.client_knowledge_base
FOR SELECT USING (
  client_id IN (
    SELECT client_id FROM public.client_users
    WHERE user_id = auth.uid()
  )
);

-- ============================================================================
-- STEP 6: CREATE UPDATED_AT TRIGGER FOR KNOWLEDGE BASE
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Only create trigger if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_client_knowledge_base_updated_at'
  ) THEN
    CREATE TRIGGER update_client_knowledge_base_updated_at
    BEFORE UPDATE ON public.client_knowledge_base
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END;
$$;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
--
-- Summary of changes:
-- ✅ Added lifecycle_stage column to clients (lead, discovery, pitch, active, complete, archived)
-- ✅ Added stage_order_index column to clients for ordering within stages
-- ✅ Created client_knowledge_base table for per-client document storage
-- ✅ Added RLS policies for knowledge base (studio members + client users)
-- ✅ Added indexes for efficient querying
-- ✅ Migrated existing clients to 'active' stage
--
-- ============================================================================
