import { describe, expect, it } from "vitest";
import { usesInlineApiKeyConnect } from "./inline-api-key-connect";
import type { ConnectorDefinition } from "../types";

function stubDefinition(
  overrides: Partial<ConnectorDefinition>,
): ConnectorDefinition {
  return {
    id: "stripe",
    name: "Stripe",
    description: "Payments",
    category: "payments",
    ownership: "composio",
    authMethod: "api_key",
    phase: "1c",
    showInCatalog: true,
    ...overrides,
  };
}

describe("usesInlineApiKeyConnect", () => {
  it("returns true for api_key connectors with connectHelp", () => {
    expect(
      usesInlineApiKeyConnect(
        stubDefinition({ connectHelp: "Paste your key below." }),
      ),
    ).toBe(true);
  });

  it("returns false for api_key connectors without connectHelp", () => {
    expect(usesInlineApiKeyConnect(stubDefinition({}))).toBe(false);
  });

  it("returns false for oauth connectors even with connectHelp", () => {
    expect(
      usesInlineApiKeyConnect(
        stubDefinition({
          authMethod: "oauth",
          connectHelp: "Sign in at the provider.",
        }),
      ),
    ).toBe(false);
  });

  it("returns false for catalog_only connectors (browse-only, plan 5.5)", () => {
    expect(
      usesInlineApiKeyConnect(
        stubDefinition({
          tier: "catalog_only",
          connectHelp: "Paste your key below.",
        }),
      ),
    ).toBe(false);
  });
});
