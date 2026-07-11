import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/app/_lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/app/_features/memory/actions/create-salt-note", () => ({
  createSaltNote: vi.fn(),
}));

vi.mock("@/app/_lib/composio/execution-log", () => ({
  logToolExecution: vi.fn(),
}));

import { buildMemoryTools } from "./memory-tools";
import { createClient } from "@/app/_lib/supabase/server";
import { createSaltNote } from "@/app/_features/memory/actions/create-salt-note";

const mockToolOptions = { toolCallId: "test-call", abortSignal: new AbortController().signal, messages: [] };

describe("buildMemoryTools", () => {
  const mockWorkspaceId = "ws-123";
  const mockUserId = "user-456";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("remember_about_entity", () => {
    it("saves a note when entity is found", async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: "person-789", display_name: "Jane Doe" },
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as never);
      vi.mocked(createSaltNote).mockResolvedValue({
        success: true,
        noteId: "note-123",
        status: "confirmed",
      });

      const tools = buildMemoryTools({
        workspaceId: mockWorkspaceId,
        userId: mockUserId,
      });

      const result = await tools.remember_about_entity.execute!(
        {
          note: "Prefers morning meetings before 10am",
          entityType: "person",
          entityName: "Jane",
        },
        mockToolOptions
      );

      expect(result.saved).toBe(true);
      expect(result.entityName).toBe("Jane Doe");
      expect(result.noteKind).toBe("preference");
      expect(createSaltNote).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: "person",
          entityId: "person-789",
          content: "Prefers morning meetings before 10am",
          noteKind: "preference",
          source: "ask_salt",
          confidence: 100,
        })
      );
    });

    it("returns error when entity not found", async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

      const tools = buildMemoryTools({
        workspaceId: mockWorkspaceId,
        userId: mockUserId,
      });

      const result = await tools.remember_about_entity.execute!(
        {
          note: "Has two kids",
          entityType: "person",
          entityName: "Unknown Person",
        },
        mockToolOptions
      );

      expect(result.saved).toBe(false);
      expect(result.message).toContain("Couldn't find");
      expect(createSaltNote).not.toHaveBeenCalled();
    });

    it("infers note kind from content", async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: "org-123", name: "Acme Corp" },
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as never);
      vi.mocked(createSaltNote).mockResolvedValue({
        success: true,
        noteId: "note-456",
        status: "confirmed",
      });

      const tools = buildMemoryTools({
        workspaceId: mockWorkspaceId,
        userId: mockUserId,
      });

      const result = await tools.remember_about_entity.execute!(
        {
          note: "Was referred by Sarah Johnson at the conference",
          entityType: "organization",
          entityName: "Acme",
        },
        mockToolOptions
      );

      expect(result.saved).toBe(true);
      expect(result.noteKind).toBe("relationship");
    });

    it("uses explicit noteKind when provided", async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: "work-123", name: "Website Redesign" },
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as never);
      vi.mocked(createSaltNote).mockResolvedValue({
        success: true,
        noteId: "note-789",
        status: "confirmed",
      });

      const tools = buildMemoryTools({
        workspaceId: mockWorkspaceId,
        userId: mockUserId,
      });

      const result = await tools.remember_about_entity.execute!(
        {
          note: "Project is blocked on design assets",
          entityType: "work",
          entityName: "Website",
          noteKind: "flag",
        },
        mockToolOptions
      );

      expect(result.saved).toBe(true);
      expect(result.noteKind).toBe("flag");
      expect(createSaltNote).toHaveBeenCalledWith(
        expect.objectContaining({ noteKind: "flag" })
      );
    });
  });
});
