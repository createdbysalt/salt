import "server-only";

/**
 * Embedding generation for semantic matching.
 * Uses OpenAI text-embedding-3-small (1536 dimensions).
 */

const DEFAULT_EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDING_DIMENSIONS = 1536;

interface EmbeddingResponse {
  data?: Array<{
    embedding?: number[];
    index?: number;
  }>;
  usage?: {
    prompt_tokens?: number;
    total_tokens?: number;
  };
}

function getEmbeddingConfig() {
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const openAiKey = process.env.OPENAI_API_KEY;

  if (openRouterKey) {
    return {
      apiKey: openRouterKey,
      baseUrl: (
        process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1"
      ).replace(/\/$/, ""),
      model: `openai/${DEFAULT_EMBEDDING_MODEL}`,
    };
  }

  return {
    apiKey: openAiKey,
    baseUrl: (process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1").replace(
      /\/$/,
      ""
    ),
    model: DEFAULT_EMBEDDING_MODEL,
  };
}

export async function generateEmbedding(text: string): Promise<number[] | null> {
  const { apiKey, baseUrl, model } = getEmbeddingConfig();
  if (!apiKey) return null;

  try {
    const res = await fetch(`${baseUrl}/embeddings`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        input: text,
        dimensions: EMBEDDING_DIMENSIONS,
      }),
    });

    if (!res.ok) {
      if (process.env.DEBUG_OPENAI === "1") {
        console.warn("Embedding request failed:", res.status, await res.text());
      }
      return null;
    }

    const data = (await res.json()) as EmbeddingResponse;
    return data?.data?.[0]?.embedding ?? null;
  } catch (error) {
    if (process.env.DEBUG_OPENAI === "1") {
      console.warn("Embedding request threw:", error);
    }
    return null;
  }
}

export async function generateEmbeddingBatch(
  texts: string[]
): Promise<Array<number[] | null>> {
  if (texts.length === 0) return [];

  const { apiKey, baseUrl, model } = getEmbeddingConfig();
  if (!apiKey) return texts.map(() => null);

  try {
    const res = await fetch(`${baseUrl}/embeddings`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        input: texts,
        dimensions: EMBEDDING_DIMENSIONS,
      }),
    });

    if (!res.ok) {
      if (process.env.DEBUG_OPENAI === "1") {
        console.warn("Batch embedding failed:", res.status, await res.text());
      }
      return texts.map(() => null);
    }

    const data = (await res.json()) as EmbeddingResponse;
    const embeddings = data?.data ?? [];

    return texts.map((_, i) => {
      const item = embeddings.find((e) => e.index === i);
      return item?.embedding ?? null;
    });
  } catch (error) {
    if (process.env.DEBUG_OPENAI === "1") {
      console.warn("Batch embedding threw:", error);
    }
    return texts.map(() => null);
  }
}

export { EMBEDDING_DIMENSIONS };
