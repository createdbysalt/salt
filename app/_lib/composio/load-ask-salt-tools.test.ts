import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadAskSaltComposioToolsDetailed } from "./load-ask-salt-tools";
import { getConnectionStatus, checkConnectionHealth } from "./connections";
import { invalidateConnectionHealth } from "./health-check-cache";

vi.mock("./connections", () => ({
  getConnectionStatus: vi.fn(),
  checkConnectionHealth: vi.fn(),
}));

const createMock = vi.fn();
const useMock = vi.fn();

vi.mock("./client", () => ({
  getComposioAgentClient: vi.fn(() => ({
    create: createMock,
    use: useMock,
  })),
}));

vi.mock("@/app/_features/connectors/queries", () => ({
  getWorkspaceConnectorPolicy: vi.fn(async () => ({
    trustByProvider: {},
    emailModeByProvider: { gmail: "draft", outlook: "draft" },
  })),
}));

vi.mock("./connector-registry", () => ({
  listAskSaltEntries: vi.fn(async () => [
    {
      providerKey: "gmail",
      toolkitSlug: "gmail",
      authConfigId: "auth-config-1",
      askSaltSlugPrefix: "GMAIL_",
      askSaltLabel: "Gmail",
      tier: "action",
    },
  ]),
}));

vi.mock("./ask-salt-tools", () => ({
  wrapComposioToolsForAskSalt: vi.fn((tools: unknown) => tools),
}));

// Conversation-row store backing the session persistence. Keyed by id.
let conversationContext: Record<string, unknown> | null;
let updates: Array<Record<string, unknown>>;

vi.mock("@/app/_lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    from: (table: string) => {
      if (table !== "ask_salt_conversations") {
        throw new Error(`unexpected table ${table}`);
      }
      const builder = {
        select: () => builder,
        eq: () => builder,
        maybeSingle: async () => ({ data: { context: conversationContext }, error: null }),
        update: (values: Record<string, unknown>) => {
          updates.push(values);
          conversationContext = values.context as Record<string, unknown>;
          return {
            eq: async () => ({ error: null }),
          };
        },
      };
      return builder;
    },
  })),
}));

const WORKSPACE = "ws-1";
const CONVERSATION = "conv-1";

function connectedStatus() {
  return {
    connected: true,
    email: "me@example.com",
    integrationId: "int-1",
    composioConnectionId: "cc-1",
    composioStatus: "connected" as const,
  };
}

function healthyVerdict() {
  return {
    healthy: true,
    localStatus: "connected" as const,
    remoteStatus: "connected" as const,
    composioConnectionId: "cc-1",
    diagnostics: {},
  };
}

function sessionWith(id: string, tools: Record<string, unknown> = { GMAIL_FETCH_EMAILS: {} }) {
  return { sessionId: id, tools: vi.fn(async () => tools) };
}

beforeEach(() => {
  vi.clearAllMocks();
  conversationContext = null;
  updates = [];
  invalidateConnectionHealth(WORKSPACE);
  vi.mocked(getConnectionStatus).mockResolvedValue(connectedStatus());
  vi.mocked(checkConnectionHealth).mockResolvedValue(healthyVerdict());
  createMock.mockResolvedValue(sessionWith("session-new"));
  useMock.mockResolvedValue(sessionWith("session-stored"));
});

describe("loadAskSaltComposioToolsDetailed hygiene (3.6)", () => {
  it("creates a session and persists it on the conversation", async () => {
    const result = await loadAskSaltComposioToolsDetailed(WORKSPACE, {
      conversationId: CONVERSATION,
    });

    expect(createMock).toHaveBeenCalledTimes(1);
    expect(useMock).not.toHaveBeenCalled();
    expect(result.loadError).toBeNull();
    expect(updates).toHaveLength(1);
    const stored = (updates[0].context as Record<string, unknown>)
      .composioSession as Record<string, unknown>;
    expect(stored.sessionId).toBe("session-new");
    expect(stored.toolkitsKey).toBe("gmail");
  });

  it("reuses the stored session when the toolkit set is unchanged", async () => {
    conversationContext = {
      composioSession: {
        sessionId: "session-stored",
        toolkitsKey: "gmail",
        createdAt: new Date().toISOString(),
      },
    };

    const result = await loadAskSaltComposioToolsDetailed(WORKSPACE, {
      conversationId: CONVERSATION,
    });

    expect(useMock).toHaveBeenCalledWith("session-stored");
    expect(createMock).not.toHaveBeenCalled();
    expect(result.loadError).toBeNull();
    // Reuse does not rewrite the conversation row.
    expect(updates).toHaveLength(0);
  });

  it("creates a fresh session when the stored one is unusable", async () => {
    conversationContext = {
      composioSession: {
        sessionId: "session-expired",
        toolkitsKey: "gmail",
        createdAt: new Date().toISOString(),
      },
    };
    useMock.mockRejectedValue(new Error("session not found"));

    const result = await loadAskSaltComposioToolsDetailed(WORKSPACE, {
      conversationId: CONVERSATION,
    });

    expect(useMock).toHaveBeenCalledWith("session-expired");
    expect(createMock).toHaveBeenCalledTimes(1);
    expect(result.loadError).toBeNull();
  });

  it("ignores a stored session whose toolkit set no longer matches", async () => {
    conversationContext = {
      composioSession: {
        sessionId: "session-stored",
        toolkitsKey: "gmail,slack",
        createdAt: new Date().toISOString(),
      },
    };

    await loadAskSaltComposioToolsDetailed(WORKSPACE, {
      conversationId: CONVERSATION,
    });

    expect(useMock).not.toHaveBeenCalled();
    expect(createMock).toHaveBeenCalledTimes(1);
  });

  it("always creates a session when no conversation id is provided", async () => {
    await loadAskSaltComposioToolsDetailed(WORKSPACE);

    expect(createMock).toHaveBeenCalledTimes(1);
    expect(useMock).not.toHaveBeenCalled();
    expect(updates).toHaveLength(0);
  });

  it("caches health verdicts across loads within the TTL", async () => {
    await loadAskSaltComposioToolsDetailed(WORKSPACE);
    await loadAskSaltComposioToolsDetailed(WORKSPACE);

    expect(checkConnectionHealth).toHaveBeenCalledTimes(1);
  });
});
