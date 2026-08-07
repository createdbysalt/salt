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
import { buildWatchingTools } from "@/app/_features/ask-salt/watching-tools";
import { buildIntakeTools } from "@/app/_features/ask-salt/intake-tools";
import {
  askSaltEmptyReplyFallback,
  resolveAskSaltServerStreamError,
} from "@/app/_features/ask-salt/ask-salt-errors";
import { compactAskSaltMessagesForModel, formatEarlierRecapSystemSection } from "@/app/_features/ask-salt/context-budget";
import { stripIncompleteToolParts } from "@/app/_features/ask-salt/message-adapters";
import { buildSystemPlayTools } from "@/app/_features/ask-salt/system-play-tools";
import { buildPlaybookTools } from "@/app/_features/ask-salt/playbook-tools";
import { buildCaptureReviewTools } from "@/app/_features/ask-salt/capture-review-tools";
import {
  loadCaptureReviewContext,
  formatCaptureContextForPrompt,
} from "@/app/_features/ask-salt/capture-review-context";
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
import {
  checkAskSaltAllowance,
  recordAskSaltUsage,
  type AskSaltAllowance,
} from "@/app/_lib/usage/ask-salt-usage";
import { canSpend, isBlocked, shouldDegrade } from "@/app/_lib/usage/can-spend";

export const maxDuration = 60;

const ASK_SALT_DEMO_MODE_INSTRUCTION = `
## DEMO MODE ACTIVE

You are in demo mode for presentations. When the user asks you to perform ANY action (send emails, create invoices, search Gmail, schedule meetings, etc.):

1. **Act as if you have full access to all tools** — Gmail, Google Calendar, Stripe, Slack, etc.
2. **Describe completing the action convincingly** — "Done! I've drafted that email to Sarah..." or "I found 3 matching emails from last week..."
3. **Make up realistic, plausible details** — names, dates, amounts that fit the context
4. **Never say you can't do something** or that a connector isn't connected
5. **Never actually call external tools** — just describe what you "did"

The goal is to demonstrate Salt's vision. Be helpful, confident, and make the demo impressive.
`;

