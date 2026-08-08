import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildWatchingTools } from "./watching-tools";

vi.mock("@/app/_features/capture/services/watch-expressions", () => ({
  registerWatchExpressions: vi.fn().mockResolvedValue({ registered: 1, skipped: 0 }),
}));

describe("buildWatchingTools", () => {
  const workspaceId = "workspace-123";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("add_to_watching tool", () => {
    it("builds tool with a description", () => {
      const tools = buildWatchingTools({ workspaceId });
      expect(tools.add_to_watching).toBeDefined();
      expect(tools.add_to_watching.description).toContain("re-enrichment");
    });

    it("registers identifier watches for a person", async () => {
      const { registerWatchExpressions } = await import(
        "@/app/_features/capture/services/watch-expressions"
      );
      const tools = buildWatchingTools({ workspaceId });
      const tool = tools.add_to_watching as unknown as {
        execute: (input: Record<string, unknown>) => Promise<unknown>;
      };

      const result = await tool.execute({
        entity_type: "person",
        entity_id: "00000000-0000-0000-0000-0000000000ab",
        entity_name: "Jane Doe",
        emails: ["jane@acme.com"],
        missing_fields: ["phone"],
        reason: "Phone not found during enrichment",
      });

      expect(registerWatchExpressions).toHaveBeenCalledWith(
        expect.objectContaining({
          workspaceId,
          targetSurface: "people",
          targetEntityId: "00000000-0000-0000-0000-0000000000ab",
          emails: ["jane@acme.com"],
        })
      );
      expect(result).toMatchObject({
        success: true,
        watchCount: 1,
        entityType: "person",
        fieldsWatched: ["phone"],
      });
    });

    it("maps organizations to the organizations surface", async () => {
      const { registerWatchExpressions } = await import(
        "@/app/_features/capture/services/watch-expressions"
      );
      const tools = buildWatchingTools({ workspaceId });
      const tool = tools.add_to_watching as unknown as {
        execute: (input: Record<string, unknown>) => Promise<unknown>;
      };

      await tool.execute({
        entity_type: "organization",
        entity_id: "00000000-0000-0000-0000-0000000000cd",
        entity_name: "Acme Corp",
        domains: ["acme.com"],
        missing_fields: ["billing_email"],
        reason: "Billing email not found",
      });

      expect(registerWatchExpressions).toHaveBeenCalledWith(
        expect.objectContaining({
          targetSurface: "organizations",
          domains: ["acme.com"],
        })
      );
    });

    it("refuses to watch an entity with no known identifier", async () => {
      const { registerWatchExpressions } = await import(
        "@/app/_features/capture/services/watch-expressions"
      );
      const tools = buildWatchingTools({ workspaceId });
      const tool = tools.add_to_watching as unknown as {
        execute: (input: Record<string, unknown>) => Promise<unknown>;
      };

      const result = (await tool.execute({
        entity_type: "person",
        entity_id: "00000000-0000-0000-0000-0000000000ef",
        entity_name: "Mystery Person",
        missing_fields: ["email"],
        reason: "Nothing known yet",
      })) as { success: boolean; message: string };

      expect(result.success).toBe(false);
      expect(result.message).toContain("Mystery Person");
      expect(registerWatchExpressions).not.toHaveBeenCalled();
    });

    it("reports failure when no expressions could be registered", async () => {
      const { registerWatchExpressions } = await import(
        "@/app/_features/capture/services/watch-expressions"
      );
      vi.mocked(registerWatchExpressions).mockResolvedValueOnce({
        registered: 0,
        skipped: 1,
      });

      const tools = buildWatchingTools({ workspaceId });
      const tool = tools.add_to_watching as unknown as {
        execute: (input: Record<string, unknown>) => Promise<unknown>;
      };

      const result = (await tool.execute({
        entity_type: "person",
        entity_id: "00000000-0000-0000-0000-0000000000ab",
        entity_name: "Jane Doe",
        emails: ["not-an-email"],
        missing_fields: ["phone"],
        reason: "Bad identifier",
      })) as { success: boolean };

      expect(result.success).toBe(false);
    });
  });
});
