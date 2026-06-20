import type { UIMessage } from "ai";
import type { AskSaltMessageRow } from "./types";

/**
 * Pure adapters between Ask Salt DB rows and AI SDK UIMessages.
 * The DB stays the source of truth (`content` + `metadata`); the panel renders
 * a single UIMessage stream. Legacy rows without `metadata.parts` get a
 * synthesized text part so old conversations keep restoring.
 */

export type AskSaltUIMetadata = Record<string, unknown>;

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

export function askSaltRowToUIMessage(row: AskSaltMessageRow): UIMessage {
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

export function rowsToUIMessages(rows: AskSaltMessageRow[]): UIMessage[] {
  return rows.map(askSaltRowToUIMessage);
}

export function uiMessageToPersistPayload(message: UIMessage): {
  content: string;
  metadata: AskSaltUIMetadata;
} {
  return {
    content: uiMessageText(message),
    metadata: {
      ...(uiMessageMetadata(message) ?? {}),
      parts: message.parts,
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
