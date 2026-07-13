import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildWatchingTools } from "./watching-tools";

vi.mock("@/app/_lib/learning/watches", () => ({
  registerEntityWatch: vi.fn().mockResolvedValue({
    success: true,
    watchId: "watch-123",
  }),
}));

describe("buildWatchingTools", () => {
  const workspaceId = "workspace-123";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("add_to_watching tool", () => {
    it("builds tool with correct description", () => {
      const tools = buildWatchingTools({ workspaceId });
      expect(tools.add_to_watching).toBeDefined();
      expect(tools.add_to_watching.description).toContain("Register a watch");
      expect(tools.add_to_watching.description).toContain("critical fields are missing");
    });

    it("registers watch for person with missing email", async () => {
      const { registerEntityWatch } = await import("@/app/_lib/learning/watches");
      const tools = buildWatchingTools({ workspaceId });
      const tool = tools.add_to_watching as unknown as {
        execute: (input: Record<string, unknown>) => Promise<unknown>;
      };

      const result = await tool.execute({
        entity_type: "person",
        entity_id: "person-abc-123",
        entity_name: "Jane Doe",
        missing_fields: ["email", "phone"],
        reason: "Email and phone not found during enrichment",
      });

      expect(registerEntityWatch).toHaveBeenCalledTimes(2);
      expect(result).toMatchObject({
        success: true,
        watchCount: 2,
        entityType: "person",
        entityId: "person-abc-123",
        fieldsWatched: ["email", "phone"],
      });
    });

    it("registers watch for org with missing domain", async () => {
      const { registerEntityWatch } = await import("@/app/_lib/learning/watches");
      const tools = buildWatchingTools({ workspaceId });
      const tool = tools.add_to_watching as unknown as {
        execute: (input: Record<string, unknown>) => Promise<unknown>;
      };

      const result = await tool.execute({
        entity_type: "organization",
        entity_id: "org-xyz-789",
        entity_name: "Acme Corp",
        missing_fields: ["domain", "billing_email"],
        reason: "Domain and billing email not found",
      });

      expect(registerEntityWatch).toHaveBeenCalledTimes(2);
      expect(result).toMatchObject({
        success: true,
        watchCount: 2,
        entityType: "organization",
      });
    });

    it("registers watch for work with missing deadline", async () => {
      const { registerEntityWatch } = await import("@/app/_lib/learning/watches");
      const tools = buildWatchingTools({ workspaceId });
      const tool = tools.add_to_watching as unknown as {
        execute: (input: Record<string, unknown>) => Promise<unknown>;
      };

      const result = await tool.execute({
        entity_type: "work",
        entity_id: "work-def-456",
        entity_name: "Website Project",
        missing_fields: ["deadline", "contract_value"],
        reason: "Timeline and budget not confirmed",
      });

      expect(registerEntityWatch).toHaveBeenCalledTimes(2);
      expect(result).toMatchObject({
        success: true,
        entityType: "work",
        fieldsWatched: ["deadline", "contract_value"],
      });
    });

    it("uses custom watch_for signals when provided", async () => {
      const { registerEntityWatch } = await import("@/app/_lib/learning/watches");
      const tools = buildWatchingTools({ workspaceId });
      const tool = tools.add_to_watching as unknown as {
        execute: (input: Record<string, unknown>) => Promise<unknown>;
      };

      await tool.execute({
        entity_type: "billing",
        entity_id: "billing-ghi-012",
        missing_fields: ["due_at"],
        watch_for: ["custom_billing_signal"],
        reason: "Due date not found on invoice",
      });

      expect(registerEntityWatch).toHaveBeenCalledWith(
        expect.objectContaining({
          watchForSignals: ["custom_billing_signal"],
        })
      );
    });

    it("returns message with entity name when provided", async () => {
      const tools = buildWatchingTools({ workspaceId });
      const tool = tools.add_to_watching as unknown as {
        execute: (input: Record<string, unknown>) => Promise<unknown>;
      };

      const result = (await tool.execute({
        entity_type: "person",
        entity_id: "person-abc-123",
        entity_name: "Jane Doe",
        missing_fields: ["phone"],
        reason: "Phone not in signature",
      })) as { message: string };

      expect(result.message).toContain("Jane Doe");
      expect(result.message).toContain("phone");
    });

    it("handles partial failures gracefully", async () => {
      const { registerEntityWatch } = await import("@/app/_lib/learning/watches");
      vi.mocked(registerEntityWatch)
        .mockResolvedValueOnce({ success: true, watchId: "watch-1" })
        .mockResolvedValueOnce({ success: false, error: "Database error" });

      const tools = buildWatchingTools({ workspaceId });
      const tool = tools.add_to_watching as unknown as {
        execute: (input: Record<string, unknown>) => Promise<unknown>;
      };

      const result = (await tool.execute({
        entity_type: "person",
        entity_id: "person-abc-123",
        missing_fields: ["email", "phone"],
        reason: "Testing partial failure",
      })) as { success: boolean; watchCount: number };

      expect(result.success).toBe(true);
      expect(result.watchCount).toBe(1);
    });
  });
});
