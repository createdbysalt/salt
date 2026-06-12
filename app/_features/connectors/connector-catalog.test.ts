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

  it("shows Stripe as a Composio API-key connector", () => {
    const stripe = CONNECTOR_CATALOG.find((entry) => entry.id === "stripe");
    expect(stripe?.ownership).toBe("composio");
    expect(stripe?.authMethod).toBe("api_key");
    expect(stripe?.providerKey).toBe("stripe");
    expect(stripe?.composioProviders).toEqual(["stripe"]);
    expect(stripe?.nativeBadge).toBeUndefined();
    expect(stripe?.showInCatalog).toBe(true);
  });

  it("platform-service names in the catalog are user-account Composio connectors, never native", () => {
    // Stripe precedent: NATIVE_PLATFORM_SERVICES locks Salt's internal
    // account; a same-named catalog entry is the *user's own* account.
    for (const id of ["supabase", "resend", "openrouter"] as const) {
      const entry = CONNECTOR_CATALOG.find((candidate) => candidate.id === id);
      expect(entry?.ownership).toBe("composio");
      expect(entry?.comingSoon).toBe(true);
      expect(entry?.nativeBadge).toBeUndefined();
    }
  });

  it("includes Phase 1A Google connector", () => {
    const google = CONNECTOR_CATALOG.find((entry) => entry.id === "google");
    expect(google?.ownership).toBe("composio");
    expect(google?.phase).toBe("1a");
  });

  it("exposes Cal.com and Fireflies as coming-soon Composio connectors", () => {
    const calcom = CONNECTOR_CATALOG.find((entry) => entry.id === "calcom");
    const fireflies = CONNECTOR_CATALOG.find(
      (entry) => entry.id === "fireflies",
    );

    expect(calcom?.ownership).toBe("composio");
    expect(calcom?.providerKey).toBe("cal");
    expect(calcom?.comingSoon).toBe(true);

    expect(fireflies?.ownership).toBe("composio");
    expect(fireflies?.providerKey).toBe("fireflies");
    expect(fireflies?.comingSoon).toBe(true);
  });
});
