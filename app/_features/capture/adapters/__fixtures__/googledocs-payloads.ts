/**
 * Golden payload fixtures for the Google Docs capture adapter.
 *
 * PROVENANCE: derived 2026-08-05 from the live Composio trigger payload
 * schemas (see composio-trigger-schemas.json, pulled via
 * scripts/pull-composio-trigger-schemas.ts). The trigger wraps the Drive
 * file resource in a `document` envelope: { document: {...}, event_type }.
 */

/** GOOGLEDOCS_DOCUMENT_CREATED_TRIGGER — document wrapped in envelope. */
export const GOOGLEDOCS_TRIGGER_DOCUMENT_CREATED = {
  event_type: "document_created",
  document: {
    id: "1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789",
    name: "Q3 Campaign Brief",
    mimeType: "application/vnd.google-apps.document",
    createdTime: "2026-08-05T14:30:00.000Z",
    modifiedTime: "2026-08-05T14:30:00.000Z",
    webViewLink:
      "https://docs.google.com/document/d/1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789/edit",
    lastModifyingUser: {
      displayName: "Jane Founder",
      emailAddress: "jane@northwind.com",
    },
    owners: [{ displayName: "Jane Founder", emailAddress: "jane@northwind.com" }],
    shared: false,
    starred: false,
    trashed: false,
  },
};

/** GOOGLEDOCS_DOCUMENT_UPDATED_TRIGGER — same envelope, updated event. */
export const GOOGLEDOCS_TRIGGER_DOCUMENT_UPDATED = {
  event_type: "document_updated",
  document: {
    id: "1ZyXwVuTsRqPoNmLkJiHgFeDcBa9876543210",
    name: "Client Proposal — Harbor Co",
    mimeType: "application/vnd.google-apps.document",
    createdTime: "2026-07-30T09:00:00.000Z",
    modifiedTime: "2026-08-05T16:45:12.000Z",
    webViewLink:
      "https://docs.google.com/document/d/1ZyXwVuTsRqPoNmLkJiHgFeDcBa9876543210/edit",
    lastModifyingUser: {
      displayName: "Harbor Contact",
      emailAddress: "ops@harborco.com",
    },
  },
};

/** Legacy flat shape (pre-envelope) — must still parse. */
export const GOOGLEDOCS_FLAT_DOCUMENT = {
  id: "1FlatShapeDocId",
  title: "Flat-shape doc",
  modifiedTime: "2026-08-01T10:00:00.000Z",
};

/** No id anywhere — decline. */
export const GOOGLEDOCS_MALFORMED = {
  event_type: "document_created",
  document: { name: "Doc with no id" },
};
