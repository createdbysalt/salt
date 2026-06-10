import "server-only";

import { anthropic } from "@ai-sdk/anthropic";
import { stepCountIs, streamText, type StreamTextResult, type ToolSet } from "ai";
import { getComposioAgentClient } from "./client";

export interface ComposioAgentStreamParams {
  /** Composio user id — Salt uses the workspace id. */
  userId: string;
  prompt: string;
  maxSteps?: number;
  toolkits?: string[];
}

/**
 * Composio Tool Router + Vercel AI SDK agent stream.
 *
 * Canonical pattern: https://docs.composio.dev (Vercel AI SDK getting started)
 * - `Composio({ provider: new VercelProvider() })`
 * - `composio.create(userId)` → `session.tools()` → `streamText({ tools })`
 *
 * Salt uses workspace id as Composio `userId`. Requires `COMPOSIO_API_KEY` + `ANTHROPIC_API_KEY`.
 */
export async function streamComposioAgent(
  params: ComposioAgentStreamParams,
): Promise<StreamTextResult<ToolSet, never>> {
  const composio = getComposioAgentClient();

  const session = await composio.create(
    params.userId,
    params.toolkits?.length ? { toolkits: params.toolkits } : undefined,
  );
  const tools = await session.tools();

  return streamText({
    model: anthropic("claude-sonnet-4-6"),
    prompt: params.prompt,
    stopWhen: stepCountIs(params.maxSteps ?? 10),
    tools,
  });
}
