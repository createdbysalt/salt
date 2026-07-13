import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  isCapabilityEnrichmentEnabled,
  enrichViaCapability,
  getCapabilityEnabledProviders,
} from "./capability-enricher";
import * as adminModule from "@/app/_lib/supabase/admin";
import * as capabilityResolver from "../capability-resolver";
import * as actions from "../actions";

vi.mock("@/app/_lib/supabase/admin");
vi.mock("../capability-resolver");
vi.mock("../actions");

const mockCreateAdminClient = vi.mocked(adminModule.createAdminClient);
const mockResolveCapabilityTool = vi.mocked(capabilityResolver.resolveCapabilityTool);
const mockExecuteComposioAction = vi.mocked(actions.executeComposioAction);

function createMockSupabase(rows: unknown[]) {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            in: () => ({
              limit: () => Promise.resolve({ data: rows, error: null }),
            }),
          }),
          in: () => Promise.resolve({ data: rows, error: null }),
        }),
        in: () => Promise.resolve({ data: rows, error: null }),
      }),
    }),
  } as unknown as ReturnType<typeof adminModule.createAdminClient>;
}

describe("isCapabilityEnrichmentEnabled", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns enabled with capability when provider has enrichment-enabled capability", async () => {
    mockCreateAdminClient.mockReturnValue(
      createMockSupabase([{ capability_key: "search_contacts" }])
    );

    const result = await isCapabilityEnrichmentEnabled("hubspot", "person");

    expect(result.enabled).toBe(true);
    expect(result.capability).toBe("search_contacts");
  });

  it("returns disabled when no enrichment-enabled capabilities", async () => {
    mockCreateAdminClient.mockReturnValue(createMockSupabase([]));

    const result = await isCapabilityEnrichmentEnabled("outlook", "person");

    expect(result.enabled).toBe(false);
  });

  it("returns disabled for entity types with no capabilities", async () => {
    const result = await isCapabilityEnrichmentEnabled("gmail", "me");

    expect(result.enabled).toBe(false);
  });
});

describe("enrichViaCapability", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns unsupported when capability not enabled", async () => {
    mockCreateAdminClient.mockReturnValue(createMockSupabase([]));

    const result = await enrichViaCapability("ws-123", "outlook", "person", {
      name: "Test",
    });

    expect(result.supported).toBe(false);
    expect(result.result).toBeNull();
  });

  it("extracts fields from successful capability response", async () => {
    mockCreateAdminClient.mockReturnValue(
      createMockSupabase([{ capability_key: "search_contacts" }])
    );

    mockResolveCapabilityTool.mockResolvedValue({
      capabilityKey: "search_contacts",
      toolSlug: "HUBSPOT_SEARCH_CONTACTS",
      provider: "hubspot",
      connectionId: "conn-123",
      risk: "read",
      requiresHumanConfirmation: false,
    });

    mockExecuteComposioAction.mockResolvedValue({
      results: [
        {
          email: "lisa@acme.com",
          phone: "+1-555-0123",
          title: "CEO",
          company: "Acme Corp",
        },
      ],
    });

    const result = await enrichViaCapability("ws-123", "hubspot", "person", {
      name: "Jane Example",
    });

    expect(result.supported).toBe(true);
    expect(result.result?.hasData).toBe(true);
    expect(result.result?.fields.email?.value).toBe("lisa@acme.com");
    expect(result.result?.fields.phone?.value).toBe("+1-555-0123");
    expect(result.result?.fields.title?.value).toBe("CEO");
  });

  it("returns empty result when no query buildable from seed", async () => {
    mockCreateAdminClient.mockReturnValue(
      createMockSupabase([{ capability_key: "search_contacts" }])
    );

    mockResolveCapabilityTool.mockResolvedValue({
      capabilityKey: "search_contacts",
      toolSlug: "HUBSPOT_SEARCH_CONTACTS",
      provider: "hubspot",
      connectionId: "conn-123",
      risk: "read",
      requiresHumanConfirmation: false,
    });

    const result = await enrichViaCapability("ws-123", "hubspot", "person", {});

    expect(result.supported).toBe(true);
    expect(result.result?.hasData).toBe(false);
    expect(result.reason).toContain("No query buildable");
  });

  it("handles execution errors gracefully", async () => {
    mockCreateAdminClient.mockReturnValue(
      createMockSupabase([{ capability_key: "search_contacts" }])
    );

    mockResolveCapabilityTool.mockResolvedValue({
      capabilityKey: "search_contacts",
      toolSlug: "HUBSPOT_SEARCH_CONTACTS",
      provider: "hubspot",
      connectionId: "conn-123",
      risk: "read",
      requiresHumanConfirmation: false,
    });

    mockExecuteComposioAction.mockRejectedValue(new Error("API error"));

    const result = await enrichViaCapability("ws-123", "hubspot", "person", {
      name: "Test",
    });

    expect(result.supported).toBe(true);
    expect(result.result?.hasData).toBe(false);
    expect(result.reason).toContain("API error");
  });
});

describe("getCapabilityEnabledProviders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns unique provider keys", async () => {
    mockCreateAdminClient.mockReturnValue(
      createMockSupabase([
        { provider_key: "hubspot" },
        { provider_key: "salesforce" },
        { provider_key: "hubspot" },
      ])
    );

    const providers = await getCapabilityEnabledProviders("person");

    expect(providers).toContain("hubspot");
    expect(providers).toContain("salesforce");
    expect(providers).toHaveLength(2);
  });

  it("returns empty array for entity types with no capabilities", async () => {
    const providers = await getCapabilityEnabledProviders("me");

    expect(providers).toHaveLength(0);
  });
});
