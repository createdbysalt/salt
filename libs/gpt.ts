import "server-only";

<<<<<<< HEAD
import axios from "axios";

=======
>>>>>>> pr/dashboard-migration-complete-v2
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
<<<<<<< HEAD
  userId: number,
=======
  userId: string,
>>>>>>> pr/dashboard-migration-complete-v2
  max = 100,
  temp = 1
) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

<<<<<<< HEAD
  const url = "https://api.openai.com/v1/chat/completions";
=======
  const url = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1/chat/completions";
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
>>>>>>> pr/dashboard-migration-complete-v2

  if (process.env.DEBUG_OPENAI === "1") {
    console.log("Ask GPT >>>");
    for (const m of messages) {
      console.log(` - ${m.role.toUpperCase()}: ${m.content}`);
    }
  }

  const body = {
<<<<<<< HEAD
    model: "gpt-4",
=======
    model,
>>>>>>> pr/dashboard-migration-complete-v2
    messages,
    max_tokens: max,
    temperature: temp,
    user: userId,
<<<<<<< HEAD
  };

  const options = {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
  };

  try {
    const res = await axios.post<OpenAiChatCompletionResponse>(url, body, options);

    const answer = res.data?.choices?.[0]?.message?.content;
    if (typeof answer !== "string") return null;

    if (process.env.DEBUG_OPENAI === "1") {
      const usage = res.data?.usage;
=======
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
          errorPayload = await res.text().catch(() => null);
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
>>>>>>> pr/dashboard-migration-complete-v2
      console.log(`>>> ${answer}`);
      console.log(
        `TOKENS USED: ${usage?.total_tokens ?? "?"} (prompt: ${usage?.prompt_tokens ?? "?"} / response: ${usage?.completion_tokens ?? "?"})`
      );
      console.log("\n");
    }

    return answer;
  } catch (e: any) {
<<<<<<< HEAD
    console.error("GPT Error:", e?.response?.status, e?.response?.data);
=======
    // Network/parse errors: only surface details when debugging
    if (process.env.DEBUG_OPENAI === "1") {
      console.warn("OpenAI request threw:", e);
    }
>>>>>>> pr/dashboard-migration-complete-v2
    return null;
  }
};
