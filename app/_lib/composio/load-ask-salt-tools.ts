import "server-only";

import type { ToolSet } from "ai";
import { getWorkspaceConnectorPolicy } from "@/app/_features/connectors/queries";
import { getComposioAgentClient } from "./client";
import { getConnectionStatus } from "./connections";
import { getConnectorRegistry } from "./connector-registry";
import {
  wrapComposioToolsForAskSalt,
  askSaltPreloadSlugsForToolkits,
  isAskSaltSlugAllowed,
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
  /** Composio slugs that passed policy and were preloaded into the session. */
  loadedSlugs: string[];
  /**
   * Set when the Composio session/tool fetch threw. Tools is `{}` in that
   * case even though the toolkit is connected — distinct from "connected but
   * every tool disabled by policy", where loadError is null.
   */
  loadError: string | null;
}

/**
 * Per-app connectors: only toolkits with an active workspace connection are
 * registered, so Salt never offers tools for apps the user hasn't linked.
 */
export async function getConnectedAskSaltToolkits(workspaceId: string): Promise<string[]> {
  const registry = await getConnectorRegistry();
  const statuses = await Promise.all(
    ASK_SALT_COMPOSIO_TOOLKITS.filter((toolkit) => registry.has(toolkit)).map(
      async (toolkit) => ({
        toolkit,
        status: await getConnectionStatus(toolkit, workspaceId),
      }),
    ),
  );
  return statuses
    .filter(({ status }) => status.connected)
    .map(({ toolkit }) => toolkit);
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
  const [connectedToolkits, connectorPolicy] = await Promise.all([
    getConnectedAskSaltToolkits(workspaceId),
    getWorkspaceConnectorPolicy(workspaceId),
  ]);
  if (connectedToolkits.length === 0) {
    return { tools: {}, connectedToolkits, loadedSlugs: [], loadError: null };
  }

  const policyOptions = {
    disabledTools: connectorPolicy.disabledTools,
    trustByProvider: connectorPolicy.trustByProvider,
    emailMode: connectorPolicy.emailMode,
  };

  // Apply the registration policy to the preload list too, so excluded tools
  // never even have their schemas loaded into the session.
  const preloadSlugs = askSaltPreloadSlugsForToolkits(connectedToolkits).filter(
    (slug) => isAskSaltSlugAllowed(slug, policyOptions),
  );
  if (preloadSlugs.length === 0) {
    return { tools: {}, connectedToolkits, loadedSlugs: [], loadError: null };
  }

  try {
    const registry = await getConnectorRegistry();
    const composio = getComposioAgentClient();
    const session = await composio.create(workspaceId, {
      toolkits: connectedToolkits,
      authConfigs: Object.fromEntries(
        connectedToolkits
          .map((toolkit) => [toolkit, registry.get(toolkit)?.authConfigId ?? ""] as const)
          .filter(([, authConfigId]) => authConfigId !== ""),
      ),
      preload: { tools: preloadSlugs },
    });
    const tools = await session.tools();
    const wrapped = wrapComposioToolsForAskSalt(tools, {
      ...policyOptions,
      workspaceId,
      userId: context.userId,
    });
    return {
      tools: wrapped,
      connectedToolkits,
      loadedSlugs: Object.keys(wrapped),
      loadError: null,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Composio tool load failed";
    console.error("[ask-salt] composio tool load failed", error);
    return {
      tools: {},
      connectedToolkits,
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
