import { describe, it, expect } from "vitest";
import { createStorageCategoryAdapter, getStorageAdapter } from "./storage";
import { DRIVE_TRIGGER_FILE_CREATED } from "../__fixtures__/googledrive-payloads";

describe("storage category adapter", () => {
  describe("getStorageAdapter", () => {
    it("returns adapter for googledrive", () => {
      const adapter = getStorageAdapter("googledrive");
      expect(adapter).not.toBeNull();
      expect(adapter?.sourceType).toBe("googledrive");
    });

    it("returns adapter for dropbox", () => {
      const adapter = getStorageAdapter("dropbox");
      expect(adapter).not.toBeNull();
      expect(adapter?.sourceType).toBe("dropbox");
    });

    it("returns adapter with generic extraction for unknown provider", () => {
      const adapter = getStorageAdapter("unknown");
      expect(adapter).not.toBeNull();
      expect(adapter.sourceType).toBe("unknown");
    });

    it("returns adapter with generic extraction for non-storage provider", () => {
      const adapter = getStorageAdapter("gmail");
      expect(adapter).not.toBeNull();
      expect(adapter.sourceType).toBe("gmail");
    });
  });

  describe("googledrive normalization", () => {
    const adapter = createStorageCategoryAdapter("googledrive");

    it("normalizes google drive file payload", () => {
      const payload = {
        id: "file-123",
        name: "Project Proposal.docx",
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        owners: [
          { emailAddress: "owner@example.com", displayName: "Owner" },
        ],
        sharingUser: {
          emailAddress: "sharer@example.com",
          displayName: "Sharer",
        },
        modifiedTime: "2024-07-12T10:00:00Z",
        webViewLink: "https://docs.google.com/document/d/file-123",
        parents: ["folder-456"],
        size: "482133",
      };

      const envelope = adapter.normalize(payload);

      expect(envelope).not.toBeNull();
      expect(envelope?.sourceType).toBe("googledrive");
      expect(envelope?.captureType).toBe("file");
      expect(envelope?.externalId).toBe("file-123");
      expect(envelope?.title).toBe("Project Proposal.docx");
      expect(envelope?.occurredAt).toBe("2024-07-12T10:00:00Z");
      expect(envelope?.participants).toHaveLength(2);
      expect(envelope?.participants[0].email).toBe("owner@example.com");
      expect(envelope?.participants[0].role).toBe("other");
      expect(envelope?.participants[1].email).toBe("sharer@example.com");
      expect(envelope?.participants[1].role).toBe("from");
      expect(envelope?.extracted.is_folder).toBe(false);
      expect(envelope?.threadId).toBe("folder-456");
      // Detail contract: who changed it (sharer wins) + size from string bytes.
      expect(envelope?.extracted.owner_email).toBe("sharer@example.com");
      expect(envelope?.extracted.owner_name).toBe("Sharer");
      expect(envelope?.extracted.file_size).toBe(482133);
      expect(envelope?.extracted.deep_link).toBe(
        "https://docs.google.com/document/d/file-123"
      );
    });

    it("falls back to the first owner when no sharer is present", () => {
      const envelope = adapter.normalize({
        id: "file-owned",
        name: "notes.txt",
        owners: [{ emailAddress: "Owner@Example.com", displayName: "Owner" }],
      });
      expect(envelope?.extracted.owner_email).toBe("owner@example.com");
      expect(envelope?.extracted.owner_name).toBe("Owner");
    });

    it("identifies folders", () => {
      const payload = {
        id: "folder-789",
        name: "Project Files",
        mimeType: "application/vnd.google-apps.folder",
        modifiedTime: "2024-07-12T10:00:00Z",
      };

      const envelope = adapter.normalize(payload);

      expect(envelope).not.toBeNull();
      expect(envelope?.extracted.is_folder).toBe(true);
    });

    it("returns null for invalid payload", () => {
      expect(adapter.normalize(null)).toBeNull();
      expect(adapter.normalize({})).toBeNull();
    });

    it("unwraps the trigger file envelope ({ creator, event_type, file })", () => {
      // Verified against the live GOOGLEDRIVE_FILE_CREATED_TRIGGER schema.
      const envelope = adapter.normalize(DRIVE_TRIGGER_FILE_CREATED);

      expect(envelope).not.toBeNull();
      expect(envelope?.externalId).toBe("5EfGhIjKlMnOpQrStUvWxYz123456789");
      expect(envelope?.title).toBe("Moodboard July");
      expect(envelope?.occurredAt).toBe("2026-07-03T18:05:11.000Z");
      // creator and owners share the same email — deduped.
      expect(envelope?.participants).toHaveLength(1);
      expect(envelope?.participants[0].email).toBe("you@usesalt.io");
    });
  });

  describe("dropbox normalization", () => {
    const adapter = createStorageCategoryAdapter("dropbox");

    it("normalizes dropbox file payload", () => {
      const payload = {
        id: "id:abc123",
        name: "report.pdf",
        path_display: "/Documents/report.pdf",
        path_lower: "/documents/report.pdf",
        ".tag": "file",
        size: 1024000,
        server_modified: "2024-07-12T10:00:00Z",
        sharing_info: {
          modified_by: "editor@example.com",
        },
      };

      const envelope = adapter.normalize(payload);

      expect(envelope).not.toBeNull();
      expect(envelope?.sourceType).toBe("dropbox");
      expect(envelope?.captureType).toBe("file");
      expect(envelope?.externalId).toBe("id:abc123");
      expect(envelope?.title).toBe("report.pdf");
      expect(envelope?.occurredAt).toBe("2024-07-12T10:00:00Z");
      expect(envelope?.extracted.path).toBe("/Documents/report.pdf");
      expect(envelope?.extracted.is_folder).toBe(false);
      expect(envelope?.extracted.size).toBe(1024000);
      expect(envelope?.participants).toHaveLength(1);
      expect(envelope?.participants[0].email).toBe("editor@example.com");
      // Detail contract fields
      expect(envelope?.extracted.folder_path).toBe("/Documents");
      expect(envelope?.extracted.file_size).toBe(1024000);
      expect(envelope?.extracted.owner_email).toBe("editor@example.com");
    });

    it("uses root for files at the top level", () => {
      const envelope = adapter.normalize({
        id: "id:root-file",
        name: "top.pdf",
        path_display: "/top.pdf",
        ".tag": "file",
      });
      expect(envelope?.extracted.folder_path).toBe("/");
    });

    it("identifies folders", () => {
      const payload = {
        id: "id:folder123",
        name: "My Folder",
        path_lower: "/my folder",
        ".tag": "folder",
      };

      const envelope = adapter.normalize(payload);

      expect(envelope).not.toBeNull();
      expect(envelope?.extracted.is_folder).toBe(true);
    });

    it("returns null for invalid payload", () => {
      expect(adapter.normalize(null)).toBeNull();
      expect(adapter.normalize({})).toBeNull();
    });
  });

  describe("onedrive normalization (Graph driveItem)", () => {
    const adapter = createStorageCategoryAdapter("onedrive");

    it("normalizes a driveItem with path, size, and modifier", () => {
      const envelope = adapter.normalize({
        id: "01BYE5RZ6QN3ZWBTUFOFD3GSPGOHDJD36K",
        name: "brief.pdf",
        size: 204800,
        webUrl: "https://contoso-my.sharepoint.com/personal/me/Documents/brief.pdf",
        lastModifiedDateTime: "2026-08-01T12:00:00Z",
        parentReference: {
          id: "01BYE5RZ56Y2GOVW7725BZO354PWSELRRZ",
          path: "/drive/root:/Clients/Acme",
        },
        file: { mimeType: "application/pdf" },
        lastModifiedBy: {
          user: { email: "Anna@Contoso.com", displayName: "Anna" },
        },
      });

      expect(envelope).not.toBeNull();
      expect(envelope?.sourceType).toBe("onedrive");
      expect(envelope?.captureType).toBe("file");
      expect(envelope?.externalId).toBe("01BYE5RZ6QN3ZWBTUFOFD3GSPGOHDJD36K");
      expect(envelope?.title).toBe("brief.pdf");
      expect(envelope?.extracted.file_name).toBe("brief.pdf");
      expect(envelope?.extracted.folder_path).toBe("/Clients/Acme");
      expect(envelope?.extracted.owner_email).toBe("anna@contoso.com");
      expect(envelope?.extracted.owner_name).toBe("Anna");
      expect(envelope?.extracted.mime_type).toBe("application/pdf");
      expect(envelope?.extracted.file_size).toBe(204800);
      expect(envelope?.extracted.is_folder).toBe(false);
      expect(envelope?.extracted.deep_link).toBe(
        "https://contoso-my.sharepoint.com/personal/me/Documents/brief.pdf"
      );
      expect(envelope?.participants).toHaveLength(1);
      expect(envelope?.participants[0].email).toBe("anna@contoso.com");
    });

    it("identifies folders and root-level paths", () => {
      const envelope = adapter.normalize({
        id: "folder-1",
        name: "Clients",
        folder: { childCount: 4 },
        parentReference: { path: "/drive/root:" },
      });
      expect(envelope?.extracted.is_folder).toBe(true);
      expect(envelope?.extracted.folder_path).toBe("/");
    });

    it("returns null for invalid payload", () => {
      expect(adapter.normalize(null)).toBeNull();
      expect(adapter.normalize({})).toBeNull();
    });
  });

  describe("deriveSignals", () => {
    const adapter = createStorageCategoryAdapter("googledrive");

    it("tracks file sharing participants", () => {
      const envelopes = [
        {
          sourceType: "googledrive" as const,
          captureType: "file" as const,
          externalId: "1",
          title: "Shared file",
          occurredAt: "2024-07-12T10:00:00Z",
          participants: [
            { email: "sharer@example.com", name: "Sharer", role: "from" as const },
          ],
          threadId: null,
          extracted: {},
          raw: {},
          noise: null,
        },
      ];

      const signals = adapter.deriveSignals!(envelopes, { userEmail: "me@test.com" });

      expect(signals.has("sharer@example.com")).toBe(true);
    });

    it("excludes self from signals", () => {
      const envelopes = [
        {
          sourceType: "googledrive" as const,
          captureType: "file" as const,
          externalId: "1",
          title: "My file",
          occurredAt: "2024-07-12T10:00:00Z",
          participants: [
            { email: "me@test.com", name: "Me", role: "other" as const },
          ],
          threadId: null,
          extracted: {},
          raw: {},
          noise: null,
        },
      ];

      const signals = adapter.deriveSignals!(envelopes, { userEmail: "me@test.com" });
      expect(signals.has("me@test.com")).toBe(false);
    });
  });
});
