import { beforeEach, describe, expect, it, vi } from "vitest";

const selectMock = vi.fn();
vi.mock("@/app/_lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({ select: selectMock }),
  }),
}));

const getConnectorRegistryMock = vi.fn();
vi.mock("@/app/_lib/composio/connector-registry", () => ({
  getConnectorRegistry: (...args: unknown[]) =>
    getConnectorRegistryMock(...args),
}));

import {
  resolveAdapterForTriggerSlug,
  invalidateTriggerRouteCache,
} from "./trigger-routing";

function registryWith(
  entries: Array<{
    providerKey: string;
    toolkitSlug: string;
    captureCategory: string | null;
  }>,
) {
  return new Map(entries.map((entry) => [entry.providerKey, entry]));
}

describe("resolveAdapterForTriggerSlug", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    invalidateTriggerRouteCache();
  });

  it("routes a DB-known slug through capture_category to the category adapter", async () => {
    selectMock.mockResolvedValue({
      data: [{ trigger_slug: "GMAIL_NEW_GMAIL_MESSAGE", toolkit_slug: "gmail" }],
      error: null,
    });
    getConnectorRegistryMock.mockResolvedValue(
      registryWith([
        { providerKey: "gmail", toolkitSlug: "gmail", captureCategory: "email" },
      ]),
    );

    const adapter = await resolveAdapterForTriggerSlug("GMAIL_NEW_GMAIL_MESSAGE");
    expect(adapter).not.toBeNull();
    expect(adapter?.toolkit).toBe("gmail");
  });

  it("routes a slug the code-built map does not know, as long as DB rows exist", async () => {
    // A hypothetical new provider enabled purely via DB rows — the whole
    // point of Phase 5: zero code changes to route its webhooks.
    selectMock.mockResolvedValue({
      data: [{ trigger_slug: "WAVE_NEW_INVOICE_TRIGGER", toolkit_slug: "wave" }],
      error: null,
    });
    getConnectorRegistryMock.mockResolvedValue(
      registryWith([
        { providerKey: "wave", toolkitSlug: "wave", captureCategory: "billing" },
      ]),
    );

    const adapter = await resolveAdapterForTriggerSlug("WAVE_NEW_INVOICE_TRIGGER");
    expect(adapter).not.toBeNull();
    expect(adapter?.toolkit).toBe("wave");
  });

  it("falls back to the code-built map when the DB read fails", async () => {
    selectMock.mockResolvedValue({
      data: null,
      error: { message: "connection refused" },
    });
    getConnectorRegistryMock.mockResolvedValue(registryWith([]));

    const adapter = await resolveAdapterForTriggerSlug("GMAIL_NEW_GMAIL_MESSAGE");
    // Code-built map still knows Gmail.
    expect(adapter).not.toBeNull();
    expect(adapter?.toolkit).toBe("gmail");
  });

  it("does not route providers whose capture_category is NULL (falls back, then no_adapter)", async () => {
    selectMock.mockResolvedValue({
      data: [{ trigger_slug: "FIGMA_SOMETHING_TRIGGER", toolkit_slug: "figma" }],
      error: null,
    });
    getConnectorRegistryMock.mockResolvedValue(
      registryWith([
        { providerKey: "figma", toolkitSlug: "figma", captureCategory: null },
      ]),
    );

    const adapter = await resolveAdapterForTriggerSlug("FIGMA_SOMETHING_TRIGGER");
    expect(adapter).toBeNull();
  });

  it("returns null for a slug unknown to both DB and code", async () => {
    selectMock.mockResolvedValue({ data: [], error: null });
    getConnectorRegistryMock.mockResolvedValue(registryWith([]));

    const adapter = await resolveAdapterForTriggerSlug("TOTALLY_UNKNOWN");
    expect(adapter).toBeNull();
  });

  it("caches trigger rows across calls", async () => {
    selectMock.mockResolvedValue({
      data: [{ trigger_slug: "GMAIL_NEW_GMAIL_MESSAGE", toolkit_slug: "gmail" }],
      error: null,
    });
    getConnectorRegistryMock.mockResolvedValue(
      registryWith([
        { providerKey: "gmail", toolkitSlug: "gmail", captureCategory: "email" },
      ]),
    );

    await resolveAdapterForTriggerSlug("GMAIL_NEW_GMAIL_MESSAGE");
    await resolveAdapterForTriggerSlug("GMAIL_NEW_GMAIL_MESSAGE");
    expect(selectMock).toHaveBeenCalledTimes(1);
  });
});
