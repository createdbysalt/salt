/**
 * Golden payload fixtures for the Google Sheets capture adapter.
 *
 * PROVENANCE: derived 2026-08-05 from the live Composio trigger payload
 * schemas (composio-trigger-schemas.json). The trigger wraps the resource
 * in a `spreadsheet` envelope: { spreadsheet: {...}, event_type }.
 */

/** GOOGLESHEETS_NEW_SPREADSHEET_CREATED_TRIGGER payload. */
export const GOOGLESHEETS_TRIGGER_SPREADSHEET_CREATED = {
  event_type: "spreadsheet_created",
  spreadsheet: {
    id: "1SpReAdShEeTiD0123456789AbCdEfGhIjKlMn",
    name: "2026 Revenue Tracker",
    mimeType: "application/vnd.google-apps.spreadsheet",
    createdTime: "2026-08-05T11:15:00.000Z",
    modifiedTime: "2026-08-05T11:15:00.000Z",
    webViewLink:
      "https://docs.google.com/spreadsheets/d/1SpReAdShEeTiD0123456789AbCdEfGhIjKlMn/edit",
    lastModifyingUser: {
      displayName: "Jane Founder",
      emailAddress: "jane@northwind.com",
    },
    owners: [{ displayName: "Jane Founder", emailAddress: "jane@northwind.com" }],
  },
};

/** No id — decline. */
export const GOOGLESHEETS_MALFORMED = {
  event_type: "spreadsheet_created",
  spreadsheet: { name: "Sheet with no id" },
};
