import "server-only";

import {
  canSpend,
  isBlocked,
  shouldDegrade,
  type SpendOrigin,
} from "@/app/_lib/usage/can-spend";
import { recordLlmCall } from "@/app/_lib/usage/record-llm-usage";
import { LLM_FALLBACK_MODEL, resolveModel, type ModelRoutingKey } from "./models";

/**
 * Who a language-model call is spent on behalf of.
 *
 * The ledger is workspace-scoped and `sendLlm` used to receive only a
 * `userId`, which is not the same thing and cannot be turned into one:
 * `workspace_members` is one-to-many, and several callers pass a synthetic
 * actor (`"catalog-sync-cron"`) where no user exists at all. Resolving a
 * workspace from the user would bill spend to whichever workspace someone
 * joined first — silently, and more wrongly once workspace switching ships.
 *
 * So attribution is an explicit argument, and "this spend belongs to no
 * workspace" is a stated case rather than an omission. The union is what makes
 * the compiler refuse a call site that has not thought about it: there is no
 * default, and forgetting is a build error rather than a plausible wrong bill.
 *
 * Full rationale, including why AsyncLocalStorage does not work here:
 * `docs/architecture/billing-metering.md`.
 */
export type LlmSpendContext =
  | {
      kind: "workspace";
      workspaceId: string;
      /**
       * Forwarded to the provider as `user` for abuse attribution. Optional
       * because background work — post-OAuth first scans, crons — is genuinely
       * the workspace's spend with no acting user behind it. Billing only ever
       * reads `workspaceId`; this field never affects attribution.
       */
      userId?: string;
      /**
       * How far spend admission may go for this call. Defaults to `"user"`.
       *
       * A default is safe here in a way it was not for `workspaceId`, because
       * the stakes are asymmetric. Getting the workspace wrong produces a wrong
       * bill, silently. Getting the origin wrong only changes *which* blocking
       * outcome applies once a workspace is already over budget — and at this
       * boundary `deny` and `queue` do the same thing, since `sendLlm` has no
       * channel to explain itself and returns null either way, which every
       * caller already handles.
       *
       * `"committed"` is the value that genuinely matters and must be passed
       * explicitly: it marks work the user was already promised (an approved
       * play mid-execution), which degrades but is never refused.
       */
      origin?: SpendOrigin;
    }
  | {
      kind: "platform";
      /** Synthetic actor for provider attribution, e.g. `"catalog-sync-cron"`. */
      actor: string;
      /** Why no workspace owns this spend. Recorded in code, not discarded. */
      reason: string;
    };

/** Spend attributable to a workspace. Metered and gated. */
export function workspaceSpend(
  workspaceId: string,
  userId?: string,
  origin?: SpendOrigin,
): LlmSpendContext {
  return { kind: "workspace", workspaceId, userId, origin };
}

/**
 * Spend on work the user has already approved and is waiting on. Degrades
 * under budget pressure but is never refused, because abandoning a play
 * mid-execution leaves a half-finished action and nothing to show for it.
 */
export function committedSpend(
  workspaceId: string,
  userId?: string,
): LlmSpendContext {
  return { kind: "workspace", workspaceId, userId, origin: "committed" };
}

/**
 * Spend on work nobody is waiting for — crons, post-OAuth scans, recomputes.
 * Deferred rather than refused once a workspace is over budget, so a paused
 * background job never surfaces as a broken feature.
 */
export function backgroundSpend(
  workspaceId: string,
  userId?: string,
): LlmSpendContext {
  return { kind: "workspace", workspaceId, userId, origin: "background" };
}

/**
 * Platform-global spend that belongs to no single workspace — tool
 * classification, catalog sync, admin tooling. Not metered against any
 * workspace, because charging one tenant for shared infrastructure would be
 * worse than not charging at all. `reason` exists so the choice stays legible
 * at the call site instead of looking like an oversight.
 */
export function platformSpend(actor: string, reason: string): LlmSpendContext {
  return { kind: "platform", actor, reason };
}

export interface LlmChatMessage {
  role: "system" | "user" | "assistant";
  content: string | LlmContentPart[];
}

export interface LlmContentPart {
  type: "text" | "image_url";
  text?: string;
  image_url?: { url: string; detail?: "auto" | "low" | "high" };
}

