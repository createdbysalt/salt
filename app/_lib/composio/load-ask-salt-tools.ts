import "server-only";

import type { ToolSet } from "ai";
import { getWorkspaceDisabledTools } from "@/app/_features/connectors/queries";
import { getComposioAgentClient } from "./client";
import {
  wrapComposioToolsForAskSalt,
  ASK_SALT_COMPOSIO_TOOLKITS,
  ASK_SALT_PRELOAD_TOOL_SLUGS,
} from "./ask-salt-tools";

export interface AskSaltToolLoadContext {
  /** Auth user chatting with Ask Salt, recorded in the execution audit log. */
  userId?: string;
}

export async function loadAskSaltComposioTools(
  workspaceId: string,
  context: AskSaltToolLoadContext = {},
): Promise<ToolSet> {
  const composio = getComposioAgentClient();
  const [session, disabledTools] = await Promise.all([
    composio.create(workspaceId, {
      toolkits: [...ASK_SALT_COMPOSIO_TOOLKITS],
      preload: { tools: [...ASK_SALT_PRELOAD_TOOL_SLUGS] },
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
