/**
 * Central OpenRouter model routing registry.
 * Override per workload via AI_MODEL_* env vars.
 */
export const MODEL_ROUTING = {
  insights: process.env.AI_MODEL_INSIGHTS ?? "openai/gpt-4o-mini",
  extraction: process.env.AI_MODEL_EXTRACTION ?? "openai/gpt-4o",
  summarization: process.env.AI_MODEL_SUMMARIZATION ?? "openai/gpt-4o",
  meetingSummary: process.env.AI_MODEL_MEETING ?? "openai/gpt-4o",
  opportunityScan: process.env.AI_MODEL_OPPORTUNITY ?? "anthropic/claude-sonnet-4",
  playDraft: process.env.AI_MODEL_PLAY_DRAFT ?? "anthropic/claude-sonnet-4",
} as const;

export type ModelRoutingKey = keyof typeof MODEL_ROUTING;

export function resolveModel(key: ModelRoutingKey, override?: string): string {
  return override ?? MODEL_ROUTING[key];
}

export const LLM_FALLBACK_MODEL = "openai/gpt-4o-mini";
