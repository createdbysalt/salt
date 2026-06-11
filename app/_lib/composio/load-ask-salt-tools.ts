import "server-only";

import type { ToolSet } from "ai";
import { getWorkspaceConnectorPolicy } from "@/app/_features/connectors/queries";
import { getComposioAgentClient } from "./client";
import { getConnectionStatus } from "./connections";
import { isComposioWorkspaceProvider } from "./providers";
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

/**
 * Per-app connectors: only toolkits with an active workspace connection are
 * registered, so Salt never offers tools for apps the user hasn't linked.
 */
async function getConnectedAskSaltToolkits(workspaceId: string): Promise<string[]> {
  const statuses = await Promise.all(
    ASK_SALT_COMPOSIO_TOOLKITS.filter(isComposioWorkspaceProvider).map(
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

export async function loadAskSaltComposioTools(
  workspaceId: string,
  context: AskSaltToolLoadContext = {},
): Promise<ToolSet> {
  const [connectedToolkits, connectorPolicy] = await Promise.all([
    getConnectedAskSaltToolkits(workspaceId),
    getWorkspaceConnectorPolicy(workspaceId),
  ]);
  if (connectedToolkits.length === 0) {
    return {};
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
    return {};
  }

  const composio = getComposioAgentClient();
  const session = await composio.create(workspaceId, {
    toolkits: connectedToolkits,
    preload: { tools: preloadSlugs },
  });
  const tools = await session.tools();
  return wrapComposioToolsForAskSalt(tools, {
    ...policyOptions,
    workspaceId,
    userId: context.userId,
  });
}
