import "server-only";

import { createOpenAI } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import { resolveModel } from "./models";

function getOpenRouterConfig() {
  const apiKey = process.env.OPENROUTER_API_KEY ?? process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const baseURL = process.env.OPENROUTER_API_KEY
    ? (process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1").replace(
        /\/$/,
        "",
      )
    : (process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1").replace(/\/$/, "");

  return { apiKey, baseURL };
}

/**
 * Language model for Ask Salt agent turns.
 * Prefers OpenRouter when configured; falls back to Anthropic direct.
 */
export function getAskSaltLanguageModel() {
  const openRouter = getOpenRouterConfig();
  if (openRouter) {
    const openrouter = createOpenAI({
      apiKey: openRouter.apiKey,
      baseURL: openRouter.baseURL,
      headers: process.env.OPENROUTER_API_KEY
        ? {
            "HTTP-Referer":
              process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
              "http://localhost:3000",
            "X-Title": "Salt Ask Salt",
          }
        : undefined,
    });
    return openrouter(resolveModel("playDraft"));
  }

  if (process.env.ANTHROPIC_API_KEY) {
    return anthropic("claude-sonnet-4-20250514");
  }

  throw new Error(
    "No LLM configured for Ask Salt. Set OPENROUTER_API_KEY or ANTHROPIC_API_KEY.",
  );
}
