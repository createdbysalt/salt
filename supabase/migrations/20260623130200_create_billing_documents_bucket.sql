-- ============================================================================
-- BILLING MEMORY: Document upload storage
-- ============================================================================
-- Private workspace-scoped bucket for invoices, receipts, bills, and payable
-- documents uploaded into Billing Memory.
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'billing-documents',
  'billing-documents',
  false,
  26214400,
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'text/plain',
    'text/csv'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- storage.objects is owned by supabase_storage_admin on hosted projects; avoid
-- COMMENT ON POLICY (42501: must be owner of relation objects).
DROP POLICY IF EXISTS "workspace_members_upload_billing_documents" ON storage.objects;
CREATE POLICY "workspace_members_upload_billing_documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'billing-documents'
  AND (storage.foldername(name))[1] = 'workspace'
  AND public.is_workspace_member(((storage.foldername(name))[2])::uuid)
);

DROP POLICY IF EXISTS "workspace_members_view_billing_documents" ON storage.objects;
CREATE POLICY "workspace_members_view_billing_documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'billing-documents'
  AND (storage.foldername(name))[1] = 'workspace'
  AND public.is_workspace_member(((storage.foldername(name))[2])::uuid)
);

DROP POLICY IF EXISTS "workspace_members_update_billing_documents" ON storage.objects;
CREATE POLICY "workspace_members_update_billing_documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'billing-documents'
  AND (storage.foldername(name))[1] = 'workspace'
  AND public.is_workspace_member(((storage.foldername(name))[2])::uuid)
)
WITH CHECK (
  bucket_id = 'billing-documents'
  AND (storage.foldername(name))[1] = 'workspace'
  AND public.is_workspace_member(((storage.foldername(name))[2])::uuid)
);

DROP POLICY IF EXISTS "workspace_members_delete_billing_documents" ON storage.objects;
CREATE POLICY "workspace_members_delete_billing_documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'billing-documents'
  AND (storage.foldername(name))[1] = 'workspace'
  AND public.is_workspace_member(((storage.foldername(name))[2])::uuid)
);
