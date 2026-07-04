-- ============================================================================
-- FILES ENRICHMENT: Rich extraction, activities, and entity links
-- ============================================================================
-- Enables files to power incredible plays with:
-- 1. Rich AI-extracted data (line items, amounts, dates, mentions)
-- 2. Activity timeline (upload, view, share, sign events)
-- 3. Entity links (file ↔ person/org/work connections)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Add extraction columns to project_files
-- ----------------------------------------------------------------------------

-- Rich structured extraction data (line items, amounts, dates, mentions)
ALTER TABLE public.project_files
  ADD COLUMN IF NOT EXISTS extracted_data JSONB DEFAULT '{}';

-- Extraction status tracking (separate from ai_status for summary)
ALTER TABLE public.project_files
  ADD COLUMN IF NOT EXISTS extraction_status TEXT DEFAULT 'pending'
    CHECK (extraction_status IN ('pending', 'processing', 'completed', 'failed', 'unsupported'));

-- Extraction version for re-processing on model updates
ALTER TABLE public.project_files
  ADD COLUMN IF NOT EXISTS extraction_version INT DEFAULT 1;

-- Document type classification
ALTER TABLE public.project_files
  ADD COLUMN IF NOT EXISTS document_type TEXT
    CHECK (document_type IN (
      'proposal', 'contract', 'invoice', 'sow', 'nda',
      'deliverable', 'brief', 'receipt', 'estimate', 'other'
    ));

-- Lifecycle status for contracts/proposals
ALTER TABLE public.project_files
  ADD COLUMN IF NOT EXISTS lifecycle_status TEXT
    CHECK (lifecycle_status IN (
      'draft', 'sent', 'viewed', 'awaiting_signature',
      'signed', 'expired', 'archived'
    ));

-- Key dates extracted from document
ALTER TABLE public.project_files
  ADD COLUMN IF NOT EXISTS due_date DATE,
  ADD COLUMN IF NOT EXISTS expiry_date DATE,
  ADD COLUMN IF NOT EXISTS signed_date DATE;

-- Revenue signals
ALTER TABLE public.project_files
  ADD COLUMN IF NOT EXISTS total_amount_cents BIGINT,
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD';

-- Follow-up signals for plays
ALTER TABLE public.project_files
  ADD COLUMN IF NOT EXISTS follow_up_suggested BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS follow_up_date DATE,
  ADD COLUMN IF NOT EXISTS follow_up_reason TEXT;

-- Index for extraction queue
CREATE INDEX IF NOT EXISTS idx_project_files_extraction_status
  ON public.project_files(extraction_status)
  WHERE extraction_status IN ('pending', 'processing');

-- Index for document type filtering
CREATE INDEX IF NOT EXISTS idx_project_files_document_type
  ON public.project_files(document_type)
  WHERE document_type IS NOT NULL;

-- Index for lifecycle status
CREATE INDEX IF NOT EXISTS idx_project_files_lifecycle_status
  ON public.project_files(lifecycle_status)
  WHERE lifecycle_status IS NOT NULL;

-- Index for follow-up queue
CREATE INDEX IF NOT EXISTS idx_project_files_follow_up
  ON public.project_files(follow_up_date)
  WHERE follow_up_suggested = TRUE;

-- ----------------------------------------------------------------------------
-- 2. Extend entity_links to support 'file' type
-- ----------------------------------------------------------------------------

-- Drop existing constraints
ALTER TABLE public.entity_links
  DROP CONSTRAINT IF EXISTS entity_links_source_type_check;

ALTER TABLE public.entity_links
  DROP CONSTRAINT IF EXISTS entity_links_target_type_check;

-- Re-add with 'file' included
ALTER TABLE public.entity_links
  ADD CONSTRAINT entity_links_source_type_check
    CHECK (source_type IN ('person', 'org', 'work', 'space', 'file'));

ALTER TABLE public.entity_links
  ADD CONSTRAINT entity_links_target_type_check
    CHECK (target_type IN ('person', 'org', 'work', 'space', 'file'));

-- Index for file links
CREATE INDEX IF NOT EXISTS entity_links_file_source_idx
  ON public.entity_links(workspace_id, source_id)
  WHERE source_type = 'file';

CREATE INDEX IF NOT EXISTS entity_links_file_target_idx
  ON public.entity_links(workspace_id, target_id)
  WHERE target_type = 'file';

