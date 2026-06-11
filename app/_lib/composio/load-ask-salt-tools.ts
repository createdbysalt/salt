import "server-only";

import type { ToolSet } from "ai";
import { getWorkspaceDisabledTools } from "@/app/_features/connectors/queries";
import { getComposioAgentClient } from "./client";
import { getConnectionStatus } from "./connections";
import { isComposioWorkspaceProvider } from "./providers";
import {
  wrapComposioToolsForAskSalt,
  askSaltPreloadSlugsForToolkits,
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
  const connectedToolkits = await getConnectedAskSaltToolkits(workspaceId);
  if (connectedToolkits.length === 0) {
    return {};
  }

  const composio = getComposioAgentClient();
  const [session, disabledTools] = await Promise.all([
    composio.create(workspaceId, {
      toolkits: connectedToolkits,
      preload: { tools: askSaltPreloadSlugsForToolkits(connectedToolkits) },
    }),
    getWorkspaceDisabledTools(workspaceId),
  ]);
  const tools = await session.tools();
  return wrapComposioToolsForAskSalt(tools, {
    disabledTools,
    workspaceId,
    userId: context.userId,
  });
}
