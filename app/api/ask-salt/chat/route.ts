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
import { buildBillingTools } from "@/app/_features/ask-salt/billing-tools";
import { buildFileTools } from "@/app/_features/ask-salt/file-tools";
import { buildMeTools } from "@/app/_features/ask-salt/me-tools";
import { stripIncompleteToolParts } from "@/app/_features/ask-salt/message-adapters";
import { buildSystemPlayTools } from "@/app/_features/ask-salt/system-play-tools";
import { buildPlaybookTools } from "@/app/_features/ask-salt/playbook-tools";
import {
  resolveAskSaltPlaybooks,
  buildAskSaltPlaybookIndexBlock,
} from "@/app/_features/ask-salt/playbook-index";
import { getAskSaltLanguageModel } from "@/app/_lib/ai/ask-salt-model";
import { assembleOperatorContext } from "@/app/_lib/ai/assembleOperatorContext";
import {
  resolveAskSaltCapabilities,
  buildAskSaltCapabilityBlock,
} from "@/app/_lib/composio/ask-salt-capabilities";
import { logAskSaltCapabilityGaps } from "@/app/_lib/composio/capability-telemetry";
import { reportError } from "@/app/_lib/errors";
import { getTenantContext } from "@/app/_lib/tenancy";
import { requireWorkspaceMember } from "@/app/_lib/tenancy/guards";

export const maxDuration = 60;

const ASK_SALT_SYSTEM = `You are Ask Salt, the command surface for solo service entrepreneurs using Salt.
You help users manage Memory (people, organizations, work, links, notes) and connected tools when those accounts are linked.

Memory (always available):
- Use memory_find_people and memory_find_orgs to resolve real entity IDs before create, update, link, or note actions. Never invent UUIDs.
- Prefer find-before-create: search first, then create only if no match.
- When adding a person, Salt enforces People Records policy: named humans with clear user intent can be created; generic aliases, company/domain-only requests, newsletters, system senders, and suspicious senders should not become people by default.
- If the user asks to add a company/domain or a generic inbox such as billing@, support@, hello@, or info@, prefer memory_create_org or explain that it looks like an organization contact point.
- Never auto-merge people. If a same-name or same-email ambiguity appears, explain the duplicate and wait for confirmation.
- If Salt skips or suggests an org instead of a person, explain the reason plainly.
- Link people to orgs/work/spaces with memory_link_* tools after both IDs are known.
- To add work, call memory_create_work with a name. If the user names an org or person, resolve real IDs with memory_find_orgs / memory_find_people first and pass org_id or person_id when known.
- Salt never hard-deletes entities — archive tools soft-delete and require user approval.

Adding or enriching a person (scan connections, confirm in chat):
- When the user asks to add a person, first call memory_find_people to check for duplicates. Do not call memory_create_person or memory_update_person yet.
- Then scan every connected read tool listed in "Current capabilities" below to enrich the record: search Gmail for threads/signatures (title, org, phone), Calendar for attendee context, Drive/Docs/Sheets for mentions, Stripe for a matching customer (relationship/billing signals). Use only tools that appear in the capability list this turn.
- If connector read tools are unavailable this turn but the capability block lists apps as connected (integration API offline), tell the user their apps ARE connected but live scanning needs a server restart (pnpm dev:op) — never say they have no connected apps. Still search Memory for any existing context.
- Present what you found with sources and proposed field values (name, email, title, organization, relationship_type, phone). Ask the user to confirm or edit. Wait for their explicit yes before writing anything.
- Only after confirmation: memory_create_person (or memory_update_person if they already exist) with confirmed values, then memory_link_person_org, memory_classify_person, or memory_update_person for phone/notes as needed. Conversational yes is enough — memory_create_person runs immediately after the user confirms in chat.
- If no apps are connected or nothing is found, propose creating with what the user provided and still wait for confirmation before writing. Never claim a person was added or updated before a write tool succeeds.

Connected tools:
- Each app is a separate connector — only tools for connected apps are available, and the authoritative list for this turn is in "Current capabilities" below. Trust that list over any assumption.
- Be concise, cite sources when listing emails or events, and never claim an external action was taken without tool results.
- For email: creating a draft (not sending) means this workspace is in draft mode — create the draft and tell the user it's waiting in their drafts. Tools marked "needs approval" pause for the user to confirm before they run.
- Tool failures are user-safe by design: if a tool returns success/queued/found/ok false with an errorId, briefly apologize, say Salt could not complete that step, suggest trying again or contacting support with the reference ID, and never repeat backend details, table names, stack traces, SQL, env var names, or raw tool error text.

Playbooks (Salt's installed know-how):
- Adopted playbooks are listed under "Available playbooks" below. When a request matches one, prefer it over improvising: call load_playbook with its slug, then follow that procedure.
- A playbook's acting steps (sending email, scheduling, payments, etc.) are never run by you directly — call propose_play to queue the play for the user's approval on Plays, then tell them it's waiting there. Reasoning, drafting, and lookups you can do yourself using the available tools.

Billing Memory:
- Use add_billing_record when the user asks Salt to add or track an invoice, bill, receipt, payable, or manual finance record. The tool drafts a Billing Memory record; it does not save until the user taps Add to Billing Memory on the draft card in chat.
- After drafting, point the user to the draft card's Add button. Do not ask them to confirm again in prose unless they want to change something — the card is the confirmation step. Never claim a record was saved until the write succeeds.

Operator memory (about the user):
- When the user tells you something durable about themselves — how they work, their writing voice, preferences, or goals — call remember_about_me to save it. Phrase it as a declarative statement ("User prefers concise replies"), not an instruction.
- Only use it for facts about the user themselves, never for other people or organizations (use memory_* tools for those).

Files Memory:
- Use memory_save_file when the user asks to save, add, store, or file an upload, screenshot, document, or external link in Files Memory.
- For chat attachments, set fileType to file and attachmentIndex to the attachment order (0 for the first file). For URLs, set fileType to link and externalUrl.
- Resolve the connected person, org, or work first with memory_find_people / memory_find_orgs / memory_create_work when the user names someone. Pass personId when known; always include personName.
- Put structured classification in category (brand_asset, deliverable, contract, screenshot, other). Put the user's free-form explanation of what the file is, why it matters, or story/context into description — not into category or the file name.
- The tool drafts the file; it does not save until the user taps Add to Files on the draft card. Never claim a file was saved until that write succeeds.`;

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

