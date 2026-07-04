import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createEntityNote,
  updateEntityNote,
  toggleEntityNotePin,
  archiveEntityNote,
} from "./entity-notes";

const mockSingle = vi.fn();
const mockGetUser = vi.fn();

function createMockChain(finalResult: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {};
  chain.select = vi.fn(() => chain);
  chain.insert = vi.fn(() => chain);
  chain.update = vi.fn(() => chain);
  chain.delete = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.is = vi.fn(() => chain);
  chain.single = vi.fn(() => Promise.resolve(finalResult));
  return chain;
}

let mockFromImpl: (table: string) => ReturnType<typeof createMockChain>;

vi.mock("@/app/_lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    from: (table: string) => mockFromImpl(table),
    auth: { getUser: mockGetUser },
  })),
}));

vi.mock("@/app/_lib/tenancy", () => ({
  getTenantContext: vi.fn(async () => ({
    context: { userId: "user-1", workspaceId: "ws-1" },
  })),
}));

vi.mock("@/app/_lib/tenancy/guards", () => ({
  requireWorkspaceMember: vi.fn((context: { workspaceId: string }) => ({
    id: context.workspaceId,
  })),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/app/_lib/notes", () => ({
  extractWikilinks: vi.fn(() => []),
}));

describe("entity-notes actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
  });

  describe("createEntityNote", () => {
    it("creates a note with correct entity scoping", async () => {
      const notesChain = createMockChain({ data: { id: "note-1" }, error: null });
      const relationsChain = createMockChain({ data: null, error: null });

      mockFromImpl = (table: string) => {
        if (table === "notes") return notesChain;
        return relationsChain;
      };

      const result = await createEntityNote({
        entityType: "person",
        entityId: "person-1",
        content: "Test note content",
      });

      expect(result.success).toBe(true);
      expect(result.noteId).toBe("note-1");
      expect(notesChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          workspace_id: "ws-1",
          entity_type: "person",
          entity_id: "person-1",
          content: "Test note content",
          author_type: "user",
          source: "manual",
          status: "confirmed",
        })
      );
    });

    it("returns error when user is not authenticated", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });
      mockFromImpl = () => createMockChain({ data: null, error: null });

      const result = await createEntityNote({
        entityType: "person",
        entityId: "person-1",
        content: "Test note content",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Not authenticated");
    });

    it("returns error when insert fails", async () => {
      const notesChain = createMockChain({ data: null, error: { message: "Insert failed" } });
      mockFromImpl = () => notesChain;

      const result = await createEntityNote({
        entityType: "organization",
        entityId: "org-1",
        content: "Test content",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Insert failed");
    });
  });

  describe("updateEntityNote", () => {
    it("updates note content", async () => {
      let callCount = 0;
      mockFromImpl = (table: string) => {
        if (table === "notes") {
          callCount++;
          if (callCount === 1) {
            return createMockChain({
              data: { entity_type: "person", entity_id: "person-1" },
              error: null,
            });
          }
          return createMockChain({ data: null, error: null });
        }
        return createMockChain({ data: null, error: null });
      };

      const result = await updateEntityNote({
        noteId: "note-1",
        content: "Updated content",
      });

      expect(result.success).toBe(true);
    });

    it("returns error when note not found", async () => {
      mockFromImpl = () =>
        createMockChain({ data: null, error: { message: "Not found" } });

      const result = await updateEntityNote({
        noteId: "nonexistent",
        content: "Updated content",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Note not found");
    });
  });

  describe("toggleEntityNotePin", () => {
    it("toggles pin state", async () => {
      let callCount = 0;
      mockFromImpl = () => {
        callCount++;
        if (callCount === 1) {
          return createMockChain({
            data: { entity_type: "work", entity_id: "work-1" },
            error: null,
          });
        }
        return createMockChain({ data: null, error: null });
      };

      const result = await toggleEntityNotePin({
        noteId: "note-1",
        isPinned: true,
      });

      expect(result.success).toBe(true);
    });
  });

  describe("archiveEntityNote", () => {
    it("soft deletes note and cleans up relations", async () => {
      let callCount = 0;
      mockFromImpl = (table: string) => {
        if (table === "notes") {
          callCount++;
          if (callCount === 1) {
            return createMockChain({
              data: { entity_type: "person", entity_id: "person-1" },
              error: null,
            });
          }
          return createMockChain({ data: null, error: null });
        }
        return createMockChain({ data: null, error: null });
      };

      const result = await archiveEntityNote({ noteId: "note-1" });

      expect(result.success).toBe(true);
    });
  });
});
