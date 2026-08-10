import { describe, it, expect, vi } from "vitest";
import { getCategoryAdapter, adapterForToolkitWithCategory, listCategoryAdapters, getAdapterForCategory } from "./index";
import { getEmailAdapter } from "./email";
import { getCalendarAdapter } from "./calendar";
import { getBillingAdapter } from "./billing";

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

describe("category adapter registry", () => {
  describe("getCategoryAdapter", () => {
    it("returns email adapter for gmail", async () => {
      const adapter = await getCategoryAdapter("gmail");
      expect(adapter).not.toBeNull();
      expect(adapter?.sourceType).toBe("gmail");
    });

    it("returns email adapter for outlook", async () => {
      const adapter = await getCategoryAdapter("outlook");
      expect(adapter).not.toBeNull();
      expect(adapter?.sourceType).toBe("outlook");
    });

    it("returns calendar adapter for googlecalendar", async () => {
      const adapter = await getCategoryAdapter("googlecalendar");
      expect(adapter).not.toBeNull();
      expect(adapter?.sourceType).toBe("googlecalendar");
    });

    it("returns calendar adapter for cal", async () => {
      const adapter = await getCategoryAdapter("cal");
      expect(adapter).not.toBeNull();
      // Toolkit key 'cal' resolves the adapter; captures are typed 'calcom'.
      expect(adapter?.sourceType).toBe("calcom");
    });

    it("returns billing adapter for stripe", async () => {
      const adapter = await getCategoryAdapter("stripe");
      expect(adapter).not.toBeNull();
      expect(adapter?.sourceType).toBe("stripe");
    });

    it("returns storage adapter for googledrive", async () => {
      const adapter = await getCategoryAdapter("googledrive");
      expect(adapter).not.toBeNull();
      expect(adapter?.sourceType).toBe("googledrive");
    });

    it("returns null for completely unknown provider", async () => {
      const adapter = await getCategoryAdapter("unknown_provider");
      expect(adapter).toBeNull();
    });
  });

  describe("adapterForToolkitWithCategory", () => {
    it("resolves gmail to the email category adapter", async () => {
      const adapter = await adapterForToolkitWithCategory("gmail");
      expect(adapter).not.toBeNull();
      expect(adapter?.sourceType).toBe("gmail");
    });

    it("resolves googlecalendar to the calendar category adapter", async () => {
      const adapter = await adapterForToolkitWithCategory("googlecalendar");
      expect(adapter).not.toBeNull();
      expect(adapter?.sourceType).toBe("googlecalendar");
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

  describe("generalized category adapters (Phase 4)", () => {
    it("email adapter accepts unknown provider and returns generic adapter", () => {
      const adapter = getEmailAdapter("protonmail");
      expect(adapter).not.toBeNull();
      expect(adapter.sourceType).toBe("protonmail");
      expect(adapter.toolkit).toBe("protonmail");
      expect(typeof adapter.normalize).toBe("function");
    });

    it("calendar adapter accepts unknown provider and returns generic adapter", () => {
      const adapter = getCalendarAdapter("apple_calendar");
      expect(adapter).not.toBeNull();
      expect(adapter.sourceType).toBe("apple_calendar");
      expect(adapter.toolkit).toBe("apple_calendar");
    });

    it("billing adapter accepts unknown provider and returns generic adapter", () => {
      const adapter = getBillingAdapter("wave");
      expect(adapter).not.toBeNull();
      expect(adapter.sourceType).toBe("wave");
      expect(adapter.toolkit).toBe("wave");
    });

    it("getAdapterForCategory works with any provider in category", () => {
      const adapter = getAdapterForCategory("email", "fastmail");
      expect(adapter).not.toBeNull();
      expect(adapter.sourceType).toBe("fastmail");
    });

    it("generic adapter can normalize a basic payload", () => {
      const adapter = getEmailAdapter("protonmail");
      const envelope = adapter.normalize({
        id: "msg-123",
        subject: "Test email",
        from: "sender@example.com",
      });

      expect(envelope).not.toBeNull();
      expect(envelope?.externalId).toBe("msg-123");
      expect(envelope?.title).toBe("Test email");
      expect(envelope?.sourceType).toBe("protonmail");
    });
  });
});
