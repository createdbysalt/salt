import { describe, it, expect } from "vitest";
import {
  CONNECTOR_REGISTRY,
  validateRegistry,
  getConnector,
  getConnectorByCatalogId,
  getTriggerSlugsForProvider,
  getProvidersForCategory,
  getCategoryForProvider,
  getAskSaltManifest,
  getAskSaltToolkits,
  getConnectorMeta,
  getConnectorMetaWithFallback,
} from "./unified-connector-registry";

describe("unified-connector-registry", () => {
  describe("validateRegistry", () => {
    it("passes validation with no errors", () => {
      const result = validateRegistry();
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe("getConnector", () => {
    it("returns connector by provider key", () => {
      const gmail = getConnector("gmail");
      expect(gmail).not.toBeNull();
      expect(gmail?.category).toBe("email");
      expect(gmail?.askSalt.enabled).toBe(true);
    });

    it("returns null for unknown provider", () => {
      expect(getConnector("unknown")).toBeNull();
    });
  });

  describe("getConnectorByCatalogId", () => {
    it("returns connector by catalog ID", () => {
      const gmail = getConnectorByCatalogId("google");
      expect(gmail).not.toBeNull();
      expect(gmail?.providerKey).toBe("gmail");
    });

    it("returns null for unknown catalog ID", () => {
      expect(getConnectorByCatalogId("unknown")).toBeNull();
    });
  });

  describe("getTriggerSlugsForProvider", () => {
    it("returns trigger slugs for provider with triggers", () => {
      const slugs = getTriggerSlugsForProvider("gmail");
      expect(slugs).toContain("GMAIL_NEW_GMAIL_MESSAGE");
    });

    it("returns empty array for backfill-only provider", () => {
      const slugs = getTriggerSlugsForProvider("cal");
      expect(slugs).toHaveLength(0);
    });
  });

  describe("getProvidersForCategory", () => {
    it("returns all providers in email category", () => {
      const providers = getProvidersForCategory("email");
      expect(providers).toContain("gmail");
      expect(providers).toContain("outlook");
    });

    it("returns all providers in calendar category", () => {
      const providers = getProvidersForCategory("calendar");
      expect(providers).toContain("googlecalendar");
      expect(providers).toContain("cal");
      expect(providers).toContain("calendly");
    });
  });

  describe("getCategoryForProvider", () => {
    it("returns category for known provider", () => {
      expect(getCategoryForProvider("gmail")).toBe("email");
      expect(getCategoryForProvider("stripe")).toBe("billing");
      expect(getCategoryForProvider("hubspot")).toBe("crm");
    });

    it("returns null for unknown provider", () => {
      expect(getCategoryForProvider("unknown")).toBeNull();
    });
  });

  describe("Ask Salt exports", () => {
    it("returns only enabled connectors in manifest", () => {
      const manifest = getAskSaltManifest();
      expect(manifest.length).toBeGreaterThan(0);

      // All entries should have enabled = true in registry
      for (const entry of manifest) {
        const connector = getConnector(entry.toolkit);
        expect(connector?.askSalt.enabled).toBe(true);
      }
    });

    it("returns toolkit keys for enabled connectors", () => {
      const toolkits = getAskSaltToolkits();
      expect(toolkits).toContain("gmail");
      expect(toolkits).toContain("stripe");
      // Disabled connectors should not be included
      expect(toolkits).not.toContain("salesforce"); // askSalt.enabled = false
    });
  });

  describe("getConnectorMeta", () => {
    it("returns meta for known catalog ID", () => {
      const meta = getConnectorMeta("google");
      expect(meta).not.toBeNull();
      expect(meta?.displayName).toBe("Gmail");
      expect(meta?.developedBy).toBe("Google");
    });

    it("returns null for unknown catalog ID", () => {
      expect(getConnectorMeta("unknown")).toBeNull();
    });
  });

  describe("getConnectorMetaWithFallback", () => {
    it("returns registry meta for known connector", () => {
      const meta = getConnectorMetaWithFallback("google", "Fallback", "Fallback desc");
      expect(meta.displayName).toBe("Gmail");
    });

    it("returns fallback for unknown connector", () => {
      const meta = getConnectorMetaWithFallback("unknown", "Fallback Name", "Fallback description");
      expect(meta.displayName).toBe("Fallback Name");
      expect(meta.tagline).toBe("Fallback description");
      expect(meta.developedBy).toBe("");
      expect(meta.links).toHaveLength(0);
    });
  });

  describe("registry consistency", () => {
    it("all released connectors have complete metadata", () => {
      for (const [key, def] of Object.entries(CONNECTOR_REGISTRY)) {
        if (def.phase === "released") {
          expect(def.meta.displayName).toBeTruthy();
          expect(def.meta.developedBy).toBeTruthy();
          expect(def.meta.links.length).toBeGreaterThan(0);
        }
      }
    });

    it("all Ask Salt enabled connectors have slug prefixes", () => {
      for (const [key, def] of Object.entries(CONNECTOR_REGISTRY)) {
        if (def.askSalt.enabled) {
          expect(def.askSalt.slugPrefix).toBeTruthy();
          expect(def.askSalt.slugPrefix.endsWith("_")).toBe(true);
        }
      }
    });

    it("provider keys match object keys", () => {
      for (const [key, def] of Object.entries(CONNECTOR_REGISTRY)) {
        expect(def.providerKey).toBe(key);
      }
    });
  });
});
