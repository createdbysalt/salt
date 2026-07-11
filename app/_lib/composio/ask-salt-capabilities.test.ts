import { beforeEach, describe, expect, it, vi } from "vitest";
import { COMPOSIO_TOOL_SLUGS } from "./tool-slugs";
import { isComposioConfigured, getConnectionStatus } from "./connections";
import { loadAskSaltComposioToolsDetailed } from "./load-ask-salt-tools";
import {
  resolveAskSaltCapabilities,
  buildAskSaltCapabilityBlock,
  type AskSaltCapabilities,
} from "./ask-salt-capabilities";

vi.mock("./connections", () => ({
  isComposioConfigured: vi.fn(() => true),
  getConnectionStatus: vi.fn(),
}));

vi.mock("./load-ask-salt-tools", () => ({
  loadAskSaltComposioToolsDetailed: vi.fn(),
}));

vi.mock("@/app/_features/connectors/queries", () => ({
  getWorkspaceConnectorPolicy: vi.fn(async () => ({
    disabledTools: [],
    trustByProvider: {},
    emailMode: "draft",
  })),
}));

vi.mock("@/app/_features/ask-salt/connector-discovery-tools", () => ({
  buildConnectorDiscoveryTools: vi.fn(() => ({})),
}));

vi.mock("./connector-registry", () => ({
  getConnectorRegistry: vi.fn(async () => {
    const toolkits = [
      "gmail",
      "googlecalendar",
      "googledrive",
      "googledocs",
      "googlesheets",
      "googleslides",
      "stripe",
    ];
    return new Map(toolkits.map((toolkit) => [toolkit, { providerKey: toolkit }]));
  }),
}));

const WORKSPACE = "ws-1";

function disconnected() {
  return {
    connected: false,
    email: null,
    integrationId: null,
    composioConnectionId: null,
    composioStatus: null,
  };
}

function connectedAs(email: string | null) {
  return {
    connected: true,
    email,
    integrationId: "int-1",
    composioConnectionId: "cc-1",
    composioStatus: "connected" as const,
  };
}

beforeEach(() => {
  vi.mocked(isComposioConfigured).mockReturnValue(true);
  vi.mocked(getConnectionStatus).mockResolvedValue(disconnected());
  vi.mocked(loadAskSaltComposioToolsDetailed).mockResolvedValue({
    tools: {},
    connectedToolkits: [],
    connectionIdByToolkit: {},
    loadedSlugs: [],
    loadError: null,
  });
});

describe("resolveAskSaltCapabilities", () => {
  it("reports connectors unavailable when Composio is not configured", async () => {
    vi.mocked(isComposioConfigured).mockReturnValue(false);
    vi.mocked(getConnectionStatus).mockImplementation(async (provider) =>
      provider === "gmail" ? connectedAs("me@example.com") : disconnected(),
    );

    const caps = await resolveAskSaltCapabilities(WORKSPACE);

    expect(caps.composioConfigured).toBe(false);
    expect(caps.composioTools).toEqual({});
    const gmail = caps.providers.find((p) => p.toolkit === "gmail");
    expect(gmail?.connected).toBe(true);
    expect(gmail?.diagnostic).toBe("integration_api_offline");
    expect(getConnectionStatus).toHaveBeenCalled();
  });

  it("marks a connected provider with loaded tools as available", async () => {
    vi.mocked(getConnectionStatus).mockImplementation(async (provider) =>
      provider === "gmail" ? connectedAs("me@example.com") : disconnected(),
    );
    vi.mocked(loadAskSaltComposioToolsDetailed).mockResolvedValue({
      tools: { [COMPOSIO_TOOL_SLUGS.GMAIL_LIST_MESSAGES]: {} as never },
      connectedToolkits: ["gmail"],
      connectionIdByToolkit: {},
      loadedSlugs: [COMPOSIO_TOOL_SLUGS.GMAIL_LIST_MESSAGES],
      loadError: null,
    });

    const caps = await resolveAskSaltCapabilities(WORKSPACE);
    const gmail = caps.providers.find((p) => p.toolkit === "gmail");

    expect(gmail?.diagnostic).toBe("available");
    expect(gmail?.email).toBe("me@example.com");
    expect(gmail?.loadedSlugs).toEqual([COMPOSIO_TOOL_SLUGS.GMAIL_LIST_MESSAGES]);
  });

  it("distinguishes connected-but-no-tools from a load failure", async () => {
    vi.mocked(getConnectionStatus).mockImplementation(async (provider) =>
      provider === "gmail" ? connectedAs("me@example.com") : disconnected(),
    );

    // Connected, no tools, no error => disabled/read-only.
    vi.mocked(loadAskSaltComposioToolsDetailed).mockResolvedValue({
      tools: {},
      connectedToolkits: ["gmail"],
      connectionIdByToolkit: {},
      loadedSlugs: [],
      loadError: null,
    });
    let caps = await resolveAskSaltCapabilities(WORKSPACE);
    expect(caps.providers.find((p) => p.toolkit === "gmail")?.diagnostic).toBe(
      "connected_no_tools",
    );

    // Connected, no tools, error => transient load failure.
    vi.mocked(loadAskSaltComposioToolsDetailed).mockResolvedValue({
      tools: {},
      connectedToolkits: ["gmail"],
      connectionIdByToolkit: {},
      loadedSlugs: [],
      loadError: "boom",
    });
    caps = await resolveAskSaltCapabilities(WORKSPACE);
    expect(caps.providers.find((p) => p.toolkit === "gmail")?.diagnostic).toBe(
      "load_failed",
    );
  });
});

