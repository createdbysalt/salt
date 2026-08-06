/**
 * AI Infrastructure Module
 *
 * OpenAI/GPT utilities for AI-powered features.
 *
 * Usage:
 *   import { sendOpenAi } from '@/app/_lib/ai'
 *   import { generateEmbedding } from '@/app/_lib/ai'
 */

export {
  sendLlm,
  sendOpenAi,
  backgroundSpend,
  committedSpend,
  platformSpend,
  workspaceSpend,
} from "@/app/_lib/ai/gpt";
export type {
  LlmChatMessage,
  LlmSpendContext,
  OpenAiChatMessage,
} from "@/app/_lib/ai/gpt";
export { MODEL_ROUTING, resolveModel } from "@/app/_lib/ai/models";
export {
  generateEmbedding,
  generateEmbeddingBatch,
  EMBEDDING_DIMENSIONS,
} from "@/app/_lib/ai/embeddings";
