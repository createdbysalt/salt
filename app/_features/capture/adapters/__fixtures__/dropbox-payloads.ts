/**
 * Golden payload fixtures for the Dropbox capture adapter.
 *
 * PROVENANCE: synthesized 2026-08-01 from the Dropbox API file metadata
 * shape (the per-entry form DROPBOX_LIST_FILES_IN_FOLDER returns) — not
 * yet captured live. Replace with a live row when the first Dropbox
 * backfill runs against a real account.
 */

/** File entry from a folder listing (backfill). */
export const DROPBOX_FILE_ENTRY = {
  id: "id:a4ayc_80_OEAAAAAAAAAYa",
  name: "report.pdf",
  path_display: "/Documents/report.pdf",
  ".tag": "file",
  size: 1024000,
  client_modified: "2026-08-01T09:00:00Z",
  preview_url: "https://www.dropbox.com/preview/Documents/report.pdf",
  sharing_info: { modified_by: "editor@example.com" },
};
