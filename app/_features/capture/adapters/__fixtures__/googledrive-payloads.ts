/**
 * Golden payload fixtures for the Google Drive capture adapter.
 *
 * PROVENANCE: synthesized 2026-07-04 from the Google Drive API v3 file
 * resource (the per-item shape GOOGLEDRIVE_LIST_FILES returns and the shape
 * the legacy drive-ingestion service consumed) — not yet captured live.
 * Replace with a live row when the first drive backfill runs.
 */

/** Google Doc with owner + last modifier. */
export const DRIVE_FILE_DOC = {
  id: "1AbCdEfGhIjKlMnOpQrStUvWxYz012345",
  name: "Northwind proposal v3",
  mimeType: "application/vnd.google-apps.document",
  description: "Final proposal draft",
  createdTime: "2026-06-20T12:01:33.000Z",
  modifiedTime: "2026-07-01T09:14:02.000Z",
  webViewLink: "https://docs.google.com/document/d/1AbC/view",
  owners: [{ displayName: "You", emailAddress: "You@usesalt.io" }],
  lastModifyingUser: { displayName: "Ada Lovelace", emailAddress: "ada@northwind.com" },
  starred: true,
  shared: true,
};

/** PDF with a byte size, single owner. */
export const DRIVE_FILE_PDF = {
  id: "2BcDeFgHiJkLmNoPqRsTuVwXyZ123456",
  name: "Signed contract.pdf",
  mimeType: "application/pdf",
  createdTime: "2026-06-28T16:40:00.000Z",
  modifiedTime: "2026-06-28T16:40:00.000Z",
  webViewLink: "https://drive.google.com/file/d/2BcD/view",
  owners: [{ displayName: "You", emailAddress: "you@usesalt.io" }],
  size: "482113",
  shared: false,
};

/** Folder — a container, not a memory item; decline. */
export const DRIVE_FILE_FOLDER = {
  id: "3CdEfGhIjKlMnOpQrStUvWxYz1234567",
  name: "Client assets",
  mimeType: "application/vnd.google-apps.folder",
  createdTime: "2026-05-01T10:00:00.000Z",
  modifiedTime: "2026-06-30T10:00:00.000Z",
};

/** Trashed tombstone — decline. */
export const DRIVE_FILE_TRASHED = {
  id: "4DeFgHiJkLmNoPqRsTuVwXyZ12345678",
  name: "Old moodboard",
  mimeType: "image/png",
  trashed: true,
  modifiedTime: "2026-06-01T10:00:00.000Z",
};

/**
 * GOOGLEDRIVE_FILE_CREATED_TRIGGER payload — verified against the live
 * trigger schema 2026-07-04: { creator, event_type, file } with `file` being
 * a Drive API file object.
 */
export const DRIVE_TRIGGER_FILE_CREATED = {
  creator: { displayName: "You", emailAddress: "you@usesalt.io" },
  event_type: "file_created",
  file: {
    id: "5EfGhIjKlMnOpQrStUvWxYz123456789",
    name: "Moodboard July",
    mimeType: "application/vnd.google-apps.presentation",
    createdTime: "2026-07-03T18:05:11.000Z",
    modifiedTime: "2026-07-03T18:05:11.000Z",
    webViewLink: "https://docs.google.com/presentation/d/5EfG/view",
    owners: [{ displayName: "You", emailAddress: "you@usesalt.io" }],
    shared: false,
  },
};

/** Missing id — malformed, decline. */
export const DRIVE_FILE_NO_ID = {
  name: "Ghost file",
  mimeType: "application/pdf",
};
