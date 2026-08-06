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
