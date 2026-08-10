import { describe, it, expect, vi, beforeEach } from "vitest";

const WORKSPACE_ID = "11111111-1111-4111-8111-111111111111";
const USER_ID = "22222222-2222-4222-8222-222222222222";
const CONNECTED_ACCOUNT_ID = "ca_test_123";

const mockGetConnectedAccount = vi.fn();
const mockInitiateConnectedAccount = vi.fn();
const mockSetCaptureState = vi.fn();
const mockRunGmailBootstrap = vi.fn();

let integrationRow: Record<string, unknown> | null = null;
const upsertPayloads: Array<Record<string, unknown>> = [];

vi.mock("./client", () => ({
  getComposioClient: () => ({
    connectedAccounts: {
      get: (...args: unknown[]) => mockGetConnectedAccount(...args),
      initiate: (...args: unknown[]) => mockInitiateConnectedAccount(...args),
    },
  }),
}));

vi.mock("./oauth-state", () => ({
  decodeComposioOAuthState: (state: string) =>
    state === "valid-state"
      ? {
          userId: USER_ID,
          workspaceId: WORKSPACE_ID,
          provider: "gmail",
          returnUrl: "/sources",
        }
      : null,
  encodeComposioOAuthState: () => "encoded-state",
}));

vi.mock("./connector-registry", () => ({
  isRegisteredConnectorProvider: () => Promise.resolve(true),
  getConnectorRegistryEntry: () =>
    Promise.resolve({
      authConfigId: "ac_test",
      authMethod: "api_key",
      apiKeyFieldName: "api_key",
      tier: "capture",
    }),
}));

vi.mock("./workspace-auth", () => ({
  assertWorkspaceMembership: () => Promise.resolve({ ok: true }),
}));

vi.mock("./capture-state", () => ({
  setCaptureState: (...args: unknown[]) => mockSetCaptureState(...args),
}));

vi.mock("./health-check-cache", () => ({
  invalidateConnectionHealth: () => undefined,
}));

vi.mock("@/app/_lib/supabase/server", () => ({
  createClient: () =>
    Promise.resolve({
      auth: {
        getUser: () => Promise.resolve({ data: { user: { id: USER_ID } } }),
      },
    }),
}));

vi.mock("@/app/_lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table !== "workspace_integrations") {
        throw new Error(`unexpected table: ${table}`);
      }
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: integrationRow }),
            }),
          }),
        }),
        upsert: (payload: Record<string, unknown>) => {
          upsertPayloads.push(payload);
          return Promise.resolve({ error: null });
        },
      };
    },
  }),
}));

// Keep the callback test focused on the config write: no capture adapter,
// so the auto-enable path is skipped.
vi.mock("@/app/_features/capture/adapters/registry", () => ({
  adapterForToolkit: () => Promise.resolve(null),
}));

vi.mock("@/app/_features/capture/services/gmail-backfill", () => ({
  runGmailBootstrap: (...args: unknown[]) => mockRunGmailBootstrap(...args),
}));

vi.mock("@/app/_features/capture/services/connector-backfills", () => ({
  runCalendarBootstrap: vi.fn(),
  runDriveBootstrap: vi.fn(),
  runStripeBootstrap: vi.fn(),
  runCalBootstrap: vi.fn(),
  runCalendlyBootstrap: vi.fn(),
  runDropboxBootstrap: vi.fn(),
  runQuickbooksBootstrap: vi.fn(),
  runOutlookBootstrap: vi.fn(),
}));

vi.mock("@/app/_lib/learning/emit-signal", () => ({
  emitEntitySignal: () => Promise.resolve(undefined),
}));

import {
  handleConnectionCallback,
  initiateApiKeyConnection,
} from "./connections";

describe("handleConnectionCallback config persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    integrationRow = null;
    upsertPayloads.length = 0;
    process.env.COMPOSIO_API_KEY = "test-key";
    mockGetConnectedAccount.mockResolvedValue({
      status: "ACTIVE",
      data: { email: "new@example.com" },
    });
    mockRunGmailBootstrap.mockResolvedValue(undefined);
  });

  it("preserves captureScope and other config on reconnect", async () => {
    const captureScope = {
      gmail: { labels: ["INBOX"], excludedSenders: ["news@x.com"] },
    };
    integrationRow = {
      id: "int-1",
      config: {
        email: "old@example.com",
        captureScope,
        captureTriggerIds: ["trig_old"],
      },
    };

    const result = await handleConnectionCallback(
      CONNECTED_ACCOUNT_ID,
      "valid-state",
    );

    expect(result.success).toBe(true);
    expect(upsertPayloads).toHaveLength(1);
    const config = upsertPayloads[0].config as Record<string, unknown>;
    expect(config.captureScope).toEqual(captureScope);
    expect(config.captureTriggerIds).toEqual(["trig_old"]);
    expect(config.email).toBe("new@example.com");
  });

  it("writes { email } config on a fresh connect", async () => {
    integrationRow = null;

    const result = await handleConnectionCallback(
      CONNECTED_ACCOUNT_ID,
      "valid-state",
    );

    expect(result.success).toBe(true);
    expect(upsertPayloads).toHaveLength(1);
    expect(upsertPayloads[0].config).toEqual({ email: "new@example.com" });
  });

  it("writes an empty config on a fresh connect without an email", async () => {
    integrationRow = null;
    mockGetConnectedAccount.mockResolvedValue({ status: "ACTIVE", data: {} });

    const result = await handleConnectionCallback(
      CONNECTED_ACCOUNT_ID,
      "valid-state",
    );

    expect(result.success).toBe(true);
    expect(upsertPayloads[0].config).toEqual({});
  });

  it("keeps the existing email when reconnect yields no email", async () => {
    integrationRow = {
      id: "int-1",
      config: { email: "old@example.com", captureScope: { gmail: {} } },
    };
    mockGetConnectedAccount.mockResolvedValue({ status: "ACTIVE", data: {} });

    const result = await handleConnectionCallback(
      CONNECTED_ACCOUNT_ID,
      "valid-state",
    );

    expect(result.success).toBe(true);
    const config = upsertPayloads[0].config as Record<string, unknown>;
    expect(config.email).toBe("old@example.com");
    expect(config.captureScope).toEqual({ gmail: {} });
  });
});

describe("initiateApiKeyConnection config parity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    integrationRow = null;
    upsertPayloads.length = 0;
    process.env.COMPOSIO_API_KEY = "test-key";
    mockInitiateConnectedAccount.mockResolvedValue({ id: "ca_api_key_1" });
    mockGetConnectedAccount.mockResolvedValue({ status: "ACTIVE", data: {} });
  });

  it("does not clobber existing config (config omitted from upsert)", async () => {
    const result = await initiateApiKeyConnection(
      "stripe",
      WORKSPACE_ID,
      USER_ID,
      "sk_test_123",
    );

    expect(result.success).toBe(true);
    expect(upsertPayloads).toHaveLength(1);
    // PostgREST upsert updates only the columns in the payload; omitting
    // `config` preserves the existing row's captureScope/trigger ids.
    expect(upsertPayloads[0]).not.toHaveProperty("config");
  });
});
