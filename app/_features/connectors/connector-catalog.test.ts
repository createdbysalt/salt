import { describe, expect, it } from "vitest";
import {
  CONNECTOR_CATALOG,
  NATIVE_PLATFORM_SERVICES,
  getCatalogConnectors,
} from "./connector-catalog";

describe("connector catalog policy", () => {
  it("locks native platform services outside the user catalog", () => {
    expect(NATIVE_PLATFORM_SERVICES).toEqual([
      "supabase",
      "stripe",
      "resend",
      "openrouter",
    ]);
  });

  it("shows Stripe as a native user connector", () => {
    const stripe = CONNECTOR_CATALOG.find((entry) => entry.id === "stripe");
    expect(stripe?.ownership).toBe("native");
    expect(stripe?.showInCatalog).toBe(true);
  });

  it("does not expose internal platform services in the catalog", () => {
    const catalogIds = getCatalogConnectors().map((entry) => entry.id);
    expect(catalogIds).not.toContain("supabase");
    expect(catalogIds).not.toContain("resend");
    expect(catalogIds).not.toContain("openrouter");
  });

  it("includes Phase 1A Google connector", () => {
    const google = CONNECTOR_CATALOG.find((entry) => entry.id === "google");
    expect(google?.ownership).toBe("composio");
    expect(google?.phase).toBe("1a");
  });

  it("does not expose Cal.com or Fireflies in the user catalog", () => {
    const catalogIds = getCatalogConnectors().map((entry) => entry.id);
    expect(catalogIds).not.toContain("calcom");
    expect(catalogIds).not.toContain("fireflies");
  });
});
