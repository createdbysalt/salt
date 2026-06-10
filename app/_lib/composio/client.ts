import "server-only";

import { Composio } from "@composio/core";
import { VercelProvider } from "@composio/vercel";

let composioClient: Composio | undefined;
let composioAgentClient: Composio<VercelProvider> | undefined;

function getApiKey(): string {
  const apiKey = process.env.COMPOSIO_API_KEY;
  if (!apiKey) {
    throw new Error("COMPOSIO_API_KEY is not set");
  }
  return apiKey;
}

/** Composio v3 client for connections, tool execution, and account management. */
export function getComposioClient(): Composio {
  if (!composioClient) {
    composioClient = new Composio({ apiKey: getApiKey() });
  }
  return composioClient;
}

/** Composio + Vercel AI SDK provider for agentic tool calling (`streamText`, etc.). */
export function getComposioAgentClient(): Composio<VercelProvider> {
  if (!composioAgentClient) {
    composioAgentClient = new Composio({
      apiKey: getApiKey(),
      provider: new VercelProvider(),
    });
  }
  return composioAgentClient;
}