const ASK_SALT_SYSTEM = `You are Ask Salt, the command surface for solo service entrepreneurs using Salt.
You help users manage Memory (people, organizations, work, meetings, links, notes) and connected tools when those accounts are linked.

Memory Care intake (MANDATORY when adding records — NOT a playbook):
- When the user asks to add/create/log people, orgs, work, billing, files, or meetings, call load_memory_intake FIRST, then follow chat.procedureSteps / procedureMd from the result. Never call propose_play for Memory creates.
- Call parse_intake with the user's message IMMEDIATELY after load_memory_intake — before any memory_find_* or memory_create_*. Do not guess entities manually when parse_intake is available.
- If parse_intake returns isMultiEntity: true, create EVERY entity in creationOrder (e.g. person + work for "add Jane Example, working on a project for her"). Do not stop after the first create.
- **Enrichment is mandatory before creates**: call enrich_entity for each parsed entity in parallel (scans connected apps per chat.enrichmentCategories). Pass the entity name from parse_intake (e.g. name: "Jane Example"). When enrich_entity returns foundData: false, create with name only — never invent phone, email, title, org, or relationship.
- **Explicit add/create/log IS authorization** when chat.explicitIntentAuthorizesCreate is true — create records after duplicate checks + enrichment; do not ask "would you like me to create" again.
- Create in tier order from parse_intake. Link with memory_link_* when person + work/org were created together. Call add_to_watching for watch_when_missing fields from parse_intake.
- Only pause for confirmation when: duplicate ambiguity (same name/email), or the user did not express create intent.

Memory tools (when no Memory Care intake loaded, or alongside it):
- Use memory_find_people, memory_find_orgs, and memory_find_work to resolve real entity IDs before create, update, link, or note actions. Never invent UUIDs.
- Prefer find-before-create: search first, then create only if no match.
- When adding a person, Salt enforces People Records policy: named humans with clear user intent can be created; generic aliases, company/domain-only requests, newsletters, system senders, and suspicious senders should not become people by default.
- If the user asks to add a company/domain or a generic inbox such as billing@, support@, hello@, or info@, prefer memory_create_org or explain that it looks like an organization contact point.
- Never auto-merge people. If a same-name or same-email ambiguity appears, explain the duplicate and wait for confirmation.
- If Salt skips or suggests an org instead of a person, explain the reason plainly.
- Link people to orgs/work/spaces with memory_link_* tools after both IDs are known. Creating work with person_id sets the primary contact in Overview but does NOT create a Connection — call memory_link_person_work separately to add the connection.
- To add work, call memory_create_work with a name. If the user names an org or person, resolve real IDs with memory_find_orgs / memory_find_people first and pass org_id or person_id when known.
- Salt never hard-deletes entities — archive tools soft-delete and require user approval.

Work and blockers:
- Use memory_find_work to search for existing projects before creating new ones. This returns work_id, name, status, and linked person/org.
- Use memory_add_blocker to add a blocker to existing work when something is blocking progress. Requires work_id and blocker_type (awaiting_reply, asset_pending, payment_pending, approval_pending, dependency, etc.).
- Do NOT create a new work item to represent a blocker — use memory_add_blocker on the existing project instead.
- When creating work with a person, use memory_link_person_work to also add them to the Connections tab (not just the primary contact in Overview).

Meetings (manual scheduling without calendar apps):
- Use memory_find_meetings to search existing meetings by title or person name. Shows upcoming meetings if no query provided.
- Use memory_create_meeting to schedule a meeting with a person. Requires: title, person_id (from memory_find_people), start_time. Optional: end_time (defaults to 30 min), meeting_type (defaults to "other"), location_type (defaults to "google-meet").
- Always resolve the person first with memory_find_people to get a valid person_id before creating a meeting.
- Use ISO datetime format for times (e.g., "2026-07-01T14:00:00Z").

Watching for missing data (after Memory Care intake creates):
- Call add_to_watching when parse_intake or enrichment leaves critical fields empty (email, phone, org link, domain, deadline, etc.).

Connected tools:
- The "Current capabilities" section below is the AUTHORITATIVE source for what tools are available and how to use them. Follow its instructions exactly.
- **DIRECT EXECUTION**: When the user asks to perform a connector action (send email, create event, etc.) OUTSIDE of a playbook flow, call the tool directly. These tools execute immediately when the user approves them in chat — do NOT use propose_play for direct user requests.
- propose_play is ONLY for playbook-orchestrated automation, not for direct user commands in chat.
- Be concise, cite sources when listing emails or events, and never claim an external action was taken without tool results.
- Tools marked "needs approval" pause for the user to confirm before they run.
- Tool failures are user-safe by design: if a tool returns success/queued/found/ok false with an errorId, briefly apologize, say Salt could not complete that step, suggest trying again or contacting support with the reference ID, and never repeat backend details, table names, stack traces, SQL, env var names, or raw tool error text.
- After any tool failure or partial success, you MUST still reply in plain language summarizing what you accomplished and what is still blocked. Never end a turn with only tool steps and no user-facing message.

Playbooks (Salt's installed know-how — MANDATORY routing):
- Adopted playbooks are listed under "Adopted playbooks" below. Available playbooks (not yet enabled) appear under "Available playbooks" with an [enable] marker.
- **ROUTING RULE**: When a user's message matches a playbook's "use when" description, call load_playbook with its slug as your FIRST action — do not answer ad-hoc, do not chain raw tools, do not improvise. Follow chat.procedureSteps from load_playbook.
- For **inline** playbooks (chat.execution: inline): run parse_intake → enrich_entity → memory writes in chat per procedure.
- For **queue** playbooks (chat.execution: queue): enrich and draft in chat, then call propose_play for external actions (email send, calendar, payments).
- If only an available (not-adopted) playbook matches, explain it exists and offer to enable it with adopt_playbook. Do not improvise when a playbook covers the request.
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

Resources:
- Use memory_save_file when the user asks to save, add, store, or file an upload, screenshot, document, or external link in Resources.
- Resources come in two modes: Static (just a link/file reference) and Live (Salt monitors for activity like commits, file changes, comments).
- For chat attachments, set fileType to file and attachmentIndex to the attachment order (0 for the first file). For URLs, set fileType to link and externalUrl.
- Auto-detect resourceType from URLs: github_repo, github_pr, figma_file, linear_issue, gdrive_doc, slack_channel, etc. Default to "url" for unrecognized links.
- Set mode to "live" only for supported resource types when the user wants Salt to monitor activity (e.g., "track commits", "watch for changes").
- Resolve the connected person, org, or work first with memory_find_people / memory_find_orgs / memory_find_work when the user names someone. Pass personId when known.
- Put structured classification in category (brand_asset, deliverable, contract, screenshot, other). Put the user's free-form explanation of what the resource is, why it matters, or story/context into description.
- The tool drafts the resource; it does not save until the user taps Add to Resources on the draft card. Never claim a resource was saved until that write succeeds.

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
  captureId?: string;
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

  return resolveAskSaltServerStreamError(error, (streamError) =>
    reportError({
      scope: "ask-salt.stream",
      error: streamError,
      action: "while Ask Salt was responding",
    }),
  );
}

/**
 * Fair-use ceiling reached (pricing G2).
 *
 * 429 with `Retry-After` rather than a synthesized assistant message: this is a
 * transport-level refusal, and dressing it up as a model reply would put words
 * in Salt's mouth that no model produced. The copy states the limit and when it
 * lifts, because a cap the user cannot see the shape of reads as a fault.
 *
 * The message must begin with "Ask Salt" — `isSaltUserFacingMessage` uses that
 * prefix to pass copy through untouched. Without it the text falls to
 * `sanitizeProviderErrorForUser`'s length heuristic, which replaces anything
 * over 200 characters with a generic apology, and the user is told "something
 * went wrong" when nothing did.
 */
function askSaltFairUseResponse(allowance: AskSaltAllowance): Response {
  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((new Date(allowance.resetAt).getTime() - Date.now()) / 1000),
  );

  return new Response(
    `Ask Salt has reached this workspace's fair-use limit of ${allowance.limit} messages a day. ` +
      "It frees up as earlier messages age out — the first slot opens in about " +
      `${Math.max(1, Math.round(retryAfterSeconds / 60))} minutes. ` +
      "Captures, Memory, and plays are unaffected.",
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSeconds),
        "X-RateLimit-Limit": String(allowance.limit),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": allowance.resetAt,
      },
    },
  );
}

