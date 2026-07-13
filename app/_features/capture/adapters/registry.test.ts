import { describe, it, expect } from "vitest";
import { adapterForToolkit, adapterForTriggerSlug, listCaptureAdapters } from "./registry";

describe("capture adapter registry", () => {
  describe("adapterForToolkit", () => {
    it("returns adapter for gmail via category", () => {
      const adapter = adapterForToolkit("gmail");
      expect(adapter).not.toBeNull();
      expect(adapter?.sourceType).toBe("gmail");
    });

    it("returns adapter for outlook via category", () => {
      const adapter = adapterForToolkit("outlook");
      expect(adapter).not.toBeNull();
      expect(adapter?.sourceType).toBe("outlook");
    });

    it("returns adapter for stripe via category", () => {
      const adapter = adapterForToolkit("stripe");
      expect(adapter).not.toBeNull();
      expect(adapter?.sourceType).toBe("stripe");
    });

    it("returns adapter for googlecalendar via category", () => {
      const adapter = adapterForToolkit("googlecalendar");
      expect(adapter).not.toBeNull();
      expect(adapter?.sourceType).toBe("googlecalendar");
    });

    it("returns adapter for googledrive via category", () => {
      const adapter = adapterForToolkit("googledrive");
      expect(adapter).not.toBeNull();
      expect(adapter?.sourceType).toBe("googledrive");
    });

    it("returns null for unknown toolkit", () => {
      const adapter = adapterForToolkit("unknown_toolkit");
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
    it("returns all app-specific adapters", () => {
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
