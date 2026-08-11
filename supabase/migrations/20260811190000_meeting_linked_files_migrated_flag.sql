-- Flag meeting_sources linked_file rows that were migrated to resources
--
-- The 20260811180000 migration moved linked_file rows to resources +
-- entity_links but left the source rows for audit. Readers filter on this
-- flag so migrated rows don't render twice (once as a legacy linked-file
-- row, once as the Resource card from the attachment edge).

UPDATE meeting_sources ms
SET
  metadata = COALESCE(ms.metadata, '{}'::jsonb) || '{"migrated_to_resource": true}'::jsonb,
  updated_at = now()
WHERE ms.kind = 'linked_file'
  AND ms.source_url IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM resources r
    WHERE r.workspace_id = ms.workspace_id
      AND r.external_url = ms.source_url
      AND r.deleted_at IS NULL
  );