function handleAskSaltStreamError(error: unknown): string {
  if (error instanceof Error) {
    if (process.env.NODE_ENV === "development" && error.message.includes("No LLM configured")) {
      return "Ask Salt needs an LLM API key. Use pnpm dev:op (or add OPENROUTER_API_KEY to your env) and restart the dev server.";
    }
    if (process.env.NODE_ENV === "development" && error.message.startsWith("Ask Salt")) {
      return error.message;
    }
  }
  return reportError({
    scope: "ask-salt.stream",
    error,
    action: "while Ask Salt was responding",
  }).userMessage;
}

function missingAskSaltModelResponse(): Response | null {
  try {
    getAskSaltLanguageModel();
    return null;
  } catch (error) {
    if (
      process.env.NODE_ENV === "development" &&
      error instanceof Error &&
      error.message.includes("No LLM configured")
    ) {
      return staticAssistantResponse(
        "Ask Salt needs an LLM API key. Use pnpm dev:op (or add OPENROUTER_API_KEY to your env) and restart the dev server.",
      );
    }

    const report = reportError({
      scope: "ask-salt.model",
      error,
      action: "while starting Ask Salt",
    });
    return staticAssistantResponse(report.userMessage);
  }
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
      const hasFileParts = lastUser.parts.some((part) => part.type === "file");
      if (text || hasFileParts) {
        await appendAskSaltMessage({
          conversationId,
          role: "user",
          content: text || "Shared file(s)",
          metadata: partsToMetadata(lastUser.parts),
        });
      }
    }
  }

  const missingModel = missingAskSaltModelResponse();
  if (missingModel) return missingModel;

  // Single source of truth: connection state + loaded tools + per-provider
  // diagnostics. The capability block makes this authoritative for the model,
  // so it can never contradict the connector UI. Adopted playbooks are the
  // model's "installed skills" — indexed in the prompt, loaded on demand.
  const [capabilities, playbooks, operatorContext] = await Promise.all([
    resolveAskSaltCapabilities(workspace.id, userId),
    resolveAskSaltPlaybooks(workspace.id),
    assembleOperatorContext({ workspaceId: workspace.id, userId }).catch(() => ""),
  ]);
  void logAskSaltCapabilityGaps(workspace.id, capabilities, userId);

  const systemTools = buildSystemPlayTools({ workspaceId: workspace.id, userId });
  const playbookTools = buildPlaybookTools({ workspaceId: workspace.id, userId });
  const billingTools = buildBillingTools({ workspaceId: workspace.id, userId });
  const fileTools = buildFileTools({ workspaceId: workspace.id, userId });
  const meTools = buildMeTools({ workspaceId: workspace.id, userId });
  const tools = {
    ...systemTools,
    ...playbookTools,
    ...billingTools,
    ...fileTools,
    ...meTools,
    ...capabilities.composioTools,
  };

  const systemSections = [
    ASK_SALT_SYSTEM,
    operatorContext,
    buildAskSaltCapabilityBlock(capabilities),
    buildAskSaltPlaybookIndexBlock(playbooks),
  ].filter(Boolean);
  const system = systemSections.join("\n\n");

  const messagesForModel = isApprovalFlow
    ? uiMessages
    : stripIncompleteToolParts(uiMessages);

  const modelMessages = await convertToModelMessages(messagesForModel, {
    ignoreIncompleteToolCalls: true,
    tools,
  });

  const stream = createUIMessageStream({
    originalMessages: isApprovalFlow ? uiMessages : undefined,
    execute: ({ writer: dataStream }) => {
      const result = streamText({
        model: getAskSaltLanguageModel(),
        system,
        messages: modelMessages,
        stopWhen: stepCountIs(12),
        tools,
      });

      dataStream.merge(result.toUIMessageStream());
    },
    generateId,
    onError: handleAskSaltStreamError,
    onFinish: async ({ messages: finishedMessages }) => {
      for (const finished of finishedMessages) {
        if (finished.role !== "assistant") continue;
        const [sanitized] = stripIncompleteToolParts([finished]);
        const message = sanitized ?? finished;
        const text = uiMessageToText(message);
        const hasToolParts = message.parts.some(
          (part) =>
            typeof part.type === "string" &&
            (part.type.startsWith("tool-") || part.type === "dynamic-tool"),
        );
        if (!text && !hasToolParts) continue;

        await appendAskSaltMessage({
          conversationId,
          role: "assistant",
          content: text || "Tool result",
          metadata: partsToMetadata(message.parts),
        });
      }
    },
  });

  return createUIMessageStreamResponse({ stream });
}
