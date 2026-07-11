import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  generateId,
  NoSuchToolError,
  stepCountIs,
  streamText,
  type UIMessage,
} from "ai";
import { appendAskSaltMessage, getAskSaltConversation } from "@/app/_features/ask-salt/actions";
import { buildBillingTools } from "@/app/_features/ask-salt/billing-tools";
import { buildCorrectionTools } from "@/app/_features/ask-salt/correction-tools";
import { buildEnrichmentTools } from "@/app/_features/ask-salt/enrichment-tools";
import { buildFileTools } from "@/app/_features/ask-salt/file-tools";
import { buildMeTools } from "@/app/_features/ask-salt/me-tools";
import { buildMemoryTools } from "@/app/_features/ask-salt/memory-tools";
import {
  askSaltEmptyReplyFallback,
  resolveAskSaltServerStreamError,
} from "@/app/_features/ask-salt/ask-salt-errors";
import { compactAskSaltMessagesForModel, formatEarlierRecapSystemSection } from "@/app/_features/ask-salt/context-budget";
import { stripIncompleteToolParts } from "@/app/_features/ask-salt/message-adapters";
import { buildSystemPlayTools } from "@/app/_features/ask-salt/system-play-tools";
import { buildPlaybookTools } from "@/app/_features/ask-salt/playbook-tools";
import {
  resolveAskSaltPlaybooks,
  resolveAskSaltBlueprints,
  buildAskSaltPlaybookIndexBlock,
} from "@/app/_features/ask-salt/playbook-index";
import { getAskSaltLanguageModel } from "@/app/_lib/ai/ask-salt-model";
import { UNTRUSTED_CONTENT_SYSTEM_SECTION } from "@/app/_lib/ai/safety";
import { assembleOperatorMemoryContext } from "@/app/_lib/ai/assembleOperatorContext";
import {
  resolveAskSaltCapabilities,
  buildAskSaltCapabilityBlock,
} from "@/app/_lib/composio/ask-salt-capabilities";
import { resolveComposioToolName } from "@/app/_lib/composio/ask-salt-tools";
import { logAskSaltCapabilityGaps } from "@/app/_lib/composio/capability-telemetry";
import { reportError } from "@/app/_lib/errors";
import { getTenantContext } from "@/app/_lib/tenancy";
import { requireWorkspaceMember } from "@/app/_lib/tenancy/guards";

export const maxDuration = 60;

