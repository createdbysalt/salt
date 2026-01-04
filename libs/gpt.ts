import "server-only";

import axios from "axios";

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
  userId: number,
  max = 100,
  temp = 1
) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const url = "https://api.openai.com/v1/chat/completions";

  if (process.env.DEBUG_OPENAI === "1") {
    console.log("Ask GPT >>>");
    for (const m of messages) {
      console.log(` - ${m.role.toUpperCase()}: ${m.content}`);
    }
  }

  const body = {
    model: "gpt-4",
    messages,
    max_tokens: max,
    temperature: temp,
    user: userId,
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
      console.log(`>>> ${answer}`);
      console.log(
        `TOKENS USED: ${usage?.total_tokens ?? "?"} (prompt: ${usage?.prompt_tokens ?? "?"} / response: ${usage?.completion_tokens ?? "?"})`
      );
      console.log("\n");
    }

    return answer;
  } catch (e: any) {
    console.error("GPT Error:", e?.response?.status, e?.response?.data);
    return null;
  }
};