interface LlmChatCompletionMessage {
  content?: string | null;
  tool_calls?: Array<{
    id: string;
    type?: string;
    function?: { name?: string; arguments?: string };
  }>;
}

interface LlmChatCompletionResponse {
  choices?: Array<{
    message?: LlmChatCompletionMessage;
  }>;
  usage?: {
    total_tokens?: number;
    prompt_tokens?: number;
    completion_tokens?: number;
  };
}

export type OpenAiChatMessage = LlmChatMessage;

function getLlmConfig() {
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const openAiKey = process.env.OPENAI_API_KEY;
  const apiKey = openRouterKey || openAiKey;

  const baseUrl = openRouterKey
    ? (process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1").replace(
        /\/$/,
        "",
      )
    : (process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1").replace(
        /\/$/,
        "",
      );

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "http://localhost:3000";

  return { apiKey, baseUrl, appUrl, viaOpenRouter: Boolean(openRouterKey) };
}

export interface SendLlmOptions {
  model?: string;
  routingKey?: ModelRoutingKey;
  maxTokens?: number;
  temperature?: number;
  fallbackModel?: string;
}

/** @deprecated Use sendLlm */
export const sendOpenAi = async (
  messages: LlmChatMessage[],
  spend: LlmSpendContext,
  max = 100,
  temp = 1,
  model?: string,
) => sendLlm(messages, spend, { maxTokens: max, temperature: temp, model });

/**
 * Shared request core for the LLM primitive: admission (canSpend), model
 * resolution + degrade, the fetch itself, fallback-model retry, and metering
 * (recordLlmCall). Both public entry points — sendLlm (text) and
 * sendLlmToolTurn (tool calling) — run through here so no call path can
 * bypass the meter.
 *
 * Returns the raw completion message; callers parse content vs tool_calls.
 */
async function requestChatCompletion(
  messages: unknown[],
  spend: LlmSpendContext,
  options: SendLlmOptions,
  extraBody: Record<string, unknown> = {},
): Promise<{ message: LlmChatCompletionMessage } | null> {
  const { apiKey, baseUrl, appUrl, viaOpenRouter } = getLlmConfig();
  if (!apiKey) return null;

  let model =
    options.model ??
    (options.routingKey
      ? resolveModel(options.routingKey)
      : process.env.OPENAI_MODEL ?? LLM_FALLBACK_MODEL);

  // Admission, before a single token is bought. Platform spend is exempt: it
  // belongs to no tenant, so there is no budget to measure it against, and
  // gating shared infrastructure on one workspace's overspend would be wrong.
  if (spend.kind === "workspace") {
    const decision = await canSpend({
      workspaceId: spend.workspaceId,
      kind: "llm_tokens",
      origin: spend.origin ?? "user",
    });

    if (isBlocked(decision)) {
      // Null is the established "no answer" contract here, and every caller
      // already has a deterministic fallback for it. Surfacing a distinct
      // error type would mean revisiting all of them for a case where the
      // correct behaviour — degrade quietly — is what null already produces.
      console.warn(
        `[usage] LLM call refused for workspace ${spend.workspaceId}: ${decision.reason}`,
      );
      return null;
    }

    // The one lever this primitive owns. Swapping model class is the least
    // visible step on the ladder, which is why it comes first.
    if (shouldDegrade(decision)) {
      model = options.fallbackModel ?? LLM_FALLBACK_MODEL;
    }
  }

  const url = `${baseUrl}/chat/completions`;

  if (process.env.DEBUG_OPENAI === "1") {
    console.log("Ask LLM >>>", { model, viaOpenRouter });
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };

  if (viaOpenRouter) {
    headers["HTTP-Referer"] = appUrl;
    headers["X-Title"] = "Salt";
  }

  const body = {
    model,
    messages,
    max_tokens: options.maxTokens ?? 100,
    temperature: options.temperature ?? 1,
    user:
      spend.kind === "workspace"
        ? spend.userId ?? spend.workspaceId
        : spend.actor,
    ...extraBody,
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const fallback = options.fallbackModel ?? LLM_FALLBACK_MODEL;
      if (model !== fallback) {
        // The retry is a second real request and meters itself. Not recording
        // the failed attempt is deliberate: a non-2xx response carries no
        // usage block, so any figure here would be invented.
        return requestChatCompletion(
          messages,
          spend,
          { ...options, model: fallback },
          extraBody,
        );
      }
      if (process.env.DEBUG_OPENAI === "1") {
        console.warn("LLM request failed:", res.status, await res.text());
      }
      return null;
    }

    const data = (await res.json()) as LlmChatCompletionResponse;
    const message = data?.choices?.[0]?.message ?? null;

    if (spend.kind === "workspace") {
      // Awaited rather than fired and forgotten: several callers run in crons
      // and fire-and-forget server actions where the process can be torn down
      // as soon as the promise they awaited settles, which would drop the
      // record for exactly the long-running work worth measuring.
      //
      // Guarded separately from the request because this sits inside the
      // outer try: without its own catch, a metering bug would be caught below
      // and turn a perfectly good answer into a null. The ledger observes the
      // call, it does not get a vote in whether the call succeeded.
      try {
        await recordLlmCall({
          workspaceId: spend.workspaceId,
          model,
          usage: {
            inputTokens: data?.usage?.prompt_tokens,
            outputTokens: data?.usage?.completion_tokens,
          },
          routingKey: options.routingKey ?? null,
        });
      } catch (meteringError) {
        console.error("[usage] LLM metering failed:", meteringError);
      }
    }

    return message ? { message } : null;
  } catch (error) {
    if (process.env.DEBUG_OPENAI === "1") {
      console.warn("LLM request threw:", error);
    }
    return null;
  }
}