const ASK_SALT_SYSTEM = `You are Ask Salt, the command surface for solo service entrepreneurs using Salt.
You help users manage Memory (people, organizations, work, meetings, links, notes) and connected tools when those accounts are linked.

Memory (always available):
- Use memory_find_people and memory_find_orgs to resolve real entity IDs before create, update, link, or note actions. Never invent UUIDs.
- Prefer find-before-create: search first, then create only if no match.
- When adding a person, Salt enforces People Records policy: named humans with clear user intent can be created; generic aliases, company/domain-only requests, newsletters, system senders, and suspicious senders should not become people by default.
- If the user asks to add a company/domain or a generic inbox such as billing@, support@, hello@, or info@, prefer memory_create_org or explain that it looks like an organization contact point.
- Never auto-merge people. If a same-name or same-email ambiguity appears, explain the duplicate and wait for confirmation.
- If Salt skips or suggests an org instead of a person, explain the reason plainly.
- Link people to orgs/work/spaces with memory_link_* tools after both IDs are known. Creating work with person_id sets the primary contact in Overview but does NOT create a Connection — call memory_link_person_work separately to add the connection.
- To add work, call memory_create_work with a name. If the user names an org or person, resolve real IDs with memory_find_orgs / memory_find_people first and pass org_id or person_id when known.
- Salt never hard-deletes entities — archive tools soft-delete and require user approval.

Work and blockers:
- Use memory_add_blocker to add a blocker to existing work when something is blocking progress. Requires work_id and blocker_type (awaiting_reply, asset_pending, payment_pending, approval_pending, dependency, etc.).
- Do NOT create a new work item to represent a blocker — use memory_add_blocker on the existing project instead.
- When creating work with a person, use memory_link_person_work to also add them to the Connections tab (not just the primary contact in Overview).

Meetings (manual scheduling without calendar apps):
- Use memory_find_meetings to search existing meetings by title or person name. Shows upcoming meetings if no query provided.
- Use memory_create_meeting to schedule a meeting with a person. Requires: title, person_id (from memory_find_people), start_time. Optional: end_time (defaults to 30 min), meeting_type (defaults to "other"), location_type (defaults to "google-meet").
- Always resolve the person first with memory_find_people to get a valid person_id before creating a meeting.
- Use ISO datetime format for times (e.g., "2026-07-01T14:00:00Z").

Adding or enriching a person (enrich → confirm → write):
- When the user asks to add a person, first call memory_find_people to check for duplicates. Do not call memory_create_person or memory_update_person yet.
- Then call enrich_entity with entity_type="person" and the person's email (required) and name (if known). This scans all connected apps (Gmail, Calendar, Stripe) in parallel and returns enrichment data:
  * **Identity**: name, email, phone, billing_email, timezone
  * **Role**: title, organization
  * **Relationship**: relationship_type (client, prospect, team, partner, vendor, personal)
  * **Location**: address_line_1, address_line_2, city, state, postal_code, country
  * **Connections**: potential org links, work mentions
  * **Notes**: context from email threads, meeting transcripts
- Present what enrich_entity found with sources and ALL proposed field values. Ask the user to confirm or edit. Wait for their explicit yes before writing anything.
- Only after confirmation: memory_create_person (or memory_update_person if they already exist) with ALL confirmed values. **To link to an org, pass org_id (from memory_find_orgs) or organization_name or domain directly to memory_create_person — it will auto-link.**
- If enrich_entity returns no data (no connected apps or nothing found), propose creating with what the user provided and still wait for confirmation. Never claim a person was added before a write tool succeeds.

Adding or enriching an organization (enrich → confirm → write):
- When the user asks to add an organization, first call memory_find_orgs to check for duplicates.
- Then call enrich_entity with entity_type="org" and the org's domain or name. This scans connected apps for:
  * **Identity**: name, domain, website
  * **Contact**: billing_email
  * **Classification**: industry, estimated_company_size
  * **Location**: address_line_1, address_line_2, city, state, postal_code, country
  * **Notes**: context
- Present all found fields with sources and wait for confirmation before writing.
- After confirmation: memory_create_org (or memory_update_org) with ALL confirmed values.

Adding or enriching work/projects (enrich → confirm → write):
- When the user asks to add work or a project, first resolve person_id and org_id if the user names someone.
- Then call enrich_entity with entity_type="work" and the work name. This scans connected apps for:
  * **Core**: name, description
  * **Type**: work_type (project, retainer, hourly, event)
  * **Timeline**: deadline, start_date, status
  * **Financials**: contract_value_cents, currency, hourly_rate_cents, hours_estimate
  * **Billing**: payment_type, payment_terms, billing_cycle, retainer_mrr_cents, po_number
- Present all found fields with sources and wait for confirmation before writing.
- After confirmation: memory_create_work with ALL confirmed values.

Connected tools:
- Each app is a separate connector — only tools for connected apps are available, and the authoritative list for this turn is in "Current capabilities" below. Trust that list over any assumption.
- Be concise, cite sources when listing emails or events, and never claim an external action was taken without tool results.
- For email: creating a draft (not sending) means this workspace is in draft mode — create the draft and tell the user it's waiting in their drafts. Tools marked "needs approval" pause for the user to confirm before they run.
- Tool failures are user-safe by design: if a tool returns success/queued/found/ok false with an errorId, briefly apologize, say Salt could not complete that step, suggest trying again or contacting support with the reference ID, and never repeat backend details, table names, stack traces, SQL, env var names, or raw tool error text.
- After any tool failure or partial success, you MUST still reply in plain language summarizing what you accomplished and what is still blocked. Never end a turn with only tool steps and no user-facing message.

Playbooks (Salt's installed know-how — MANDATORY routing):
- Adopted playbooks are listed under "Adopted playbooks" below. Available playbooks (not yet enabled) appear under "Available playbooks" with an [enable] marker.
- **ROUTING RULE**: When a user's message matches a playbook's "use when" description, you MUST call load_playbook with its slug as your FIRST action — do not answer ad-hoc, do not chain raw tools, do not improvise. Follow the loaded procedure. This is the same pattern as skill routing in Claude Code.
- If only an available (not-adopted) playbook matches, explain it exists and offer to enable it with adopt_playbook. Do not improvise when a playbook covers the request.
- A playbook's acting steps (sending email, scheduling, payments, etc.) are never run by you directly — call propose_play to queue the play for the user's approval on Plays, then tell them it's waiting there. Reasoning, drafting, and lookups you can do yourself using the available tools.
- Use get_play_run_status to check on queued or recent play runs when the user asks "did that send?" or "what happened with X?"

Billing Memory:
- Use add_billing_record when the user asks Salt to add or track an invoice, bill, receipt, payable, or manual finance record. The tool drafts a Billing Memory record; it does not save until the user taps Add to Billing Memory on the draft card in chat.
- A billing record is linked to EITHER an organization OR a person (not both). Use partyType to specify which: "organization" for companies, "person" for individuals.
- If workName is provided, the billing will link to that project. If omitted and the party has exactly one active project, it auto-links.
- After drafting, point the user to the draft card's Add button. Do not ask them to confirm again in prose unless they want to change something — the card is the confirmation step. Never claim a record was saved until the write succeeds.

Operator memory (about the user):
- When the user tells you something durable about themselves — how they work, their writing voice, preferences, or goals — call remember_about_me to save it. Phrase it as a declarative statement ("User prefers concise replies"), not an instruction.
- Only use it for facts about the user themselves, never for other people or organizations (use remember_about_entity for those).

Entity notes (about people, orgs, work):
- When the user tells you something durable about a person, organization, or work project — preferences, facts, context, relationship info, or flags — call remember_about_entity to save it.
- Examples: "Remember that Jane prefers morning meetings", "Note that Acme always pays late", "The website project is blocked on assets".
- The tool saves the note directly to the entity's Notes tab. Because the user said it, it's saved with high confidence and confirmed immediately.
- Do NOT use this for facts about the user themselves (use remember_about_me instead).

Files Memory:
- Use memory_save_file when the user asks to save, add, store, or file an upload, screenshot, document, or external link in Files Memory.
- For chat attachments, set fileType to file and attachmentIndex to the attachment order (0 for the first file). For URLs, set fileType to link and externalUrl.
- Resolve the connected person, org, or work first with memory_find_people / memory_find_orgs / memory_create_work when the user names someone. Pass personId when known; always include personName.
- Put structured classification in category (brand_asset, deliverable, contract, screenshot, other). Put the user's free-form explanation of what the file is, why it matters, or story/context into description — not into category or the file name.
- The tool drafts the file; it does not save until the user taps Add to Files on the draft card. Never claim a file was saved until that write succeeds.

Corrections (teaching Salt):
- When the user says something Salt learned is wrong — "Jane isn't a client", "that's not right", "you got that wrong" — call correct_previous_action to record their feedback.
- Extract the entity name and their explanation. If they provide a correct value ("she's my accountant"), include it.
- The tool applies a confidence penalty to prevent Salt from repeating the mistake, and may create a memory fact to remember the correction.
- Always acknowledge the correction and confirm what Salt learned from it.
- Corrections can be about any entity (person, org, work) and any field (relationship, role, status, etc.).

Entity type corrections (person vs organization vs work):
- Read earlier messages and tool results in this thread before replying. If memory_create_person, memory_create_org, or memory_create_work already returned success: true, that record exists — never claim it was not created or "not finalized."
- When the user corrects entity type after a successful create, acknowledge what was actually created, create the correct entity if needed, and offer memory_archive_person or memory_archive_org to remove the mistaken record (those archive tools need user approval).
- After memory_create_* succeeds, the chat UI shows a confirmation card automatically. Keep prose to one short sentence — do not repeat details the card already shows.`;

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
  // #region agent log
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorData =
    error && typeof error === "object" && "data" in error
      ? (error as { data?: unknown }).data
      : undefined;
  fetch("http://127.0.0.1:7443/ingest/a7cd7781-629e-483f-bcc8-d958046d0b66", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "366bd6" },
    body: JSON.stringify({
      sessionId: "366bd6",
      runId: "pre-fix",
      hypothesisId: "H1-H5",
      location: "app/api/ask-salt/chat/route.ts:handleAskSaltStreamError",
      message: "Ask Salt stream error",
      data: {
        errorMessage,
        errorName: error instanceof Error ? error.name : typeof error,
        statusCode:
          error && typeof error === "object" && "statusCode" in error
            ? (error as { statusCode?: number }).statusCode
            : undefined,
        hasProviderMetadata: Boolean(errorData),
        isContentFilterSizeError: errorMessage.includes("content filter"),
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

  return resolveAskSaltServerStreamError(error, (streamError) =>
    reportError({
      scope: "ask-salt.stream",
      error: streamError,
      action: "while Ask Salt was responding",
    }),
  );
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
  // Non-adopted blueprints are shown so the model can offer adoption.
  const [capabilities, playbooks, operatorContext] = await Promise.all([
    resolveAskSaltCapabilities(workspace.id, userId),
    resolveAskSaltPlaybooks(workspace.id),
    assembleOperatorMemoryContext({ workspaceId: workspace.id, userId }).catch(() => ""),
  ]);
  void logAskSaltCapabilityGaps(workspace.id, capabilities, userId);

  const adoptedSlugs = playbooks.map((p) => p.slug);
  const blueprints = await resolveAskSaltBlueprints(workspace.id, adoptedSlugs);

  const systemTools = buildSystemPlayTools({ workspaceId: workspace.id, userId });
  const playbookTools = buildPlaybookTools({ workspaceId: workspace.id, userId });
  const billingTools = buildBillingTools({ workspaceId: workspace.id, userId });
  const correctionTools = buildCorrectionTools({ workspaceId: workspace.id, userId });
  const enrichmentTools = buildEnrichmentTools({ workspaceId: workspace.id, userId });
  const fileTools = buildFileTools({ workspaceId: workspace.id, userId });
  const meTools = buildMeTools({ workspaceId: workspace.id, userId });
  const memoryTools = buildMemoryTools({ workspaceId: workspace.id, userId });
  const tools = {
    ...systemTools,
    ...playbookTools,
    ...billingTools,
    ...correctionTools,
    ...enrichmentTools,
    ...fileTools,
    ...meTools,
    ...memoryTools,
    ...capabilities.composioTools,
  };

  // #region agent log
  const allToolKeys = Object.keys(tools);
  const googledocsToolKeys = allToolKeys.filter((k) => k.toUpperCase().includes("GOOGLEDOCS"));
  const googledocsProvider = capabilities.providers.find((p) => p.toolkit === "googledocs");
  fetch("http://127.0.0.1:7443/ingest/a7cd7781-629e-483f-bcc8-d958046d0b66", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "0970b2" },
    body: JSON.stringify({
      sessionId: "0970b2",
      runId: "pre-fix",
      hypothesisId: "H1-H3-H5",
      location: "app/api/ask-salt/chat/route.ts:tools-merge",
      message: "Final Ask Salt tool registry for googledocs",
      data: {
        totalToolCount: allToolKeys.length,
        googledocsToolKeys,
        googledocsDiagnostic: googledocsProvider?.diagnostic ?? null,
        googledocsLoadedSlugs: googledocsProvider?.loadedSlugs ?? [],
        hasLowercaseGoogledocsAlias: allToolKeys.some(
          (k) => k === "googledocs_get_document_by_id",
        ),
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

  const systemSections = [
    ASK_SALT_SYSTEM,
    // Lethal-trifecta defense (5.5.4): connector-fetched content (email
    // bodies, docs, tool results) is untrusted DATA — never instructions.
    // Mutations additionally require an in-thread human tap (needsApproval),
    // so injected content can never steer an action without the user seeing
    // the full argument preview.
    UNTRUSTED_CONTENT_SYSTEM_SECTION,
    operatorContext,
    buildAskSaltCapabilityBlock(capabilities),
    buildAskSaltPlaybookIndexBlock(playbooks, blueprints),
  ].filter(Boolean);

  const strippedMessages = isApprovalFlow
    ? uiMessages
    : stripIncompleteToolParts(uiMessages);
  const contextCompaction = compactAskSaltMessagesForModel(strippedMessages);
  const messagesForModel = contextCompaction.messages;

  if (contextCompaction.earlierRecap) {
    systemSections.push(formatEarlierRecapSystemSection(contextCompaction.earlierRecap));
  }

  const system = systemSections.join("\n\n");

  const modelMessages = await convertToModelMessages(messagesForModel, {
    ignoreIncompleteToolCalls: true,
    tools,
  });

  // #region agent log
  const capabilityBlock = buildAskSaltCapabilityBlock(capabilities);
  const playbookBlock = buildAskSaltPlaybookIndexBlock(playbooks, blueprints);
  const toolsJson = JSON.stringify(tools);
  const modelMessagesJson = JSON.stringify(modelMessages);
  const uiMessagesJson = JSON.stringify(messagesForModel);
  const messageSizes = messagesForModel.map((m, i) => ({
    index: i,
    role: m.role,
    chars: JSON.stringify(m).length,
    toolParts: m.parts.filter(
      (p) =>
        typeof p === "object" &&
        p !== null &&
        "type" in p &&
        typeof (p as { type?: string }).type === "string" &&
        ((p as { type: string }).type.startsWith("tool-") ||
          (p as { type: string }).type === "dynamic-tool"),
    ).length,
  }));
  const largestMessage = messageSizes.reduce(
    (max, m) => (m.chars > max.chars ? m : max),
    { index: -1, role: "none", chars: 0, toolParts: 0 },
  );
  fetch("http://127.0.0.1:7443/ingest/a7cd7781-629e-483f-bcc8-d958046d0b66", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "366bd6" },
    body: JSON.stringify({
      sessionId: "366bd6",
      runId: "post-fix",
      hypothesisId: "H1-H5",
      location: "app/api/ask-salt/chat/route.ts:pre-streamText",
      message: "Ask Salt request payload sizes",
      data: {
        model: process.env.AI_MODEL_ASK_SALT ?? "google/gemini-3.5-flash",
        toolCount: Object.keys(tools).length,
        toolsChars: toolsJson.length,
        systemChars: system.length,
        operatorContextChars: operatorContext.length,
        capabilityBlockChars: capabilityBlock.length,
        playbookBlockChars: playbookBlock.length,
        modelMessagesChars: modelMessagesJson.length,
        uiMessagesChars: uiMessagesJson.length,
        uiMessageCount: messagesForModel.length,
        estimatedTotalChars:
          system.length + modelMessagesJson.length + toolsJson.length,
        contextCompacted: contextCompaction.compacted,
        omittedOlderToolParts: contextCompaction.omittedOlderToolParts,
        rolledOlderMessages: contextCompaction.rolledOlderMessages,
        hasEarlierRecap: Boolean(contextCompaction.earlierRecap),
        compactedMessagesChars: contextCompaction.messagesChars,
        largestMessage,
        topMessageSizes: [...messageSizes].sort((a, b) => b.chars - a.chars).slice(0, 5),
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

  const stream = createUIMessageStream({
    originalMessages: isApprovalFlow ? uiMessages : undefined,
    execute: ({ writer: dataStream }) => {
      const result = streamText({
        model: getAskSaltLanguageModel(),
        system,
        messages: modelMessages,
        stopWhen: stepCountIs(12),
        tools,
        experimental_repairToolCall: async ({ toolCall, tools: activeTools, error }) => {
          if (!NoSuchToolError.isInstance(error)) return null;
          const canonical = resolveComposioToolName(toolCall.toolName, activeTools);
          if (!canonical) return null;
          // #region agent log
          fetch("http://127.0.0.1:7443/ingest/a7cd7781-629e-483f-bcc8-d958046d0b66", {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "0970b2" },
            body: JSON.stringify({
              sessionId: "0970b2",
              runId: "post-fix",
              hypothesisId: "H1-H5",
              location: "app/api/ask-salt/chat/route.ts:repairToolCall",
              message: "Repaired mismatched Composio tool name",
              data: { from: toolCall.toolName, to: canonical },
              timestamp: Date.now(),
            }),
          }).catch(() => {});
          // #endregion
          return { ...toolCall, toolName: canonical };
        },
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
        // #region agent log
        const failedToolParts = message.parts
          .filter(
            (part) =>
              typeof part === "object" &&
              part !== null &&
              "state" in part &&
              (part as { state?: string }).state === "output-error",
          )
          .map((part) => {
            const p = part as {
              toolName?: string;
              type?: string;
              errorText?: string;
            };
            return {
              toolName: p.toolName ?? (p.type?.startsWith("tool-") ? p.type.slice(5) : p.type),
              errorText: p.errorText?.slice(0, 300),
            };
          });
        if (failedToolParts.length > 0) {
          fetch("http://127.0.0.1:7443/ingest/a7cd7781-629e-483f-bcc8-d958046d0b66", {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "0970b2" },
            body: JSON.stringify({
              sessionId: "0970b2",
              runId: "pre-fix",
              hypothesisId: "H1-H4-H5",
              location: "app/api/ask-salt/chat/route.ts:onFinish",
              message: "Ask Salt tool call failures",
              data: { failedToolParts },
              timestamp: Date.now(),
            }),
          }).catch(() => {});
        }
        // #endregion

        const toolLikeParts = message.parts.filter(
          (part) =>
            typeof part === "object" &&
            part !== null &&
            typeof (part as { type?: string }).type === "string" &&
            ((part as { type: string }).type.startsWith("tool-") ||
              (part as { type: string }).type === "dynamic-tool"),
        ) as Array<{ state?: string }>;

        const fallbackText = !text ? askSaltEmptyReplyFallback(toolLikeParts) : null;
        const partsToSave = fallbackText
          ? [...message.parts, { type: "text" as const, text: fallbackText }]
          : message.parts;

        if (!text && !hasToolParts && !fallbackText) continue;

        await appendAskSaltMessage({
          conversationId,
          role: "assistant",
          content: text || fallbackText || "Tool result",
          metadata: partsToMetadata(partsToSave),
        });
      }
    },
  });

  return createUIMessageStreamResponse({ stream });
}
