import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

// tool_capabilities rows the mocked DB returns, per capability_key.
let capabilityRows: Record<
  string,
  { tool_slug: string; provider_key: string; priority: number }[]
> = {};

vi.mock("@/app/_lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({
        eq: (_col: string, key: string) => ({
          order: async () => ({
            data: capabilityRows[key] ?? [],
            error: null,
          }),
        }),
        // Reverse lookup: capability keys for a set of tool slugs.
        in: (_col: string, slugs: string[]) => ({
          data: Object.entries(capabilityRows).flatMap(([key, rows]) =>
            rows
              .filter((row) => slugs.includes(row.tool_slug))
              .map((row) => ({ capability_key: key, tool_slug: row.tool_slug }))
          ),
          error: null,
        }),
      }),
    }),
  }),
}));

// Connection status per provider.
let connected: Record<string, { connected: boolean; connectionId: string | null }> =
  {};
const { getConnectionStatus } = vi.hoisted(() => ({
  getConnectionStatus: vi.fn(async () => ({
    connected: false,
    email: null,
    integrationId: null,
    composioConnectionId: null,
    composioStatus: null,
  })),
}));
vi.mock("./connections", () => ({
  // The resolver runs in session-less system contexts (signal dispatch,
  // crons, enrichment) — it must use the admin lookup, never the
  // session-scoped one (RLS would hide every row).
  getConnectionStatusAdmin: async (provider: string) => ({
    connected: connected[provider]?.connected ?? false,
    email: null,
    integrationId: null,
    composioConnectionId: connected[provider]?.connectionId ?? null,
    composioStatus: connected[provider]?.connected ? "connected" : null,
  }),
  getConnectionStatus,
}));

// Approved classification per slug.
let approved: Record<
  string,
  { risk: "read" | "mutating" | "destructive"; requiresHumanConfirmation: boolean }
> = {};
vi.mock("./classification-store", () => ({
  getApprovedToolClassification: async (slug: string) =>
    approved[slug]
      ? { slug, risk: approved[slug].risk, requiresHumanConfirmation: approved[slug].requiresHumanConfirmation }
      : null,
}));

import { listCapabilityKeysForToolSlugs, resolveCapabilityTool, resolveCapabilityTools } from "./capability-resolver";

const WS = "ws-1";

beforeEach(() => {
  capabilityRows = {
    send_message: [
      { tool_slug: "GMAIL_SEND_EMAIL", provider_key: "gmail", priority: 10 },
      { tool_slug: "OUTLOOK_SEND_EMAIL", provider_key: "outlook", priority: 20 },
    ],
  };
  connected = {};
  approved = {
    GMAIL_SEND_EMAIL: { risk: "mutating", requiresHumanConfirmation: true },
    OUTLOOK_SEND_EMAIL: { risk: "mutating", requiresHumanConfirmation: true },
  };
});

describe("resolveCapabilityTool", () => {
  it("picks the highest-priority connected + approved tool", async () => {
    connected = {
      gmail: { connected: true, connectionId: "ca_gmail" },
      outlook: { connected: true, connectionId: "ca_outlook" },
    };
    const result = await resolveCapabilityTool("send_message", WS);
    expect(result?.toolSlug).toBe("GMAIL_SEND_EMAIL");
    expect(result?.connectionId).toBe("ca_gmail");
    expect(result?.requiresHumanConfirmation).toBe(true);
  });

  it("falls through to the next provider when the top one isn't connected", async () => {
    connected = { outlook: { connected: true, connectionId: "ca_outlook" } };
    const result = await resolveCapabilityTool("send_message", WS);
    expect(result?.toolSlug).toBe("OUTLOOK_SEND_EMAIL");
    expect(result?.provider).toBe("outlook");
  });

  it("skips a connected tool that has no approved classification (fail-closed)", async () => {
    connected = { gmail: { connected: true, connectionId: "ca_gmail" } };
    approved = {}; // nothing approved
    const result = await resolveCapabilityTool("send_message", WS);
    expect(result).toBeNull();
  });

  it("returns null when nothing is connected", async () => {
    const result = await resolveCapabilityTool("send_message", WS);
    expect(result).toBeNull();
  });

  it("returns null for an unknown capability", async () => {
    const result = await resolveCapabilityTool("teleport", WS);
    expect(result).toBeNull();
  });

  it("never uses the session-scoped connection lookup (RLS hides rows without a session)", async () => {
    connected = { gmail: { connected: true, connectionId: "ca_gmail" } };
    const result = await resolveCapabilityTool("send_message", WS);
    expect(result?.toolSlug).toBe("GMAIL_SEND_EMAIL");
    expect(getConnectionStatus).not.toHaveBeenCalled();
  });
});

describe("resolveCapabilityTools (fan-out)", () => {
  it("returns every connected + approved provider in priority order", async () => {
    connected = {
      gmail: { connected: true, connectionId: "ca_gmail" },
      outlook: { connected: true, connectionId: "ca_outlook" },
    };
    const results = await resolveCapabilityTools("send_message", WS);
    expect(results.map((r) => r.toolSlug)).toEqual([
      "GMAIL_SEND_EMAIL",
      "OUTLOOK_SEND_EMAIL",
    ]);
  });

  it("skips providers that are not connected or not approved", async () => {
    connected = { outlook: { connected: true, connectionId: "ca_outlook" } };
    approved = { OUTLOOK_SEND_EMAIL: approved.OUTLOOK_SEND_EMAIL };
    const results = await resolveCapabilityTools("send_message", WS);
    expect(results.map((r) => r.provider)).toEqual(["outlook"]);
  });

  it("drops excluded providers", async () => {
    connected = {
      gmail: { connected: true, connectionId: "ca_gmail" },
      outlook: { connected: true, connectionId: "ca_outlook" },
    };
    const results = await resolveCapabilityTools("send_message", WS, {
      excludeProviders: new Set(["outlook"]),
    });
    expect(results.map((r) => r.provider)).toEqual(["gmail"]);
  });

  it("returns [] when every provider is excluded", async () => {
    connected = { gmail: { connected: true, connectionId: "ca_gmail" } };
    const results = await resolveCapabilityTools("send_message", WS, {
      excludeProviders: new Set(["gmail", "outlook"]),
    });
    expect(results).toEqual([]);
  });
});

describe("listCapabilityKeysForToolSlugs", () => {
  it("maps tool slugs to their capability keys", async () => {
    capabilityRows = {
      read_invoices: [
        { tool_slug: "STRIPE_LIST_INVOICES", provider_key: "stripe", priority: 10 },
        { tool_slug: "QUICKBOOKS_GET_AGED_RECEIVABLES_REPORT", provider_key: "quickbooks", priority: 20 },
      ],
      read_payments: [
        { tool_slug: "STRIPE_LIST_CHARGES", provider_key: "stripe", priority: 10 },
      ],
    };
    const map = await listCapabilityKeysForToolSlugs([
      "STRIPE_LIST_INVOICES",
      "STRIPE_LIST_CHARGES",
    ]);
    expect(map.get("STRIPE_LIST_INVOICES")).toEqual(["read_invoices"]);
    expect(map.get("STRIPE_LIST_CHARGES")).toEqual(["read_payments"]);
  });

  it("returns an empty map for unknown slugs and empty input", async () => {
    capabilityRows = {};
    const map = await listCapabilityKeysForToolSlugs(["NOPE_TOOL"]);
    expect(map.size).toBe(0);
    expect((await listCapabilityKeysForToolSlugs([])).size).toBe(0);
  });
});
