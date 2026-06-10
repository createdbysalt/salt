import "server-only";

import { LLM_FALLBACK_MODEL, resolveModel, type ModelRoutingKey } from "./models";

export interface LlmChatMessage {
  role: "system" | "user" | "assistant";
  content: string | LlmContentPart[];
}

export interface LlmContentPart {
  type: "text" | "image_url";
  text?: string;
  image_url?: { url: string; detail?: "auto" | "low" | "high" };
}

interface LlmChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
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
  userId: string,
  max = 100,
  temp = 1,
  model?: string,
) => sendLlm(messages, userId, { maxTokens: max, temperature: temp, model });

export async function sendLlm(
  messages: LlmChatMessage[],
  userId: string,
  options: SendLlmOptions = {},
): Promise<string | null> {
  const { apiKey, baseUrl, appUrl, viaOpenRouter } = getLlmConfig();
  if (!apiKey) return null;

  const model =
    options.model ??
    (options.routingKey
      ? resolveModel(options.routingKey)
      : process.env.OPENAI_MODEL ?? LLM_FALLBACK_MODEL);

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
    user: userId,
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
        return sendLlm(messages, userId, { ...options, model: fallback });
      }
      if (process.env.DEBUG_OPENAI === "1") {
        console.warn("LLM request failed:", res.status, await res.text());
      }
      return null;
    }

    const data = (await res.json()) as LlmChatCompletionResponse;
    const answer = data?.choices?.[0]?.message?.content;
    return typeof answer === "string" ? answer : null;
  } catch (error) {
    if (process.env.DEBUG_OPENAI === "1") {
      console.warn("LLM request threw:", error);
    }
    return null;
  }
}
