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
      }),
    }),
  }),
}));

// Connection status per provider.
let connected: Record<string, { connected: boolean; connectionId: string | null }> =
  {};
vi.mock("./connections", () => ({
  getConnectionStatus: async (provider: string) => ({
    connected: connected[provider]?.connected ?? false,
    email: null,
    integrationId: null,
    composioConnectionId: connected[provider]?.connectionId ?? null,
    composioStatus: connected[provider]?.connected ? "connected" : null,
  }),
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

let disabledTools: string[] = [];
vi.mock("@/app/_features/connectors/queries", () => ({
  getWorkspaceDisabledTools: async () => disabledTools,
}));

import { resolveCapabilityTool } from "./capability-resolver";

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
  disabledTools = [];
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

  it("skips a connected tool that the user disabled", async () => {
    connected = {
      gmail: { connected: true, connectionId: "ca_gmail" },
      outlook: { connected: true, connectionId: "ca_outlook" },
    };
    disabledTools = ["GMAIL_SEND_EMAIL"];
    const result = await resolveCapabilityTool("send_message", WS);
    expect(result?.toolSlug).toBe("OUTLOOK_SEND_EMAIL");
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
});
