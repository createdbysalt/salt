import type { UIMessage } from "ai";
import { uiMessageText } from "./message-adapters";

/** Per-string cap inside tool results returned to the model (email bodies, etc.). */
export const ASK_SALT_TOOL_STRING_MAX_CHARS = 6_000;

/** Total serialized cap for one tool result object. */
export const ASK_SALT_TOOL_RESULT_MAX_CHARS = 24_000;

/**
 * OpenRouter's content-filter guardrail rejects oversized requests before they
 * reach the model. Stay under this budget for the messages portion so system +
 * tool schemas still fit.
 */
export const ASK_SALT_MESSAGES_BUDGET_CHARS = 180_000;

/** Recent assistant turns that keep tool parts (after per-result truncation). */
export const ASK_SALT_RECENT_ASSISTANT_TURNS = 3;

/** Start rolling-window suppression once the thread exceeds this many messages. */
export const ASK_SALT_ROLLING_WINDOW_TRIGGER = 16;

/** Messages kept in full for the model after older turns collapse to a recap. */
export const ASK_SALT_KEEP_RECENT_MESSAGES = 14;

/** Cap for the text-only recap injected into the system prompt. */
export const ASK_SALT_RECAP_MAX_CHARS = 8_000;

const OMITTED_TOOL_NOTE =
  "[Earlier search results were shortened to keep this chat responsive. Re-query connected accounts if you need those details again.]";

const OMITTED_FILE_NOTE = "[Attached file omitted from model context — describe it in your message if Salt should use it.]";

type ToolLikePart = {
  type: string;
  state?: string;
  toolCallId?: string;
  toolName?: string;
  input?: unknown;
  output?: unknown;
  errorText?: string;
};

function isToolPart(part: UIMessage["parts"][number]): boolean {
  if (typeof part !== "object" || part === null || !("type" in part)) return false;
  const type = (part as { type?: string }).type;
  return (
    type === "dynamic-tool" || (typeof type === "string" && type.startsWith("tool-"))
  );
}

function isFilePart(part: UIMessage["parts"][number]): boolean {
  return typeof part === "object" && part !== null && "type" in part && part.type === "file";
}

function truncateString(value: string, maxChars: number): string {
  if (value.length <= maxChars) return value;
  return `${value.slice(0, maxChars)}… (${value.length} chars total)`;
}

/**
 * Shallow-recursive truncation for tool results. Keeps structure (ids, subjects,
 * dates) while bounding email bodies and other long strings.
 */
export function compactToolResultForAskSalt<T>(value: T): T {
  const compacted = compactValue(value, ASK_SALT_TOOL_STRING_MAX_CHARS, 0);
  const serialized = JSON.stringify(compacted);
  if (serialized.length <= ASK_SALT_TOOL_RESULT_MAX_CHARS) {
    return compacted as T;
  }

  return {
    ok: false,
    truncated: true,
    message:
      "Result was too large to include in chat context. Retry with a narrower query (subject, sender, or date range).",
    preview: serialized.slice(0, ASK_SALT_TOOL_RESULT_MAX_CHARS),
  } as T;
}

function compactValue(value: unknown, maxStringChars: number, depth: number): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "string") {
    if (value.startsWith("data:") && value.length > maxStringChars) {
      return OMITTED_FILE_NOTE;
    }
    return truncateString(value, maxStringChars);
  }
  if (typeof value !== "object") return value;
  if (depth > 8) return "[nested data truncated]";

  if (Array.isArray(value)) {
    return value.map((item) => compactValue(item, maxStringChars, depth + 1));
  }

  const out: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    out[key] = compactValue(child, maxStringChars, depth + 1);
  }
  return out;
}

function compactToolPart(part: ToolLikePart): ToolLikePart {
  const next: ToolLikePart = { ...part };
  if (next.input !== undefined) {
    next.input = compactValue(next.input, ASK_SALT_TOOL_STRING_MAX_CHARS, 0);
  }
  if (next.output !== undefined) {
    next.output = compactToolResultForAskSalt(next.output);
  }
  if (typeof next.errorText === "string") {
    next.errorText = truncateString(next.errorText, 500);
  }
  return next;
}

function compactFilePart(
  part: { type: "file"; filename?: string; url?: string; mediaType?: string },
): UIMessage["parts"][number] {
  const url = part.url ?? "";
  if (!url.startsWith("data:") && url.length <= ASK_SALT_TOOL_STRING_MAX_CHARS) {
    return {
      type: "file",
      url,
      filename: part.filename,
      mediaType: part.mediaType ?? "application/octet-stream",
    };
  }
  return {
    type: "file",
    url: OMITTED_FILE_NOTE,
    filename: part.filename,
    mediaType: part.mediaType ?? "application/octet-stream",
  };
}

