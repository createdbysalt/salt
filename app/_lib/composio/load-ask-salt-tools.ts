import "server-only";

import type { ToolSet } from "ai";
import { getWorkspaceConnectorPolicy } from "@/app/_features/connectors/queries";
import { getComposioAgentClient } from "./client";
import { getConnectionStatus, checkConnectionHealth } from "./connections";
import {
  isRegisteredProvider,
  getAuthConfigId,
} from "./unified-connector-registry";
import {
  wrapComposioToolsForAskSalt,
  ASK_SALT_COMPOSIO_TOOLKITS,
} from "./ask-salt-tools";

export interface AskSaltToolLoadContext {
  /** Auth user chatting with Ask Salt, recorded in the execution audit log. */
  userId?: string;
}

export interface AskSaltComposioToolLoad {
  /** Wrapped, policy-enforced tools ready to hand to the model. */
  tools: ToolSet;
  /** Toolkits with an active workspace connection at load time. */
  connectedToolkits: string[];
  /** Composio connected-account id per connected toolkit (gate execution). */
  connectionIdByToolkit: Record<string, string>;
  /** Composio slugs that passed policy and were preloaded into the session. */
  loadedSlugs: string[];
  /**
   * Set when the Composio session/tool fetch threw. Tools is `{}` in that
   * case even though the toolkit is connected — distinct from "connected but
   * every tool disabled by policy", where loadError is null.
   */
  loadError: string | null;
}

interface ConnectedToolkitStatus {
  connectedToolkits: string[];
  connectionIdByToolkit: Record<string, string>;
}

async function getConnectedToolkitStatuses(
  workspaceId: string,
): Promise<ConnectedToolkitStatus> {
  const statuses = await Promise.all(
    ASK_SALT_COMPOSIO_TOOLKITS.filter((toolkit) => isRegisteredProvider(toolkit)).map(
      async (toolkit) => ({
        toolkit,
        status: await getConnectionStatus(toolkit, workspaceId),
      }),
    ),
  );
  const connected = statuses.filter(({ status }) => status.connected);

  // Run health checks on connected toolkits (logs diagnostics, syncs expired status)
  if (connected.length > 0) {
    const healthChecks = await Promise.all(
      connected.map(async ({ toolkit }) => {
        const health = await checkConnectionHealth(toolkit, workspaceId, { syncStatus: true });
        return { toolkit, health };
      }),
    );

    // Filter out unhealthy connections
    const healthy = healthChecks.filter(({ health }) => health.healthy);
    const unhealthy = healthChecks.filter(({ health }) => !health.healthy);

    if (unhealthy.length > 0) {
      console.warn("[ask-salt] Unhealthy connections detected:", unhealthy.map(({ toolkit, health }) => ({
        toolkit,
        localStatus: health.localStatus,
        remoteStatus: health.remoteStatus,
        diagnostics: health.diagnostics,
      })));
    }

    return {
      connectedToolkits: healthy.map(({ toolkit }) => toolkit),
      connectionIdByToolkit: Object.fromEntries(
        healthy
          .filter(({ health }) => health.composioConnectionId)
          .map(({ toolkit, health }) => [toolkit, health.composioConnectionId as string]),
      ),
    };
  }

  return {
    connectedToolkits: connected.map(({ toolkit }) => toolkit),
    connectionIdByToolkit: Object.fromEntries(
      connected
        .filter(({ status }) => status.composioConnectionId)
        .map(({ toolkit, status }) => [toolkit, status.composioConnectionId as string]),
    ),
  };
}

/**
 * Per-app connectors: only toolkits with an active workspace connection are
 * registered, so Salt never offers tools for apps the user hasn't linked.
 */
export async function getConnectedAskSaltToolkits(workspaceId: string): Promise<string[]> {
  const { connectedToolkits } = await getConnectedToolkitStatuses(workspaceId);
  return connectedToolkits;
}

/**
 * Detailed loader for Ask Salt's Composio tools. Returns the connected
 * toolkits, the slugs that survived policy, and any load error so callers can
 * distinguish "not connected", "connected but every tool disabled", and
 * "connected but the session failed" — instead of all three collapsing to {}.
 */
