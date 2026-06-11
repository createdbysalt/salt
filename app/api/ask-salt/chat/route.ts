import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  generateId,
  stepCountIs,
  streamText,
  type UIMessage,
} from "ai";
import { appendAskSaltMessage, getAskSaltConversation } from "@/app/_features/ask-salt/actions";
import { handleConnectIntent } from "@/app/_features/ask-salt/connect-handlers";
import { getAskSaltLanguageModel } from "@/app/_lib/ai/ask-salt-model";
import { getConnectionStatus, isComposioConfigured } from "@/app/_lib/composio/connections";
import { loadAskSaltComposioTools } from "@/app/_lib/composio/load-ask-salt-tools";
import { getTenantContext } from "@/app/_lib/tenancy";
import { requireWorkspaceMember } from "@/app/_lib/tenancy/guards";

export const maxDuration = 60;

const ASK_SALT_SYSTEM = `You are Ask Salt, the command surface for solo service entrepreneurs using Salt.
You help users work with connected tools (Gmail, Google Calendar) when those accounts are linked.
Gmail and Google Calendar are separate connectors — only tools for connected apps are available.
Be concise, cite sources when listing emails or events, and never claim an external action was taken without tool results.
If a needed app is not connected, tell the user to say "Connect Gmail" or "Connect Google Calendar" — Salt will show an inline connect button in the chat.
If you can create email drafts but not send, this workspace is in draft mode: create the draft and tell the user it's waiting in their Gmail drafts.
If you have read tools but no action tools for an app, the connector is set to read-only — the user can change permissions in the connector's settings.`;

type AskSaltChatRequest = {
  id: string;
  messages?: UIMessage[];
  message?: UIMessage;
  trigger?: string;
  messageId?: string;
};

function uiMessageToText(message: UIMessage): string {
  return message.parts
    .filter((part): part is { type: "text"; text: string } => part.type === "text")
    .map((part) => part.text)
    .join("\n")
    .trim();
}

function partsToMetadata(parts: UIMessage["parts"]): Record<string, unknown> {
  return { parts, kind: "chat" };
}

function isApprovalContinuation(messages: UIMessage[]): boolean {
  return messages.some((message) =>
    message.parts.some((part) => {
      if (typeof part !== "object" || part === null || !("state" in part)) {
        return false;
      }
      const state = (part as { state?: string }).state;
      return state === "approval-responded" || state === "output-denied";
    }),
  );
}

/**
 * Stream a fixed assistant message using the full UI message chunk protocol.
 * A bare text-delta is not enough — useChat only assembles a message from a
 * complete start → text-start → text-delta → text-end → finish sequence.
 * Optional metadata lands on the UIMessage (inline connect, suggestions).
 */
function staticAssistantResponse(text: string, metadata?: Record<string, unknown>) {
  const stream = createUIMessageStream({
    execute: ({ writer }) => {
      const id = generateId();
      writer.write({ type: "start" });
      if (metadata) {
        writer.write({ type: "message-metadata", messageMetadata: metadata });
      }
      writer.write({ type: "text-start", id });
      writer.write({ type: "text-delta", id, delta: text });
      writer.write({ type: "text-end", id });
      writer.write({ type: "finish" });
    },
  });
  return createUIMessageStreamResponse({ stream });
}

async function googleIsConnected(workspaceId: string): Promise<boolean> {
  const [gmail, calendar] = await Promise.all([
    getConnectionStatus("gmail", workspaceId),
    getConnectionStatus("googlecalendar", workspaceId),
  ]);
  return gmail.connected || calendar.connected;
}

export async function POST(request: Request) {
  let body: AskSaltChatRequest;
  try {
    body = (await request.json()) as AskSaltChatRequest;
  } catch {
    return new Response("Invalid request body", { status: 400 });
  }

  const { context } = await getTenantContext();
  const workspace = requireWorkspaceMember(context);
  const userId = context.userId;
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const conversationId = body.id;
  if (!conversationId) {
    return new Response("Conversation id required", { status: 400 });
  }

  const conversationResult = await getAskSaltConversation(conversationId);
  if (!conversationResult.ok) {
    return new Response(conversationResult.message, { status: 404 });
  }

  const uiMessages = body.messages ?? (body.message ? [body.message] : []);
  const isApprovalFlow = isApprovalContinuation(uiMessages);

  if (!isApprovalFlow && body.trigger === "submit-message") {
    const lastUser = [...uiMessages].reverse().find((m) => m.role === "user");
    if (lastUser) {
      const text = uiMessageToText(lastUser);
      if (text) {
        await appendAskSaltMessage({
          conversationId,
          role: "user",
          content: text,
          metadata: partsToMetadata(lastUser.parts),
        });
      }
    }
  }

  if (!isComposioConfigured()) {
    return staticAssistantResponse(
      "Composio is not configured in this environment. Add COMPOSIO_API_KEY to enable Gmail and Calendar tools.",
    );
  }

  const connected = await googleIsConnected(workspace.id);
  if (!connected && !isApprovalFlow) {
    // Render a real connector turn — inline Connect button + clickable
    // options in the thread — instead of prose telling the user what to type.
    const turn = await handleConnectIntent("google");
    const connectorMetadata = {
      kind: "connector",
      inlineAction: turn.inlineAction ?? null,
      showBrowseConnectors: turn.showBrowseConnectors ?? false,
      suggestions: turn.suggestions ?? [],
    };
    await appendAskSaltMessage({
      conversationId,
      role: "assistant",
      content: turn.assistantMessage,
      metadata: {
        ...connectorMetadata,
        parts: [{ type: "text", text: turn.assistantMessage }],
      },
    });
    return staticAssistantResponse(turn.assistantMessage, connectorMetadata);
  }

  const modelMessages = await convertToModelMessages(uiMessages);
  const tools = await loadAskSaltComposioTools(workspace.id, { userId });

  const stream = createUIMessageStream({
    originalMessages: isApprovalFlow ? uiMessages : undefined,
    execute: ({ writer: dataStream }) => {
      const result = streamText({
        model: getAskSaltLanguageModel(),
        system: ASK_SALT_SYSTEM,
        messages: modelMessages,
        stopWhen: stepCountIs(8),
        tools,
      });

      dataStream.merge(result.toUIMessageStream());
    },
    generateId,
    onFinish: async ({ messages: finishedMessages }) => {
      for (const finished of finishedMessages) {
        if (finished.role !== "assistant") continue;
        const text = uiMessageToText(finished);
        const hasToolParts = finished.parts.some(
          (part) =>
            typeof part.type === "string" &&
            (part.type.startsWith("tool-") || part.type === "dynamic-tool"),
        );
        if (!text && !hasToolParts) continue;

        await appendAskSaltMessage({
          conversationId,
          role: "assistant",
          content: text || "Tool result",
          metadata: partsToMetadata(finished.parts),
        });
      }
    },
  });

  return createUIMessageStreamResponse({ stream });
}
