import { describe, expect, it } from "vitest";
import type { ConnectorDefinition } from "./types";
import {
  DOMAIN_ORDER,
  catalogDomains,
  domainForConnector,
  domainLabel,
} from "./connector-domains";

function def(
  partial: Partial<ConnectorDefinition> & { providerKey: string; category: ConnectorDefinition["category"] },
): ConnectorDefinition {
  return {
    id: partial.providerKey,
    name: partial.providerKey,
    description: "",
    ownership: "composio",
    authMethod: "oauth",
    phase: "2",
    showInCatalog: true,
    composioProviders: [partial.providerKey],
    ...partial,
  } as ConnectorDefinition;
}

describe("domainForConnector", () => {
  it("maps categories to Salt domains", () => {
    expect(domainForConnector(def({ providerKey: "slack", category: "communication" }))).toBe(
      "messaging",
    );
    expect(domainForConnector(def({ providerKey: "cal", category: "scheduling" }))).toBe(
      "calendars",
    );
    expect(domainForConnector(def({ providerKey: "dropbox", category: "files" }))).toBe(
      "files",
    );
    expect(domainForConnector(def({ providerKey: "quickbooks", category: "payments" }))).toBe(
      "finance",
    );
    expect(domainForConnector(def({ providerKey: "hubspot", category: "crm" }))).toBe(
      "crm",
    );
  });

  it("resolves the recommended-category split via provider overrides", () => {
    // Gmail and Google Calendar share the "recommended" category but belong
    // to different domains.
    expect(
      domainForConnector(def({ providerKey: "gmail", category: "recommended" })),
    ).toBe("messaging");
    expect(
      domainForConnector(def({ providerKey: "googlecalendar", category: "recommended" })),
    ).toBe("calendars");
  });

  it("falls back to other for unknown categories", () => {
    expect(
      domainForConnector(def({ providerKey: "mystery", category: "unknownthing" as ConnectorDefinition["category"] })),
    ).toBe("other");
  });
});

describe("catalogDomains", () => {
  it("returns present domains in canonical order", () => {
    const catalog = [
      def({ providerKey: "hubspot", category: "crm" }),
      def({ providerKey: "gmail", category: "recommended" }),
      def({ providerKey: "stripe", category: "payments" }),
    ];
    // messaging < finance < crm in DOMAIN_ORDER
    expect(catalogDomains(catalog)).toEqual(["messaging", "finance", "crm"]);
  });

  it("every domain has a non-empty label", () => {
    for (const domain of DOMAIN_ORDER) {
      expect(domainLabel(domain).length).toBeGreaterThan(0);
    }
  });
});
