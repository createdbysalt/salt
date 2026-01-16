import "server-only";

export interface OpenAiChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface OpenAiChatCompletionResponse {
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

// Server-only OpenAI call helper. userId is used to identify the user on OpenAI side.
export const sendOpenAi = async (
  messages: OpenAiChatMessage[],
  userId: string,
  max = 100,
  temp = 1
) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const url = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1/chat/completions";
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  if (process.env.DEBUG_OPENAI === "1") {
    console.log("Ask GPT >>>");
    for (const m of messages) {
      console.log(` - ${m.role.toUpperCase()}: ${m.content}`);
    }
  }

  const body = {
    model,
    messages,
    max_tokens: max,
    temperature: temp,
    user: userId,
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      // Avoid dev overlay spam; log details only when explicitly debugging
      if (process.env.DEBUG_OPENAI === "1") {
        let errorPayload: unknown = null;
        try {
          errorPayload = await res.json();
        } catch {
          errorPayload = await res.text().catch((): null => null);
        }
        console.warn("OpenAI request failed:", res.status, errorPayload);
      }
      return null;
    }

    const data = (await res.json()) as OpenAiChatCompletionResponse;
    const answer = data?.choices?.[0]?.message?.content;
    if (typeof answer !== "string") return null;

    if (process.env.DEBUG_OPENAI === "1") {
      const usage = data?.usage;
      console.log(`>>> ${answer}`);
      console.log(
        `TOKENS USED: ${usage?.total_tokens ?? "?"} (prompt: ${usage?.prompt_tokens ?? "?"} / response: ${usage?.completion_tokens ?? "?"})`
      );
      console.log("\n");
    }

    return answer;
  } catch (e: any) {
    // Network/parse errors: only surface details when debugging
    if (process.env.DEBUG_OPENAI === "1") {
      console.warn("OpenAI request threw:", e);
    }
    return null;
  }
};
