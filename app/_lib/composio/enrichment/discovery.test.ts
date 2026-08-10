import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  getConnectedProvidersForEnrichment,
  hasConnectorManifest,
  getCategoryForProvider,
} from "./discovery";
import * as categoryFetcher from "../category-fetcher";
import { listAskSaltEntries } from "../connector-registry";
import { getCaptureCategory } from "../capture-categories";

vi.mock("../category-fetcher");
vi.mock("../connector-registry", () => ({
  listAskSaltEntries: vi.fn(),
}));
vi.mock("../capture-categories", () => ({
  getCaptureCategory: vi.fn(),
}));

const mockGetConnectedCategories = vi.mocked(categoryFetcher.getConnectedCategories);
const mockListAskSaltEntries = vi.mocked(listAskSaltEntries);
const mockGetCaptureCategory = vi.mocked(getCaptureCategory);

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
  beforeEach(() => {
    vi.clearAllMocks();
    mockListAskSaltEntries.mockResolvedValue([
      { toolkitSlug: "gmail" },
      { toolkitSlug: "stripe" },
    ] as Awaited<ReturnType<typeof listAskSaltEntries>>);
  });

  it("returns true for Ask Salt enabled providers", async () => {
    await expect(hasConnectorManifest("gmail")).resolves.toBe(true);
    await expect(hasConnectorManifest("stripe")).resolves.toBe(true);
    await expect(hasConnectorManifest("GMAIL")).resolves.toBe(true); // case-insensitive
  });

  it("returns false for providers without manifests (Ask Salt disabled)", async () => {
    // These connectors carry no ask_salt_slug_prefix in connector_overrides
    await expect(hasConnectorManifest("salesforce")).resolves.toBe(false);
    await expect(hasConnectorManifest("unknown")).resolves.toBe(false);
  });
});

describe("getCategoryForProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("delegates to the DB-backed capture category lookup", async () => {
    mockGetCaptureCategory.mockImplementation(async (provider) =>
      provider === "gmail" ? "email" : null,
    );

    await expect(getCategoryForProvider("gmail")).resolves.toBe("email");
    await expect(getCategoryForProvider("unknown-provider")).resolves.toBeNull();
  });
});