function compactMessageParts(
  parts: UIMessage["parts"],
  options: { omitToolParts: boolean },
): UIMessage["parts"] {
  if (options.omitToolParts) {
    const textParts = parts.filter((part) => part.type === "text");
    const hadTools = parts.some(isToolPart);
    if (!hadTools) return parts;
    return [
      ...textParts,
      { type: "text", text: OMITTED_TOOL_NOTE },
    ];
  }

  return parts.map((part) => {
    if (isToolPart(part)) {
      return compactToolPart(part as ToolLikePart) as UIMessage["parts"][number];
    }
    if (isFilePart(part)) {
      return compactFilePart(
        part as { type: "file"; filename?: string; url?: string; mediaType?: string },
      );
    }
    if (part.type === "text" && typeof part.text === "string") {
      return {
        ...part,
        text: truncateString(part.text, ASK_SALT_TOOL_STRING_MAX_CHARS),
      };
    }
    return part;
  });
}

function assistantMessageIndices(messages: UIMessage[]): number[] {
  return messages.flatMap((message, index) =>
    message.role === "assistant" ? [index] : [],
  );
}

function indicesKeepingToolParts(messages: UIMessage[]): Set<number> {
  const assistants = assistantMessageIndices(messages);
  if (assistants.length <= ASK_SALT_RECENT_ASSISTANT_TURNS) {
    return new Set(assistants);
  }
  return new Set(assistants.slice(-ASK_SALT_RECENT_ASSISTANT_TURNS));
}

export type AskSaltContextCompaction = {
  messages: UIMessage[];
  /** Text-only recap of dropped turns, injected into the system prompt. */
  earlierRecap: string | null;
  compacted: boolean;
  messagesChars: number;
  omittedOlderToolParts: boolean;
  /** True when older messages were removed from the model request entirely. */
  rolledOlderMessages: boolean;
};

export function estimateSerializedChars(value: unknown): number {
  return JSON.stringify(value).length;
}

function roleLabel(role: UIMessage["role"]): string {
  if (role === "user") return "User";
  if (role === "assistant") return "Salt";
  return "System";
}

/**
 * Build a compact, text-only recap of earlier turns — the same pattern chat
 * apps use when they drop old messages but keep the narrative thread.
 */
export function buildEarlierConversationRecap(messages: UIMessage[]): string | null {
  if (messages.length === 0) return null;

  const lines: string[] = [];
  for (const message of messages) {
    const text = uiMessageText(message);
    if (!text) continue;
    lines.push(`${roleLabel(message.role)}: ${truncateString(text, 1_200)}`);
  }

  if (lines.length === 0) return null;

  let recap = lines.join("\n");
  if (recap.length > ASK_SALT_RECAP_MAX_CHARS) {
    recap = `${recap.slice(0, ASK_SALT_RECAP_MAX_CHARS)}…`;
  }

  return recap;
}

export function formatEarlierRecapSystemSection(recap: string): string {
  return (
    "Earlier in this conversation (tool payloads omitted from context; re-query connected accounts if you need raw search results again):\n" +
    recap
  );
}

function shouldRollOlderMessages(messages: UIMessage[], messagesChars: number): boolean {
  return (
    messages.length > ASK_SALT_ROLLING_WINDOW_TRIGGER ||
    messagesChars > ASK_SALT_MESSAGES_BUDGET_CHARS
  );
}

function rollToRecentWindow(messages: UIMessage[]): {
  earlier: UIMessage[];
  recent: UIMessage[];
} {
  if (messages.length <= ASK_SALT_KEEP_RECENT_MESSAGES) {
    return { earlier: [], recent: messages };
  }
  const splitAt = messages.length - ASK_SALT_KEEP_RECENT_MESSAGES;
  return {
    earlier: messages.slice(0, splitAt),
    recent: messages.slice(splitAt),
  };
}

/**
 * Bound the conversation sent to the LLM. Full history stays in the DB/UI;
 * only the model request is compacted.
 */
export function compactAskSaltMessagesForModel(
  messages: UIMessage[],
): AskSaltContextCompaction {
  const keepToolParts = indicesKeepingToolParts(messages);
  const hasOlderAssistants =
    assistantMessageIndices(messages).length > ASK_SALT_RECENT_ASSISTANT_TURNS;

  let compacted = false;
  let omittedOlderToolParts = false;

  let result = messages.map((message, index) => {
    const omitToolParts =
      message.role === "assistant" && hasOlderAssistants && !keepToolParts.has(index);
    if (omitToolParts) omittedOlderToolParts = true;

    const parts = compactMessageParts(message.parts, { omitToolParts });
    if (parts !== message.parts) compacted = true;
    if (omitToolParts) compacted = true;

    return parts === message.parts ? message : { ...message, parts };
  });

  let messagesChars = estimateSerializedChars(result);
  let earlierRecap: string | null = null;
  let rolledOlderMessages = false;

  if (shouldRollOlderMessages(result, messagesChars)) {
    const { earlier, recent } = rollToRecentWindow(result);
    earlierRecap = buildEarlierConversationRecap(earlier);
    if (earlier.length > 0) {
      rolledOlderMessages = true;
      compacted = true;
      omittedOlderToolParts = true;
      result = recent;
      messagesChars = estimateSerializedChars(result);
    }
  }

  return {
    messages: result,
    earlierRecap,
    compacted,
    messagesChars,
    omittedOlderToolParts,
    rolledOlderMessages,
  };
}