export async function sendLlm(
  messages: LlmChatMessage[],
  spend: LlmSpendContext,
  options: SendLlmOptions = {},
): Promise<string | null> {
  const result = await requestChatCompletion(messages, spend, options);
  const answer = result?.message?.content;
  return typeof answer === "string" ? answer : null;
}

/* ── Tool calling ────────────────────────────────────────────────────────── */

/** JSON-schema tool definition handed to the model (OpenAI tool format). */
export interface LlmToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

/** One model-requested tool invocation, arguments already parsed. */
export interface LlmToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
}

export interface LlmToolTurn {
  /** Assistant text, when the model produced any alongside/instead of calls. */
  text: string | null;
  /** Tool calls the model wants executed — empty means the turn is final. */
  toolCalls: LlmToolCall[];
  /**
   * The assistant message in OpenAI chat shape, ready to append to the
   * conversation history before the tool-result messages.
   */
  assistantMessage: Record<string, unknown>;
}

/**
 * One tool-calling turn: the model sees the conversation plus tool schemas
 * and either answers in text or requests tool calls. The caller owns the
 * loop (execute calls → append results → next turn) and the call budget.
 *
 * Messages use the OpenAI chat shape directly (assistant messages may carry
 * `tool_calls`, tool results arrive as `{role: "tool", tool_call_id, …}`),
 * which is wider than LlmChatMessage — hence the looser message type.
 */
export async function sendLlmToolTurn(
  messages: Array<Record<string, unknown>>,
  tools: readonly LlmToolDefinition[],
  spend: LlmSpendContext,
  options: SendLlmOptions = {},
): Promise<LlmToolTurn | null> {
  const result = await requestChatCompletion(messages, spend, options, {
    tools: tools.map((tool) => ({
      type: "function",
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    })),
    tool_choice: "auto",
  });
  if (!result) return null;

  const { message } = result;
  const toolCalls: LlmToolCall[] = [];
  for (const call of message.tool_calls ?? []) {
    const name = call.function?.name;
    if (!call.id || !name) continue;
    let args: Record<string, unknown> = {};
    try {
      const parsed: unknown = JSON.parse(call.function?.arguments ?? "{}");
      if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
        args = parsed as Record<string, unknown>;
      }
    } catch {
      // Malformed arguments stay {} — the executor's schema validation
      // rejects the call and feeds the error back to the model.
    }
    toolCalls.push({ id: call.id, name, args });
  }

  const assistantMessage: Record<string, unknown> = {
    role: "assistant",
    content: typeof message.content === "string" ? message.content : null,
  };
  if (toolCalls.length > 0) {
    assistantMessage.tool_calls = (message.tool_calls ?? []).map((call) => ({
      id: call.id,
      type: "function",
      function: {
        name: call.function?.name ?? "",
        arguments: call.function?.arguments ?? "{}",
      },
    }));
  }

  return {
    text: typeof message.content === "string" && message.content.trim().length > 0
      ? message.content
      : null,
    toolCalls,
    assistantMessage,
  };
}
