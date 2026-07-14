import type { UIMessage } from "ai";
import type { AskSaltMessageRow } from "./types";

/**
 * Pure adapters between Ask Salt DB rows and AI SDK UIMessages.
 * The DB stays the source of truth (`content` + `metadata`); the panel renders
 * a single UIMessage stream. Legacy rows without `metadata.parts` get a
 * synthesized text part so old conversations keep restoring.
 */

export type AskSaltUIMetadata = Record<string, unknown>;

type ToolLikePart = {
  type: string;
  state?: string;
};

/** Tool UI parts stuck mid-flight poison the next turn (MissingToolResultsError). */
const INCOMPLETE_TOOL_STATES = new Set([
  "input-streaming",
  "input-available",
  "approval-requested",
]);

export function isIncompleteToolPart(part: UIMessage["parts"][number]): boolean {
  if (typeof part !== "object" || part === null) return false;
  const typed = part as ToolLikePart;
  const isTool =
    typed.type === "dynamic-tool" ||
    (typeof typed.type === "string" && typed.type.startsWith("tool-"));
  if (!isTool) return false;
  return INCOMPLETE_TOOL_STATES.has(typed.state ?? "input-streaming");
}

export function stripIncompleteToolParts(
  messages: UIMessage[],
  options?: { keepApprovalRequested?: boolean },
): UIMessage[] {
  if (options?.keepApprovalRequested) return messages;

  return messages
    .map((message) => {
      if (message.role !== "assistant") return message;
      const parts = message.parts.filter((part) => !isIncompleteToolPart(part));
      if (parts.length === message.parts.length) return message;
      return { ...message, parts };
    })
    .filter((message) => {
      if (message.role !== "assistant") return true;
      return message.parts.some(
        (part) =>
          part.type === "text" ||
          part.type === "step-start" ||
          !isIncompleteToolPart(part),
      );
    });
}

export function uiMessageMetadata(message: UIMessage): AskSaltUIMetadata | null {
  if (!message.metadata || typeof message.metadata !== "object") return null;
  return message.metadata as AskSaltUIMetadata;
}

export function uiMessageText(message: UIMessage): string {
  return message.parts
    .filter((part): part is { type: "text"; text: string } => part.type === "text")
    .map((part) => part.text)
    .join("\n")
    .trim();
}

function rowToUIMessage(row: AskSaltMessageRow): UIMessage {
  const metadata = row.metadata ?? null;
  const savedParts = Array.isArray(metadata?.parts)
    ? (metadata.parts as UIMessage["parts"])
    : null;

  let restMetadata: AskSaltUIMetadata | undefined;
  if (metadata) {
    const { parts: _parts, ...rest } = metadata;
    if (Object.keys(rest).length > 0) restMetadata = rest;
  }

  return {
    id: row.id,
    role: row.role === "system" ? "system" : row.role,
    parts: savedParts ?? [{ type: "text", text: row.content }],
    ...(restMetadata ? { metadata: restMetadata } : {}),
  };
}

export function askSaltRowToUIMessage(row: AskSaltMessageRow): UIMessage {
  return stripIncompleteToolParts([rowToUIMessage(row)])[0] ?? rowToUIMessage(row);
}

export function rowsToUIMessages(rows: AskSaltMessageRow[]): UIMessage[] {
  return stripIncompleteToolParts(rows.map(rowToUIMessage));
}

export function uiMessageToPersistPayload(message: UIMessage): {
  content: string;
  metadata: AskSaltUIMetadata;
} {
  const [sanitized] = stripIncompleteToolParts([message]);
  const safeMessage = sanitized ?? message;

  return {
    content: uiMessageText(safeMessage),
    metadata: {
      ...(uiMessageMetadata(safeMessage) ?? {}),
      parts: safeMessage.parts,
    },
  };
}

export function createTextUIMessage(
  role: "user" | "assistant",
  text: string,
  metadata?: AskSaltUIMetadata,
): UIMessage {
  return {
    id: crypto.randomUUID(),
    role,
    parts: [{ type: "text", text }],
    ...(metadata ? { metadata } : {}),
  };
}

/**
 * Create a user message that represents entity context.
 * The message will be rendered as an EntityContextCard in the chat.
 */
export function createContextUIMessage(
  contextPrompt: string,
  entityContext: {
    type: string;
    id: string;
    title: string;
    actionLabel: string;
    subtitle?: string;
    href?: string;
  },
): UIMessage {
  return {
    id: crypto.randomUUID(),
    role: "user",
    parts: [{ type: "text", text: contextPrompt }],
    metadata: {
      entityContext,
    },
  };
}
