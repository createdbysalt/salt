-- Artifact-first meetings: meeting_sources kind='linked_file' → resources + entity_links
--
-- User-linked URLs on meetings (notes docs, recordings) are artifacts: they
-- belong in resources with an attachment edge, not in meeting_sources (which
-- stays for sync provenance — provider + external_id). This migration moves
-- existing linked_file rows across, idempotently:
--   1. One link Resource per (workspace, source_url), deduped against
--      existing resources rows.
--   2. One attachment edge per (resource, meeting), deduped against any
--      existing edge between the two.
-- The meeting_sources rows are left in place for one release of read-compat;
-- a later migration drops the linked_file kind.

WITH moved AS (
  INSERT INTO resources (
    workspace_id,
    file_name,
    file_type,
    external_url,
    mode,
    source,
    created_by_system,
    uploaded_by,
    created_at,
    updated_at
  )
  SELECT
    ms.workspace_id,
    COALESCE(NULLIF(ms.display_name, ''), split_part(ms.source_url, '/', -1), 'Linked file'),
    'link',
    ms.source_url,
    'static',
    'manual',
    false,
    NULL,
    ms.created_at,
    ms.updated_at
  FROM meeting_sources ms
  WHERE ms.kind = 'linked_file'
    AND ms.source_url IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM resources r
      WHERE r.workspace_id = ms.workspace_id
        AND r.external_url = ms.source_url
        AND r.deleted_at IS NULL
    )
  RETURNING id, workspace_id, external_url
)
INSERT INTO entity_links (
  workspace_id,
  source_type,
  source_id,
  target_type,
  target_id,
  relation_type,
  source,
  because,
  created_at
)
SELECT
  ms.workspace_id,
  'resource',
  r.id,
  'meeting',
  ms.meeting_id,
  'attachment',
  'manual',
  'Migrated from meeting_sources linked_file',
  ms.created_at
FROM meeting_sources ms
JOIN resources r
  ON r.workspace_id = ms.workspace_id
 AND r.external_url = ms.source_url
 AND r.deleted_at IS NULL
WHERE ms.kind = 'linked_file'
  AND ms.source_url IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM entity_links el
    WHERE el.workspace_id = ms.workspace_id
      AND el.source_type = 'resource'
      AND el.source_id = r.id
      AND el.target_type = 'meeting'
      AND el.target_id = ms.meeting_id
  );

COMMENT ON TABLE meeting_sources IS 'Sync provenance for meeting intelligence providers (provider + external_id). User-linked URLs live in resources + entity_links since 20260811180000; kind=linked_file rows are read-compat only.';