function capabilitiesFixture(
  overrides: Partial<AskSaltCapabilities> = {},
): AskSaltCapabilities {
  return {
    composioConfigured: true,
    composioTools: {},
    loadError: null,
    providers: [
      {
        toolkit: "gmail",
        label: "Gmail",
        connected: true,
        email: "me@example.com",
        loadedSlugs: [COMPOSIO_TOOL_SLUGS.GMAIL_LIST_MESSAGES],
        diagnostic: "available",
      },
      {
        toolkit: "googlecalendar",
        label: "Google Calendar",
        connected: false,
        email: null,
        loadedSlugs: [],
        diagnostic: "not_connected",
      },
    ],
    ...overrides,
  };
}

describe("buildAskSaltCapabilityBlock", () => {
  it("lists a connected provider with its email and tools, and flags unconnected ones", () => {
    const block = buildAskSaltCapabilityBlock(capabilitiesFixture());

    expect(block).toContain("Gmail (connected as me@example.com)");
    expect(block).toContain("(read, slug GMAIL_FETCH_EMAILS)");
    expect(block).toContain("Google Calendar is not connected");
    expect(block).toContain("Only the tools listed above are available this turn");
  });

  it("explains a server-configuration gap instead of telling the user to reconnect", () => {
    const block = buildAskSaltCapabilityBlock(
      capabilitiesFixture({ composioConfigured: false }),
    );

    expect(block).toContain("Connector tools are unavailable on this server");
    expect(block).not.toContain("connected as");
  });

  it("lists workspace-connected apps when Composio API key is missing", () => {
    const block = buildAskSaltCapabilityBlock(
      capabilitiesFixture({
        composioConfigured: false,
        providers: [
          {
            toolkit: "gmail",
            label: "Gmail",
            connected: true,
            email: "me@example.com",
            loadedSlugs: [],
            diagnostic: "integration_api_offline",
          },
        ],
      }),
    );

    expect(block).toContain("ARE connected in the user's workspace");
    expect(block).toContain("Gmail (me@example.com)");
    expect(block).toContain("Never tell the user they have no connected apps");
  });

  it("tells the user to fix permissions when connected but no tools are enabled", () => {
    const block = buildAskSaltCapabilityBlock(
      capabilitiesFixture({
        providers: [
          {
            toolkit: "gmail",
            label: "Gmail",
            connected: true,
            email: "me@example.com",
            loadedSlugs: [],
            diagnostic: "connected_no_tools",
          },
        ],
      }),
    );

    expect(block).toContain("Gmail is connected, but no tools are enabled");
  });
});
