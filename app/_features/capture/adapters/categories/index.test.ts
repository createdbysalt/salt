import { describe, it, expect } from "vitest";
import { getCategoryAdapter, adapterForToolkitWithCategory, listCategoryAdapters } from "./index";

describe("category adapter registry", () => {
  describe("getCategoryAdapter", () => {
    it("returns email adapter for gmail", () => {
      const adapter = getCategoryAdapter("gmail");
      expect(adapter).not.toBeNull();
      expect(adapter?.sourceType).toBe("gmail");
    });

    it("returns email adapter for outlook", () => {
      const adapter = getCategoryAdapter("outlook");
      expect(adapter).not.toBeNull();
      expect(adapter?.sourceType).toBe("outlook");
    });

    it("returns calendar adapter for googlecalendar", () => {
      const adapter = getCategoryAdapter("googlecalendar");
      expect(adapter).not.toBeNull();
      expect(adapter?.sourceType).toBe("googlecalendar");
    });

    it("returns calendar adapter for cal", () => {
      const adapter = getCategoryAdapter("cal");
      expect(adapter).not.toBeNull();
      expect(adapter?.sourceType).toBe("cal");
    });

    it("returns billing adapter for stripe", () => {
      const adapter = getCategoryAdapter("stripe");
      expect(adapter).not.toBeNull();
      expect(adapter?.sourceType).toBe("stripe");
    });

    it("returns storage adapter for googledrive", () => {
      const adapter = getCategoryAdapter("googledrive");
      expect(adapter).not.toBeNull();
      expect(adapter?.sourceType).toBe("googledrive");
    });

    it("falls back to app-specific adapter for unknown category", () => {
      const adapter = getCategoryAdapter("googlecalendar");
      expect(adapter).not.toBeNull();
    });

    it("returns null for completely unknown provider", () => {
      const adapter = getCategoryAdapter("unknown_provider");
      expect(adapter).toBeNull();
    });
  });

  describe("adapterForToolkitWithCategory", () => {
    it("prefers category adapter over app-specific", () => {
      const adapter = adapterForToolkitWithCategory("gmail");
      expect(adapter).not.toBeNull();
      expect(adapter?.sourceType).toBe("gmail");
    });

    it("falls back to app-specific adapter", () => {
      const adapter = adapterForToolkitWithCategory("googlecalendar");
      expect(adapter).not.toBeNull();
    });
  });

  describe("listCategoryAdapters", () => {
    it("returns all implemented category adapters", () => {
      const adapters = listCategoryAdapters();

      expect(adapters.length).toBeGreaterThan(0);

      const categories = adapters.map(a => a.category);
      expect(categories).toContain("email");
      expect(categories).toContain("calendar");
      expect(categories).toContain("billing");
      expect(categories).toContain("storage");
    });

    it("lists providers for each category", () => {
      const adapters = listCategoryAdapters();

      const emailCategory = adapters.find(a => a.category === "email");
      expect(emailCategory?.providers).toContain("gmail");
      expect(emailCategory?.providers).toContain("outlook");

      const billingCategory = adapters.find(a => a.category === "billing");
      expect(billingCategory?.providers).toContain("stripe");
    });
  });
});
