import { beforeEach, describe, expect, it, vi } from "vitest";
import { getConnectorRegistry } from "./connector-registry";
import {
  FALLBACK_PROVIDER_CATEGORIES,
  getCaptureCategory,
  getCaptureCategoryMap,
  listProvidersForCategory,
} from "./capture-categories";
import type { ConnectorRegistryEntry } from "./connector-registry";

vi.mock("./connector-registry", () => ({
  getConnectorRegistry: vi.fn(),
}));

const mockRegistry = vi.mocked(getConnectorRegistry);

function entry(
  providerKey: string,
  captureCategory: string | null,
): ConnectorRegistryEntry {
  return {
    providerKey,
    toolkitSlug: providerKey,
    name: providerKey,
    description: "",
    category: "other",
    authMethod: "oauth",
    comingSoon: false,
    logoUrl: null,
    tier: "capture",
    authConfigId: "ac-1",
    captureCategory,
    apiKeyFieldName: null,
    apiKeyForm: null,
    askSaltSlugPrefix: null,
    askSaltLabel: null,
    catalogId: null,
    showInCatalog: true,
    featured: false,
    connectHelp: null,
    nativeBadge: null,
    phase: null,
    tagline: null,
    developedBy: null,
    links: [],
  };
}

function registryWith(
  entries: ConnectorRegistryEntry[],
): Map<string, ConnectorRegistryEntry> {
  return new Map(entries.map((e) => [e.providerKey, e]));
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getCaptureCategoryMap", () => {
  it("reads capture_category from the DB registry", async () => {
    mockRegistry.mockResolvedValue(
      registryWith([
        entry("gmail", "email"),
        entry("linear", "project_management"),
        entry("nocat", null),
      ]),
    );

    const map = await getCaptureCategoryMap();

    expect(map.get("gmail")).toBe("email");
    expect(map.get("linear")).toBe("project_management");
    expect(map.has("nocat")).toBe(false);
  });

  it("filters out category values outside the known taxonomy", async () => {
    mockRegistry.mockResolvedValue(
      registryWith([entry("gmail", "email"), entry("bogus", "not_a_category")]),
    );

    const map = await getCaptureCategoryMap();

    expect(map.get("gmail")).toBe("email");
    expect(map.has("bogus")).toBe(false);
  });

  it("falls back to the frozen snapshot when the DB registry is unavailable", async () => {
    mockRegistry.mockRejectedValue(new Error("db down"));

    const map = await getCaptureCategoryMap();

    expect(map.get("gmail")).toBe(FALLBACK_PROVIDER_CATEGORIES.gmail);
    expect(map.size).toBe(Object.keys(FALLBACK_PROVIDER_CATEGORIES).length);
  });
});

describe("getCaptureCategory", () => {
  it("is case-insensitive", async () => {
    mockRegistry.mockResolvedValue(registryWith([entry("gmail", "email")]));

    await expect(getCaptureCategory("GMAIL")).resolves.toBe("email");
  });

  it("returns null for providers without a capture category", async () => {
    mockRegistry.mockResolvedValue(registryWith([entry("gmail", "email")]));

    await expect(getCaptureCategory("unknown")).resolves.toBeNull();
  });
});

describe("listProvidersForCategory", () => {
  it("returns only providers in the requested category", async () => {
    mockRegistry.mockResolvedValue(
      registryWith([
        entry("gmail", "email"),
        entry("outlook", "email"),
        entry("stripe", "billing"),
      ]),
    );

    await expect(listProvidersForCategory("email")).resolves.toEqual([
      "gmail",
      "outlook",
    ]);
  });
});
