"use server";

import { appendAskSaltMessage } from "./actions";
import {
  buildConnectCatalogTurn,
  buildConnectionStatusTurn,
  handleConnectIntent,
  handleDisconnectIntent,
} from "./connect-handlers";
import {
  classifyAskSaltIntent,
  isConnectorIntent,
  resolveConnectorTarget,
} from "./router";
import type { AskSaltConnectorTurnResult } from "./types";

export type SubmitConnectorIntentResult =
  | { ok: true; data: AskSaltConnectorTurnResult }
  | { ok: false; errorCode: string; message: string };

export async function submitConnectorIntent(input: {
  conversationId: string;
  prompt: string;
}): Promise<SubmitConnectorIntentResult> {
  const prompt = input.prompt.trim();
  if (!prompt) {
    return { ok: false, errorCode: "VALIDATION", message: "Prompt cannot be empty" };
  }

  const intent = classifyAskSaltIntent(prompt);
  if (!isConnectorIntent(intent)) {
    return { ok: false, errorCode: "NOT_CONNECTOR", message: "Not a connector intent" };
  }

  const userAppend = await appendAskSaltMessage({
    conversationId: input.conversationId,
    role: "user",
    content: prompt,
    metadata: { parts: [{ type: "text", text: prompt }] },
  });
  if (!userAppend.ok) {
    return { ok: false, errorCode: userAppend.errorCode, message: userAppend.message };
  }

  let turn: AskSaltConnectorTurnResult;

  if (intent === "connect_catalog") {
    turn = await buildConnectCatalogTurn();
  } else if (intent === "connector_status") {
    turn = await buildConnectionStatusTurn();
  } else if (intent === "connector_disconnect") {
    const target = resolveConnectorTarget(prompt);
    turn = await handleDisconnectIntent(target);
  } else {
    const target = resolveConnectorTarget(prompt);
    turn = await handleConnectIntent(target);
  }

  const assistantAppend = await appendAskSaltMessage({
    conversationId: input.conversationId,
    role: "assistant",
    content: turn.assistantMessage,
    metadata: {
      kind: "connector",
      parts: [{ type: "text", text: turn.assistantMessage }],
      inlineAction: turn.inlineAction ?? null,
      showBrowseConnectors: turn.showBrowseConnectors ?? false,
      suggestions: turn.suggestions ?? [],
    },
  });

  if (!assistantAppend.ok) {
    return {
      ok: false,
      errorCode: assistantAppend.errorCode,
      message: assistantAppend.message,
    };
  }

  return { ok: true, data: turn };
}
