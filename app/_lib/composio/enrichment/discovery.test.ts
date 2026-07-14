import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  getConnectedProvidersForEnrichment,
  hasConnectorManifest,
  getCategoryForProvider,
} from "./discovery";
import * as categoryFetcher from "../category-fetcher";

vi.mock("../category-fetcher");

const mockGetConnectedCategories = vi.mocked(categoryFetcher.getConnectedCategories);

describe("getConnectedProvidersForEnrichment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns providers for categories needed by entity type", async () => {
    mockGetConnectedCategories.mockResolvedValue([
      { category: "email", providers: ["gmail"], connectionIds: ["conn-gmail"] },
      { category: "crm", providers: ["hubspot"], connectionIds: ["conn-hubspot"] },
      { category: "project_management", providers: ["asana"], connectionIds: ["conn-asana"] },
    ]);

    const providers = await getConnectedProvidersForEnrichment("ws-123", "person");

    expect(providers).toHaveLength(2);
    expect(providers.map((p) => p.provider)).toContain("gmail");
    expect(providers.map((p) => p.provider)).toContain("hubspot");
    expect(providers.map((p) => p.provider)).not.toContain("asana");
  });

  it("returns one provider per category (first wins)", async () => {
    mockGetConnectedCategories.mockResolvedValue([
      {
        category: "email",
        providers: ["gmail", "outlook"],
        connectionIds: ["conn-gmail", "conn-outlook"],
      },
    ]);

    const providers = await getConnectedProvidersForEnrichment("ws-123", "person");

    expect(providers).toHaveLength(1);
    expect(providers[0].provider).toBe("gmail");
  });

  it("returns empty array when no matching categories", async () => {
    mockGetConnectedCategories.mockResolvedValue([
      { category: "project_management", providers: ["asana"], connectionIds: ["conn-asana"] },
    ]);

    const providers = await getConnectedProvidersForEnrichment("ws-123", "billing");

    expect(providers).toHaveLength(0);
  });

  it("handles billing entity type with billing category", async () => {
    mockGetConnectedCategories.mockResolvedValue([
      { category: "billing", providers: ["stripe"], connectionIds: ["conn-stripe"] },
      { category: "email", providers: ["gmail"], connectionIds: ["conn-gmail"] },
    ]);

    const providers = await getConnectedProvidersForEnrichment("ws-123", "billing");

    expect(providers.map((p) => p.category)).toContain("billing");
    expect(providers.map((p) => p.category)).toContain("email");
  });

  it("includes connectionId for each provider", async () => {
    mockGetConnectedCategories.mockResolvedValue([
      { category: "email", providers: ["gmail"], connectionIds: ["conn-gmail-abc"] },
    ]);

    const providers = await getConnectedProvidersForEnrichment("ws-123", "person");

    expect(providers[0].connectionId).toBe("conn-gmail-abc");
  });
});

describe("hasConnectorManifest", () => {
  it("returns true for Ask Salt enabled providers", () => {
    expect(hasConnectorManifest("gmail")).toBe(true);
    expect(hasConnectorManifest("hubspot")).toBe(true);
    expect(hasConnectorManifest("stripe")).toBe(true);
    expect(hasConnectorManifest("outlook")).toBe(true);
    expect(hasConnectorManifest("GMAIL")).toBe(true); // case-insensitive
  });

  it("returns false for providers without manifests (Ask Salt disabled)", () => {
    // These connectors are NOT Ask Salt enabled in unified-connector-registry
    expect(hasConnectorManifest("salesforce")).toBe(false);
    expect(hasConnectorManifest("unknown")).toBe(false);
  });
});

describe("getCategoryForProvider", () => {
  it("returns correct category for known providers", () => {
    expect(getCategoryForProvider("gmail")).toBe("email");
    expect(getCategoryForProvider("hubspot")).toBe("crm");
    expect(getCategoryForProvider("stripe")).toBe("billing");
    expect(getCategoryForProvider("asana")).toBe("project_management");
  });

  it("returns null for unknown providers", () => {
    expect(getCategoryForProvider("unknown-provider")).toBeNull();
  });

  it("handles case-insensitive lookup", () => {
    expect(getCategoryForProvider("GMAIL")).toBe("email");
    expect(getCategoryForProvider("HubSpot")).toBe("crm");
  });
});