export async function loadAskSaltComposioToolsDetailed(
  workspaceId: string,
  context: AskSaltToolLoadContext = {},
): Promise<AskSaltComposioToolLoad> {
  const [{ connectedToolkits, connectionIdByToolkit }, connectorPolicy] =
    await Promise.all([
      getConnectedToolkitStatuses(workspaceId),
      getWorkspaceConnectorPolicy(workspaceId),
    ]);
  if (connectedToolkits.length === 0) {
    return {
      tools: {},
      connectedToolkits,
      connectionIdByToolkit,
      loadedSlugs: [],
      loadError: null,
    };
  }

  const policyOptions = {
    disabledTools: connectorPolicy.disabledTools,
    trustByProvider: connectorPolicy.trustByProvider,
    emailModeByProvider: connectorPolicy.emailModeByProvider,
  };

  // No preload whitelist - load ALL tools from connected toolkits.
  // Filtering happens at wrap time via isAskSaltSlugAllowed() which checks:
  // - Tool classification (read/mutating/destructive)
  // - User-disabled tools
  // - Trust level per provider
  // - Email mode restrictions

  try {
    const composio = getComposioAgentClient();
    const authConfigs = Object.fromEntries(
      connectedToolkits
        .map((toolkit) => [toolkit, getAuthConfigId(toolkit)] as const)
        .filter(([, authConfigId]) => authConfigId !== ""),
    );

    // Load ALL tools from connected toolkits - Composio returns everything,
    // filtering happens at wrap time via wrapComposioToolsForAskSalt() which
    // enforces trust level, email mode, disabled tools, and blocks destructive.
    console.log("[ask-salt] creating composio session", {
      workspaceId,
      connectedToolkits,
      authConfigKeys: Object.keys(authConfigs),
    });

    const session = await composio.create(workspaceId, {
      toolkits: connectedToolkits,
      authConfigs,
      preload: { tools: "all" },
    });

    console.log("[ask-salt] session created, fetching tools...");
    const tools = await session.tools();
    console.log("[ask-salt] tools fetched", { toolCount: Object.keys(tools).length });
    // #region agent log
    const rawKeys = Object.keys(tools);
    const googledocsRaw = rawKeys.filter((k) => k.toUpperCase().includes("GOOGLEDOCS"));
    fetch("http://127.0.0.1:7443/ingest/a7cd7781-629e-483f-bcc8-d958046d0b66", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "0970b2" },
      body: JSON.stringify({
        sessionId: "0970b2",
        runId: "pre-fix",
        hypothesisId: "H2-H5",
        location: "app/_lib/composio/load-ask-salt-tools.ts:session.tools",
        message: "Composio raw tool keys before wrap",
        data: {
          rawKeyCount: rawKeys.length,
          googledocsRaw,
          googledocsRawLower: googledocsRaw.map((k) => k.toLowerCase()),
          sampleRawKeys: rawKeys.slice(0, 8),
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    const wrapped = wrapComposioToolsForAskSalt(tools, {
      ...policyOptions,
      workspaceId,
      userId: context.userId,
      connectionIdByToolkit,
    });
    const wrappedKeys = Object.keys(wrapped);
    const gmailTools = wrappedKeys.filter((k) => k.toUpperCase().includes("GMAIL"));
    console.log("[ask-salt] tools wrapped", {
      rawCount: Object.keys(tools).length,
      wrappedCount: wrappedKeys.length,
      gmailTools,
      policyOptions,
    });
    // #region agent log
    const googledocsWrapped = wrappedKeys.filter((k) => k.toUpperCase().includes("GOOGLEDOCS"));
    fetch("http://127.0.0.1:7443/ingest/a7cd7781-629e-483f-bcc8-d958046d0b66", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "0970b2" },
      body: JSON.stringify({
        sessionId: "0970b2",
        runId: "pre-fix",
        hypothesisId: "H2-H3-H5",
        location: "app/_lib/composio/load-ask-salt-tools.ts:wrap",
        message: "Wrapped Composio tool keys after policy",
        data: {
          wrappedKeyCount: wrappedKeys.length,
          googledocsWrapped,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    return {
      tools: wrapped,
      connectedToolkits,
      connectionIdByToolkit,
      loadedSlugs: wrappedKeys,
      loadError: null,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Composio tool load failed";
    const errorDetails = {
      message,
      name: error instanceof Error ? error.name : typeof error,
      stack: error instanceof Error ? error.stack?.split("\n").slice(0, 5) : undefined,
      response: (error as { response?: { status?: number; data?: unknown } })?.response,
      cause: (error as { cause?: unknown })?.cause,
    };
    console.error("[ask-salt] composio tool load failed", errorDetails);
    return {
      tools: {},
      connectedToolkits,
      connectionIdByToolkit,
      loadedSlugs: [],
      loadError: message,
    };
  }
}

/**
 * Per-app connectors: only toolkits with an active workspace connection are
 * registered, so Salt never offers tools for apps the user hasn't linked.
 * Thin wrapper over {@link loadAskSaltComposioToolsDetailed} for callers that
 * only need the ToolSet.
 */
export async function loadAskSaltComposioTools(
  workspaceId: string,
  context: AskSaltToolLoadContext = {},
): Promise<ToolSet> {
  const { tools } = await loadAskSaltComposioToolsDetailed(workspaceId, context);
  return tools;
}
