-- ============================================================================
-- BRIDGE FILES: Project file storage and management
-- ============================================================================
-- Enables clients and studio members to upload/download project files
-- Organized by project with categories for easy filtering
-- ============================================================================

-- Create bridge-files storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'bridge-files',
  'bridge-files',
  false, -- Private bucket
  52428800, -- 50MB limit
  ARRAY[
    -- Images
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
    -- Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    -- Archives
    'application/zip',
    'application/x-rar-compressed',
    -- Text
    'text/plain',
    'text/csv',
    -- Design files
    'application/octet-stream' -- For .fig, .sketch, etc.
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Create file category enum
DO $$ BEGIN
  CREATE TYPE file_category AS ENUM (
    'brand_asset',
    'deliverable',
    'contract',
    'screenshot',
    'other'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create project_files table
CREATE TABLE IF NOT EXISTS public.project_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id uuid NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  
  -- Storage reference
  bucket_id text NOT NULL DEFAULT 'bridge-files',
  object_path text NOT NULL UNIQUE, -- Full path in storage bucket
  
  -- File metadata
  file_name text NOT NULL,
  mime_type text,
  size_bytes bigint NOT NULL,
  category file_category NOT NULL DEFAULT 'other',
  
  -- Upload tracking
  uploaded_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Timestamps
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  -- Constraints
  CONSTRAINT valid_size CHECK (size_bytes > 0 AND size_bytes <= 52428800)
);

-- Indexes for performance
CREATE INDEX idx_project_files_studio_id ON public.project_files(studio_id);
CREATE INDEX idx_project_files_client_id ON public.project_files(client_id);
CREATE INDEX idx_project_files_project_id ON public.project_files(project_id);
CREATE INDEX idx_project_files_category ON public.project_files(category);
CREATE INDEX idx_project_files_created_at ON public.project_files(created_at DESC);

-- Composite indexes for common queries
CREATE INDEX idx_project_files_project_category ON public.project_files(project_id, category);
CREATE INDEX idx_project_files_client_project ON public.project_files(client_id, project_id);

-- Enable RLS
ALTER TABLE public.project_files ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Studio members can manage files for their studios
CREATE POLICY "Studio members can view their project files"
  ON public.project_files FOR SELECT
  USING (
    studio_id IN (
      SELECT studio_id FROM public.studio_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Studio members can upload project files"
  ON public.project_files FOR INSERT
  WITH CHECK (
    studio_id IN (
      SELECT studio_id FROM public.studio_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Studio members can update their project files"
  ON public.project_files FOR UPDATE
  USING (
    studio_id IN (
      SELECT studio_id FROM public.studio_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Studio members can delete their project files"
  ON public.project_files FOR DELETE
  USING (
    studio_id IN (
      SELECT studio_id FROM public.studio_members
      WHERE user_id = auth.uid()
    )
  );

-- RLS Policies: Client users can view and upload files for their projects
CREATE POLICY "Client users can view their project files"
  ON public.project_files FOR SELECT
  USING (
    client_id IN (
      SELECT client_id FROM public.client_users
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Client users can upload files to their projects"
  ON public.project_files FOR INSERT
  WITH CHECK (
    client_id IN (
      SELECT client_id FROM public.client_users
      WHERE user_id = auth.uid()
    )
    AND project_id IN (
      SELECT id FROM public.projects
      WHERE client_id IN (
        SELECT client_id FROM public.client_users
        WHERE user_id = auth.uid()
      )
    )
  );

-- Storage policies for bridge-files bucket
-- Studio members can manage files in their studio paths
CREATE POLICY "Studio members can upload files to their studio path"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'bridge-files'
  AND (storage.foldername(name))[1] = 'studio'
  AND (storage.foldername(name))[2] IN (
    SELECT id::text FROM public.studios
    WHERE id IN (
      SELECT studio_id FROM public.studio_members
      WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Studio members can view files in their studio path"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'bridge-files'
  AND (storage.foldername(name))[1] = 'studio'
  AND (storage.foldername(name))[2] IN (
    SELECT id::text FROM public.studios
    WHERE id IN (
      SELECT studio_id FROM public.studio_members
      WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Studio members can update files in their studio path"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'bridge-files'
  AND (storage.foldername(name))[1] = 'studio'
  AND (storage.foldername(name))[2] IN (
    SELECT id::text FROM public.studios
    WHERE id IN (
      SELECT studio_id FROM public.studio_members
      WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Studio members can delete files in their studio path"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'bridge-files'
  AND (storage.foldername(name))[1] = 'studio'
  AND (storage.foldername(name))[2] IN (
    SELECT id::text FROM public.studios
    WHERE id IN (
      SELECT studio_id FROM public.studio_members
      WHERE user_id = auth.uid()
    )
  )
);

-- Client users can upload and view files in their client paths
CREATE POLICY "Client users can upload files to their client path"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'bridge-files'
  AND (storage.foldername(name))[1] = 'studio'
  AND (storage.foldername(name))[3] = 'client'
  AND (storage.foldername(name))[4] IN (
    SELECT id::text FROM public.clients
    WHERE id IN (
      SELECT client_id FROM public.client_users
      WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Client users can view files in their client path"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'bridge-files'
  AND (storage.foldername(name))[1] = 'studio'
  AND (storage.foldername(name))[3] = 'client'
  AND (storage.foldername(name))[4] IN (
    SELECT id::text FROM public.clients
    WHERE id IN (
      SELECT client_id FROM public.client_users
      WHERE user_id = auth.uid()
    )
  )
);

-- Comments
COMMENT ON TABLE public.project_files IS 'File metadata for Bridge project files stored in Supabase Storage';
COMMENT ON COLUMN public.project_files.object_path IS 'Full path in storage bucket: studio/{studioId}/client/{clientId}/project/{projectId}/{yyyy-mm}/{uuid}-{sanitizedFileName}';
COMMENT ON COLUMN public.project_files.category IS 'File category for organization: brand_asset, deliverable, contract, screenshot, other';
COMMENT ON COLUMN public.project_files.uploaded_by IS 'User who uploaded the file (studio member or client user)';


