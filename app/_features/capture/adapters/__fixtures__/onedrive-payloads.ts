/**
 * Golden payload fixtures for the OneDrive capture adapter.
 *
 * PROVENANCE: synthesized 2026-08-01 from the Microsoft Graph driveItem
 * resource shape (the per-item form the OneDrive backfill consumes) — not
 * yet captured live. Replace with a live row when the first OneDrive
 * backfill runs against a real drive.
 */

/** Graph driveItem (backfill). */
export const ONEDRIVE_DRIVE_ITEM = {
  id: "01BYE5RZ6QN3ZWBTUFOFD3GSPGOHDJD36K",
  name: "brief.pdf",
  size: 204800,
  webUrl: "https://contoso-my.sharepoint.com/personal/me/brief.pdf",
  lastModifiedDateTime: "2026-08-01T12:00:00Z",
  parentReference: { path: "/drive/root:/Clients/Acme" },
  file: { mimeType: "application/pdf" },
  lastModifiedBy: { user: { email: "anna@contoso.com", displayName: "Anna" } },
};
