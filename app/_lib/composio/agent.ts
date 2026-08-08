import "server-only";

import { stepCountIs, streamText, type StreamTextResult, type ToolSet } from "ai";
import { getAskSaltLanguageModel } from "@/app/_lib/ai/ask-salt-model";
import { loadAskSaltComposioTools } from "./load-ask-salt-tools";

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
 * Salt uses workspace id as Composio `userId`. Requires `COMPOSIO_API_KEY` + LLM keys.
 */
export async function streamComposioAgent(
  params: ComposioAgentStreamParams,
): Promise<StreamTextResult<ToolSet, never>> {
  const tools = await loadAskSaltComposioTools(params.userId);

  return streamText({
    model: getAskSaltLanguageModel(),
    prompt: params.prompt,
    stopWhen: stepCountIs(params.maxSteps ?? 10),
    tools,
  });
}
