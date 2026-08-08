import { describe, it, expect, vi } from "vitest";
import { adapterForToolkit, adapterForTriggerSlug, listCaptureAdapters } from "./registry";

// Category lookups are DB-backed in prod; tests pin them to the frozen
// fallback snapshot so the suite stays hermetic.
vi.mock("@/app/_lib/composio/capture-categories", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/app/_lib/composio/capture-categories")>();
  return {
    ...actual,
    getCaptureCategory: async (provider: string) =>
      actual.FALLBACK_PROVIDER_CATEGORIES[provider.toLowerCase()] ?? null,
  };
});

describe("capture adapter registry", () => {
  describe("adapterForToolkit", () => {
    it("returns adapter for gmail via category", async () => {
      const adapter = await adapterForToolkit("gmail");
      expect(adapter).not.toBeNull();
      expect(adapter?.sourceType).toBe("gmail");
    });

    it("returns adapter for outlook via category", async () => {
      const adapter = await adapterForToolkit("outlook");
      expect(adapter).not.toBeNull();
      expect(adapter?.sourceType).toBe("outlook");
    });

    it("returns adapter for stripe via category", async () => {
      const adapter = await adapterForToolkit("stripe");
      expect(adapter).not.toBeNull();
      expect(adapter?.sourceType).toBe("stripe");
    });

    it("returns adapter for googlecalendar via category", async () => {
      const adapter = await adapterForToolkit("googlecalendar");
      expect(adapter).not.toBeNull();
      expect(adapter?.sourceType).toBe("googlecalendar");
    });

    it("returns adapter for googledrive via category", async () => {
      const adapter = await adapterForToolkit("googledrive");
      expect(adapter).not.toBeNull();
      expect(adapter?.sourceType).toBe("googledrive");
    });

    it("returns null for unknown toolkit", async () => {
      const adapter = await adapterForToolkit("unknown_toolkit");
      expect(adapter).toBeNull();
    });
  });

  describe("adapterForTriggerSlug", () => {
    it("returns adapter for GMAIL_NEW_GMAIL_MESSAGE", () => {
      const adapter = adapterForTriggerSlug("GMAIL_NEW_GMAIL_MESSAGE");
      expect(adapter).not.toBeNull();
      expect(adapter?.toolkit).toBe("gmail");
    });

    it("returns adapter for Google Calendar trigger", () => {
      const adapter = adapterForTriggerSlug("GOOGLECALENDAR_GOOGLE_CALENDAR_EVENT_CREATED_TRIGGER");
      expect(adapter).not.toBeNull();
      expect(adapter?.toolkit).toBe("googlecalendar");
    });

    it("returns null for unknown trigger slug", () => {
      const adapter = adapterForTriggerSlug("UNKNOWN_TRIGGER");
      expect(adapter).toBeNull();
    });
  });

  describe("listCaptureAdapters", () => {
    it("returns all category adapters", () => {
      const adapters = listCaptureAdapters();

      expect(adapters.length).toBeGreaterThan(0);

      const toolkits = adapters.map(a => a.toolkit);
      expect(toolkits).toContain("gmail");
      expect(toolkits).toContain("googlecalendar");
      expect(toolkits).toContain("googledrive");
      expect(toolkits).toContain("stripe");
      expect(toolkits).toContain("cal");
    });
  });
});
