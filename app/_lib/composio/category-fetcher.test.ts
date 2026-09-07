import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

/**
 * Fan-out tests (playbooks Phase 4): fetchByCategory resolves ALL connected,
 * approved, non-excluded providers for a capability and merges their reads.
 */

const { resolveCapabilityToolsMock, executeComposioActionMock } = vi.hoisted(
  () => ({
    resolveCapabilityToolsMock: vi.fn(),
    executeComposioActionMock: vi.fn(),
  })
);

vi.mock("./capability-resolver", () => ({
  resolveCapabilityTool: vi.fn().mockResolvedValue(null),
  resolveCapabilityTools: (...args: unknown[]) =>
    resolveCapabilityToolsMock(...args),
}));

vi.mock("./actions", () => ({
  executeComposioAction: (...args: unknown[]) =>
    executeComposioActionMock(...args),
}));

vi.mock("@/app/_lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

import { fetchByCategory } from "./category-fetcher";

const WS = "ws-1";

function tool(provider: string, toolSlug: string) {
  return {
    capabilityKey: "read_invoices",
    toolSlug,
    provider,
    connectionId: `ca_${provider}`,
    risk: "read" as const,
    requiresHumanConfirmation: false,
  };
}

const SPEC = {
  id: "invoices",
  category: "billing" as const,
  capability: "read_invoices",
};

beforeEach(() => {
  resolveCapabilityToolsMock.mockReset();
  executeComposioActionMock.mockReset();
});

describe("fetchByCategory fan-out", () => {
  it("single provider: returns the payload unchanged", async () => {
    resolveCapabilityToolsMock.mockResolvedValue([tool("stripe", "STRIPE_LIST_INVOICES")]);
    executeComposioActionMock.mockResolvedValue([{ id: "in_1", amount: 100 }]);

    const result = await fetchByCategory(WS, SPEC, { workspaceId: WS });

    expect(result.success).toBe(true);
    expect(result.data).toEqual([{ id: "in_1", amount: 100 }]);
    expect(result.provider).toBe("stripe");
    expect(result.providers).toEqual(["stripe"]);
  });

  it("two billing providers: merges both reads and tags records with _provider", async () => {
    resolveCapabilityToolsMock.mockResolvedValue([
      tool("stripe", "STRIPE_LIST_INVOICES"),
      tool("quickbooks", "QUICKBOOKS_GET_AGED_RECEIVABLES_REPORT"),
    ]);
    executeComposioActionMock
      .mockResolvedValueOnce([{ id: "in_1", client: "Acme", amount: 100 }])
      .mockResolvedValueOnce([{ id: "qb_9", client: "Acme", amount: 250 }]);

    const result = await fetchByCategory(WS, SPEC, { workspaceId: WS });

    expect(result.success).toBe(true);
    expect(result.providers).toEqual(["stripe", "quickbooks"]);
    // Cross-provider grouping needs the source app on every record.
    expect(result.data).toEqual([
      { _provider: "stripe", id: "in_1", client: "Acme", amount: 100 },
      { _provider: "quickbooks", id: "qb_9", client: "Acme", amount: 250 },
    ]);
  });

  it("passes exclusions through to the resolver", async () => {
    resolveCapabilityToolsMock.mockResolvedValue([tool("stripe", "STRIPE_LIST_INVOICES")]);
    executeComposioActionMock.mockResolvedValue([{ id: "in_1" }]);

    const excludeProviders = new Set(["quickbooks"]);
    await fetchByCategory(WS, SPEC, { workspaceId: WS, excludeProviders });

    expect(resolveCapabilityToolsMock).toHaveBeenCalledWith(
      "read_invoices",
      WS,
      expect.objectContaining({ excludeProviders })
    );
  });

  it("one provider failing does not sink the other provider's data", async () => {
    resolveCapabilityToolsMock.mockResolvedValue([
      tool("stripe", "STRIPE_LIST_INVOICES"),
      tool("quickbooks", "QUICKBOOKS_GET_AGED_RECEIVABLES_REPORT"),
    ]);
    executeComposioActionMock
      .mockRejectedValueOnce(new Error("stripe down"))
      .mockResolvedValueOnce([{ id: "qb_9", client: "Acme" }]);

    const result = await fetchByCategory(WS, SPEC, { workspaceId: WS });

    expect(result.success).toBe(true);
    expect(result.providers).toEqual(["quickbooks"]);
    expect(result.data).toEqual([{ _provider: "quickbooks", id: "qb_9", client: "Acme" }]);
  });

  it("fails when every provider fails", async () => {
    resolveCapabilityToolsMock.mockResolvedValue([
      tool("stripe", "STRIPE_LIST_INVOICES"),
      tool("quickbooks", "QUICKBOOKS_GET_AGED_RECEIVABLES_REPORT"),
    ]);
    executeComposioActionMock.mockRejectedValue(new Error("down"));

    const result = await fetchByCategory(WS, SPEC, { workspaceId: WS });

    expect(result.success).toBe(false);
    expect(result.error).toContain("down");
  });

  it("returns the no-provider result when the resolver finds nothing", async () => {
    resolveCapabilityToolsMock.mockResolvedValue([]);

    const result = await fetchByCategory(WS, SPEC, { workspaceId: WS });

    expect(result.success).toBe(false);
    expect(result.error).toContain("No provider available");
    expect(executeComposioActionMock).not.toHaveBeenCalled();
  });
});
