/**
 * Golden payload fixtures for the Notion capture adapter.
 *
 * PROVENANCE: derived 2026-08-05 from the live Composio trigger payload
 * schemas (composio-trigger-schemas.json). Notion sends snake_case:
 * { event_id, event_type, workspace_id, workspace_name, timestamp,
 *   page_id, authors: [{ id, type }], data: { parent: { type, id } } }.
 * Authors are ID-only principals — no emails in the payload.
 */

/** NOTION_PAGE_CREATED payload. */
export const NOTION_TRIGGER_PAGE_CREATED = {
  event_id: "b7d2f6a0-1c3e-4f5a-9b8c-2d1e0f9a8b7c",
  event_type: "page.created",
  workspace_id: "a1b2c3d4-e5f6-7a8b-9c0d-e1f2a3b4c5d6",
  workspace_name: "Northwind Studio",
  timestamp: "2026-08-05T15:20:00.000Z",
  page_id: "f0e1d2c3-b4a5-6f7e-8d9c-0b1a2f3e4d5c",
  authors: [{ id: "0a1b2c3d-4e5f-6a7b-8c9d-0e1f2a3b4c5d", type: "person" }],
  data: {
    parent: {
      type: "database",
      id: "9f8e7d6c-5b4a-3f2e-1d0c-9b8a7f6e5d4c",
      data_source_id: "ds_1234567890",
    },
  },
};

/** NOTION_PAGE_CONTENT_UPDATED payload. */
export const NOTION_TRIGGER_PAGE_CONTENT_UPDATED = {
  event_id: "c8e3a7b1-2d4f-5a6b-0c9d-3e2f1a0b9c8d",
  event_type: "page.content_updated",
  workspace_id: "a1b2c3d4-e5f6-7a8b-9c0d-e1f2a3b4c5d6",
  workspace_name: "Northwind Studio",
  timestamp: "2026-08-05T17:05:33.000Z",
  page_id: "f0e1d2c3-b4a5-6f7e-8d9c-0b1a2f3e4d5c",
  authors: [{ id: "0a1b2c3d-4e5f-6a7b-8c9d-0e1f2a3b4c5d", type: "person" }],
  data: {
    parent: { type: "workspace" },
  },
};

/** No page_id — decline. */
export const NOTION_MALFORMED = {
  event_id: "d9f4b8c2-3e5a-6b7c-1d0e-4f3a2b1c0d9e",
  event_type: "page.created",
  timestamp: "2026-08-05T18:00:00.000Z",
};