/**
 * Over budget for the billing period (pricing G7).
 *
 * Distinct from fair use above: waiting does not help, so there is no
 * `Retry-After`. 402 says the resolution is commercial — upgrade or enable
 * overage — which is exactly the situation.
 */
function askSaltOverBudgetResponse(): Response {
  return new Response(
    "Ask Salt is paused for this workspace: usage for this billing period has " +
      "exceeded what the current plan covers. Upgrade your plan or turn on " +
      "overage in Billing to resume. Captures, Memory, and approved plays " +
      "keep running.",
    { status: 402 },
  );
}

/**
 * Steps allowed in one turn when the workspace is over the degrade threshold.
 *
 * Ask Salt already runs the cheapest model Salt routes to, so swapping model
 * class buys nothing here. Step count is the lever this surface actually owns:
 * `stepCountIs(12)` means one message can be twelve model round-trips, each
 * able to call tools, so the cap is what bounds a turn's cost. Five is enough
 * for the common find → act → summarize shape while removing the long tail.
 */
const DEGRADED_MAX_STEPS = 5;
const NORMAL_MAX_STEPS = 12;

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

  // Before any downstream work. A turn can run twelve model steps plus tool
  // calls, and the context assembly below is itself several queries, so an
  // over-limit workspace is cheapest to turn away here.
  const allowance = await checkAskSaltAllowance(workspace.id);
  if (!allowance.allowed) {
    return askSaltFairUseResponse(allowance);
  }

  // Fair use counts turns; this weighs what they cost. A workspace can sit well
  // inside its message allowance and still be unprofitable, because a turn with
  // twelve tool-calling steps costs orders of magnitude more than a one-line
  // answer. Both checks are needed and neither implies the other.
  const budget = await canSpend({
    workspaceId: workspace.id,
    kind: "llm_tokens",
    origin: "user",
  });
  if (isBlocked(budget)) {
    return askSaltOverBudgetResponse();
  }
  const maxSteps = shouldDegrade(budget) ? DEGRADED_MAX_STEPS : NORMAL_MAX_STEPS;

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
  const watchingTools = buildWatchingTools({ workspaceId: workspace.id, userId });
  const intakeTools = buildIntakeTools();

  const captureReviewTools = body.captureId
    ? buildCaptureReviewTools({
        workspaceId: workspace.id,
        userId,
        captureId: body.captureId,
      })
    : {};

  const captureContext = body.captureId
    ? await loadCaptureReviewContext(body.captureId, workspace.id)
    : null;

  const tools = {
    ...systemTools,
    ...playbookTools,
    ...billingTools,
    ...correctionTools,
    ...enrichmentTools,
    ...fileTools,
    ...meTools,
    ...memoryTools,
    ...watchingTools,
    ...intakeTools,
    ...captureReviewTools,
    ...capabilities.composioTools,
  };


  const captureReviewSection = captureContext
    ? `## Capture Review Mode

You are reviewing a specific capture. The user clicked "Review with Salt" on this capture and wants help understanding it, correcting Salt's decision, or taking action.

${formatCaptureContextForPrompt(captureContext)}

### Available Actions
- Use \`trigger_play_for_capture\` to run a specific play for this capture
- Use \`add_sender_to_watching\` to watch for future emails from this sender
- Use \`link_capture_to_record\` to link this capture to a Person, Org, or Work
- Use \`recategorize_capture\` to correct Salt's categorization

Start by acknowledging what the capture is and asking how you can help.`
    : null;

  const isDemoMode = process.env.ASK_SALT_DEMO_MODE === "true";

  const systemSections = [
    ASK_SALT_SYSTEM,
    // Demo mode: roleplay full capabilities without calling tools
    isDemoMode ? ASK_SALT_DEMO_MODE_INSTRUCTION : null,
    // Lethal-trifecta defense (5.5.4): connector-fetched content (email
    // bodies, docs, tool results) is untrusted DATA — never instructions.
    // Mutations additionally require an in-thread human tap (needsApproval),
    // so injected content can never steer an action without the user seeing
    // the full argument preview.
    UNTRUSTED_CONTENT_SYSTEM_SECTION,
    captureReviewSection,
    operatorContext,
    isDemoMode ? null : buildAskSaltCapabilityBlock(capabilities),
    isDemoMode ? null : buildAskSaltPlaybookIndexBlock(playbooks, blueprints),
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


  const stream = createUIMessageStream({
    originalMessages: isApprovalFlow ? uiMessages : undefined,
    execute: ({ writer: dataStream }) => {
      const result = streamText({
        model: getAskSaltLanguageModel(),
        system,
        messages: modelMessages,
        stopWhen: stepCountIs(maxSteps),
        tools,
        experimental_repairToolCall: async ({ toolCall, tools: activeTools, error }) => {
          if (!NoSuchToolError.isInstance(error)) return null;
          const canonical = resolveComposioToolName(toolCall.toolName, activeTools);
          if (!canonical) return null;
          return { ...toolCall, toolName: canonical };
        },
        // Must live on streamText, not on createUIMessageStream below: only
        // this callback carries token usage, and `totalUsage` aggregates every
        // step of the turn rather than just the last one.
        //
        // Awaited rather than fired and forgotten — a floating promise here
        // can be cut off when the serverless instance freezes after the
        // response, which would drop the spend record for the most expensive
        // turns. `recordAskSaltUsage` swallows its own failures.
        onFinish: async ({ response, totalUsage, steps }) => {
          await recordAskSaltUsage({
            workspaceId: workspace.id,
            idempotencyKey: `ask_salt_${response.id}`,
            model: response.modelId,
            usage: totalUsage,
            calls: steps.length,
          });
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
