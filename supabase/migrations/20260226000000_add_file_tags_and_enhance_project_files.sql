-- ============================================================================
-- FILE TAGS & ENHANCED PROJECT FILES
-- ============================================================================
-- Adds flexible file tagging system with:
-- - System default tags (cannot delete, can rename)
-- - Custom studio tags (can add/delete)
-- - File direction tracking (from_client, to_client, internal)
-- - Client visibility control (shared_with_client)
-- - Support for client-level files (not tied to specific project)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Create file_direction enum
-- ----------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE file_direction AS ENUM ('from_client', 'to_client', 'internal');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ----------------------------------------------------------------------------
-- 2. Create file_tags table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.file_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- NULL studio_id = system default, otherwise studio-specific
  studio_id uuid REFERENCES public.studios(id) ON DELETE CASCADE,

  -- For studio overrides of system tags
  system_tag_id uuid REFERENCES public.file_tags(id) ON DELETE CASCADE,

  -- Tag properties
  label text NOT NULL,
  color text DEFAULT '#6b7280', -- Default gray
  default_direction file_direction, -- Hint for auto-selecting direction

  -- System tag protection
  is_system boolean NOT NULL DEFAULT false,

  -- Ordering
  display_order int NOT NULL DEFAULT 0,

  -- Timestamps
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,

  -- Constraints
  CONSTRAINT file_tags_label_length CHECK (char_length(label) >= 1 AND char_length(label) <= 50),
  CONSTRAINT file_tags_system_no_studio CHECK (
    (is_system = true AND studio_id IS NULL) OR
    (is_system = false)
  )
);

-- Indexes
CREATE INDEX idx_file_tags_studio_id ON public.file_tags(studio_id);
CREATE INDEX idx_file_tags_is_system ON public.file_tags(is_system);
CREATE INDEX idx_file_tags_system_tag_id ON public.file_tags(system_tag_id);