-- ----------------------------------------------------------------------------
-- 3. Create file_activities table
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.file_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  file_id UUID NOT NULL REFERENCES public.project_files(id) ON DELETE CASCADE,

  -- Activity type
  activity_type TEXT NOT NULL CHECK (activity_type IN (
    'uploaded',           -- File first uploaded
    'viewed',             -- File viewed/previewed
    'downloaded',         -- File downloaded
    'shared',             -- File shared via email/link
    'sent',               -- File sent as attachment
    'signed',             -- Document signed
    'signature_requested', -- Signature requested
    'commented',          -- Comment added
    'revised',            -- New version uploaded
    'linked',             -- Linked to entity
    'unlinked',           -- Unlinked from entity
    'extraction_completed', -- AI extraction finished
    'metadata_updated',   -- Manual metadata edit
    'lifecycle_changed',  -- Status change (draft → sent, etc.)
    'follow_up_created',  -- Play created for follow-up
    'archived',           -- File archived
    'restored'            -- File restored from archive
  )),

  -- Actor (internal user or external description)
  actor_id UUID REFERENCES auth.users(id),
  actor_label TEXT,  -- For external actors: "John Smith (client)"

  -- Activity-specific metadata
  metadata JSONB DEFAULT '{}',
  -- Examples:
  -- shared: {to_email, via: 'email'|'link', message?}
  -- sent: {to_email, subject, play_id?}
  -- signed: {role: 'client'|'vendor', signature_method: 'docusign'|'manual'}
  -- linked: {target_type, target_id, target_label}
  -- lifecycle_changed: {from_status, to_status}
  -- extraction_completed: {version, document_type, confidence}

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX file_activities_file_idx
  ON public.file_activities(file_id, created_at DESC);

CREATE INDEX file_activities_workspace_idx
  ON public.file_activities(workspace_id, created_at DESC);

CREATE INDEX file_activities_actor_idx
  ON public.file_activities(actor_id)
  WHERE actor_id IS NOT NULL;

CREATE INDEX file_activities_type_idx
  ON public.file_activities(activity_type);

-- ----------------------------------------------------------------------------
-- 4. Row Level Security for file_activities
-- ----------------------------------------------------------------------------

ALTER TABLE public.file_activities ENABLE ROW LEVEL SECURITY;

-- Workspace members can view activities in their workspace
CREATE POLICY "workspace_members_view_file_activities"
  ON public.file_activities FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid()
    )
  );

-- Workspace members can create activities
CREATE POLICY "workspace_members_create_file_activities"
  ON public.file_activities FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------------------
-- 5. Add source tracking columns to project_files (if not exists)
-- ----------------------------------------------------------------------------

-- Source provider for provenance tracking
ALTER TABLE public.project_files
  ADD COLUMN IF NOT EXISTS source_provider TEXT;

-- Source origin (found/extracted/created)
ALTER TABLE public.project_files
  ADD COLUMN IF NOT EXISTS source_origin TEXT
    CHECK (source_origin IN ('found', 'extracted', 'created', 'imported'));

-- External URL (e.g., Google Drive link)
ALTER TABLE public.project_files
  ADD COLUMN IF NOT EXISTS app_url TEXT;

-- Capture source URL (for extractions from email)
ALTER TABLE public.project_files
  ADD COLUMN IF NOT EXISTS capture_source_url TEXT;

-- External ID for dedup
ALTER TABLE public.project_files
  ADD COLUMN IF NOT EXISTS source_external_id TEXT;

-- Reclassification flag (user marked extraction as manual)
ALTER TABLE public.project_files
  ADD COLUMN IF NOT EXISTS source_reclassified_as_manual BOOLEAN DEFAULT FALSE;

-- ----------------------------------------------------------------------------
-- 6. Comments
-- ----------------------------------------------------------------------------

COMMENT ON COLUMN public.project_files.extracted_data IS
  'AI-extracted structured data: line items, amounts, dates, mentioned entities, topics';

COMMENT ON COLUMN public.project_files.extraction_status IS
  'Status of rich content extraction: pending, processing, completed, failed, unsupported';

COMMENT ON COLUMN public.project_files.document_type IS
  'Classified document type: proposal, contract, invoice, sow, nda, deliverable, brief, other';

COMMENT ON COLUMN public.project_files.lifecycle_status IS
  'Document lifecycle: draft, sent, viewed, awaiting_signature, signed, expired, archived';

COMMENT ON COLUMN public.project_files.follow_up_suggested IS
  'AI suggests creating a follow-up play for this file';

COMMENT ON TABLE public.file_activities IS
  'Activity timeline for files: uploads, views, shares, signatures, links, metadata changes';

COMMENT ON COLUMN public.file_activities.actor_label IS
  'Human-readable label for external actors (e.g., "John Smith (client)")';

COMMENT ON COLUMN public.file_activities.metadata IS
  'Activity-specific data: to_email, target_type/id, status changes, etc.';