-- Unique constraint: one label per studio (or system)
CREATE UNIQUE INDEX idx_file_tags_unique_label
  ON public.file_tags(COALESCE(studio_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(label))
  WHERE system_tag_id IS NULL;

-- ----------------------------------------------------------------------------
-- 3. Insert system default file tags
-- ----------------------------------------------------------------------------
INSERT INTO public.file_tags (id, studio_id, label, color, default_direction, is_system, display_order)
VALUES
  -- From Client (things client provides)
  ('11111111-1111-1111-1111-111111111111', NULL, 'Brand Asset', '#8b5cf6', 'from_client', true, 1),
  ('22222222-2222-2222-2222-222222222222', NULL, 'Reference', '#06b6d4', 'from_client', true, 2),

  -- To Client (things studio provides)
  ('33333333-3333-3333-3333-333333333333', NULL, 'Deliverable', '#22c55e', 'to_client', true, 3),
  ('44444444-4444-4444-4444-444444444444', NULL, 'Proposal', '#f59e0b', 'to_client', true, 4),
  ('55555555-5555-5555-5555-555555555555', NULL, 'Invoice', '#ef4444', 'to_client', true, 5),

  -- Bidirectional
  ('66666666-6666-6666-6666-666666666666', NULL, 'Contract', '#3b82f6', NULL, true, 6)
ON CONFLICT DO NOTHING;

-- ----------------------------------------------------------------------------
-- 4. Create file_tag_assignments junction table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.file_tag_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id uuid NOT NULL REFERENCES public.project_files(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.file_tags(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,

  -- Each file can only have each tag once
  CONSTRAINT file_tag_assignments_unique UNIQUE (file_id, tag_id)
);

-- Indexes
CREATE INDEX idx_file_tag_assignments_file_id ON public.file_tag_assignments(file_id);
CREATE INDEX idx_file_tag_assignments_tag_id ON public.file_tag_assignments(tag_id);

-- ----------------------------------------------------------------------------
-- 5. Enhance project_files table
-- ----------------------------------------------------------------------------

-- Add direction column
ALTER TABLE public.project_files
  ADD COLUMN IF NOT EXISTS direction file_direction DEFAULT 'internal';

-- Add shared_with_client column
ALTER TABLE public.project_files
  ADD COLUMN IF NOT EXISTS shared_with_client boolean DEFAULT false;

-- Add description column
ALTER TABLE public.project_files
  ADD COLUMN IF NOT EXISTS description text;

-- Make project_id nullable (for client-level files not tied to a project)
ALTER TABLE public.project_files
  ALTER COLUMN project_id DROP NOT NULL;

-- Add constraint: must have either project_id or client_id
ALTER TABLE public.project_files
  DROP CONSTRAINT IF EXISTS project_files_has_owner;
ALTER TABLE public.project_files
  ADD CONSTRAINT project_files_has_owner
  CHECK (project_id IS NOT NULL OR client_id IS NOT NULL);

-- Add index for client-level files
CREATE INDEX IF NOT EXISTS idx_project_files_client_only
  ON public.project_files(client_id)
  WHERE project_id IS NULL;

-- Add index for direction filtering
CREATE INDEX IF NOT EXISTS idx_project_files_direction
  ON public.project_files(direction);

-- Add index for shared files
CREATE INDEX IF NOT EXISTS idx_project_files_shared
  ON public.project_files(shared_with_client)
  WHERE shared_with_client = true;

-- ----------------------------------------------------------------------------
-- 6. Migrate existing category data to tags
-- ----------------------------------------------------------------------------
-- Create tag assignments for existing files based on their category
INSERT INTO public.file_tag_assignments (file_id, tag_id)
SELECT
  pf.id as file_id,
  CASE pf.category
    WHEN 'brand_asset' THEN '11111111-1111-1111-1111-111111111111'::uuid
    WHEN 'deliverable' THEN '33333333-3333-3333-3333-333333333333'::uuid
    WHEN 'contract' THEN '66666666-6666-6666-6666-666666666666'::uuid
    WHEN 'screenshot' THEN '11111111-1111-1111-1111-111111111111'::uuid -- Map to Brand Asset
    WHEN 'other' THEN NULL -- Skip 'other', no tag needed
  END as tag_id
FROM public.project_files pf
WHERE pf.category IS NOT NULL
  AND pf.category != 'other'
ON CONFLICT DO NOTHING;

-- Update direction based on category for existing files
UPDATE public.project_files
SET direction = CASE category
  WHEN 'brand_asset' THEN 'from_client'::file_direction
  WHEN 'deliverable' THEN 'to_client'::file_direction
  WHEN 'contract' THEN 'to_client'::file_direction -- Default contracts to studio-provided
  WHEN 'screenshot' THEN 'from_client'::file_direction
  ELSE 'internal'::file_direction
END
WHERE direction = 'internal' AND category IS NOT NULL;

-- Set shared_with_client based on direction
UPDATE public.project_files
SET shared_with_client = CASE
  WHEN direction IN ('from_client', 'to_client') THEN true
  ELSE false
END
WHERE shared_with_client = false;

-- ----------------------------------------------------------------------------
-- 7. RLS Policies for file_tags
-- ----------------------------------------------------------------------------
ALTER TABLE public.file_tags ENABLE ROW LEVEL SECURITY;

-- Everyone can view system tags
CREATE POLICY "Anyone can view system file tags"
  ON public.file_tags FOR SELECT
  USING (is_system = true AND studio_id IS NULL);

-- Studio members can view their studio's tags
CREATE POLICY "Studio members can view their file tags"
  ON public.file_tags FOR SELECT
  USING (
    studio_id IN (
      SELECT studio_id FROM public.studio_members
      WHERE user_id = auth.uid()
    )
  );

-- Studio members can create custom tags (not system tags)
CREATE POLICY "Studio members can create custom file tags"
  ON public.file_tags FOR INSERT
  WITH CHECK (
    is_system = false AND
    studio_id IN (
      SELECT studio_id FROM public.studio_members
      WHERE user_id = auth.uid()
    )
  );

-- Studio members can update their tags (including system tag overrides)
CREATE POLICY "Studio members can update their file tags"
  ON public.file_tags FOR UPDATE
  USING (
    studio_id IN (
      SELECT studio_id FROM public.studio_members
      WHERE user_id = auth.uid()
    )
  );

-- Studio members can delete custom tags only (not system tags)
CREATE POLICY "Studio members can delete custom file tags"
  ON public.file_tags FOR DELETE
  USING (
    is_system = false AND
    studio_id IN (
      SELECT studio_id FROM public.studio_members
      WHERE user_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------------------
-- 8. RLS Policies for file_tag_assignments
-- ----------------------------------------------------------------------------
ALTER TABLE public.file_tag_assignments ENABLE ROW LEVEL SECURITY;

-- Studio members can view tag assignments for their files
CREATE POLICY "Studio members can view file tag assignments"
  ON public.file_tag_assignments FOR SELECT
  USING (
    file_id IN (
      SELECT id FROM public.project_files
      WHERE studio_id IN (
        SELECT studio_id FROM public.studio_members
        WHERE user_id = auth.uid()
      )
    )
  );

-- Studio members can manage tag assignments for their files
CREATE POLICY "Studio members can manage file tag assignments"
  ON public.file_tag_assignments FOR ALL
  USING (
    file_id IN (
      SELECT id FROM public.project_files
      WHERE studio_id IN (
        SELECT studio_id FROM public.studio_members
        WHERE user_id = auth.uid()
      )
    )
  );

-- Client users can view tag assignments for their files
CREATE POLICY "Client users can view their file tag assignments"
  ON public.file_tag_assignments FOR SELECT
  USING (
    file_id IN (
      SELECT id FROM public.project_files
      WHERE client_id IN (
        SELECT client_id FROM public.client_users
        WHERE user_id = auth.uid()
      )
      AND shared_with_client = true
    )
  );

-- ----------------------------------------------------------------------------
-- 9. Comments
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public.file_tags IS 'File categorization tags with system defaults and custom studio tags';
COMMENT ON COLUMN public.file_tags.is_system IS 'System tags cannot be deleted, only renamed via studio override';
COMMENT ON COLUMN public.file_tags.system_tag_id IS 'If set, this is a studio-specific override of a system tag label';
COMMENT ON COLUMN public.file_tags.default_direction IS 'Suggested direction when this tag is selected';

COMMENT ON TABLE public.file_tag_assignments IS 'Many-to-many relationship between files and tags';

COMMENT ON COLUMN public.project_files.direction IS 'File flow: from_client (client provided), to_client (studio provided), internal (not shared)';
COMMENT ON COLUMN public.project_files.shared_with_client IS 'Whether file is visible in client Bridge portal';
COMMENT ON COLUMN public.project_files.description IS 'Optional description or notes about the file';
