import type { UIMessage } from "ai";
import { extractConnectorTurnFromMetadata } from "./inline-connect";
import { uiMessageMetadata } from "./message-adapters";
import type { MessageOptions } from "./components/chat/AskSaltMessage";

/**
 * Suggestion chips from the latest assistant turn, for the composer area.
 */
export function resolveLastMessageOptions({
  messages,
  onSelect,
  disabled = false,
}: {
  messages: UIMessage[];
  onSelect: (text: string) => void;
  disabled?: boolean;
}): MessageOptions | null {
  const lastMessage = messages.at(-1);
  if (!lastMessage || lastMessage.role !== "assistant") {
    return null;
  }

  const lastMetadata = uiMessageMetadata(lastMessage);
  const lastConnectorTurn = extractConnectorTurnFromMetadata(lastMetadata);
  const inlineConnectLabel = lastConnectorTurn?.inlineAction?.canConnect
    ? `connect ${lastConnectorTurn.inlineAction.name}`.toLowerCase()
    : null;

  const suggestions = Array.isArray(lastMetadata?.suggestions)
    ? (lastMetadata.suggestions as string[]).filter(
        (item): item is string =>
          typeof item === "string" &&
          item.length > 0 &&
          item.toLowerCase() !== inlineConnectLabel,
      )
    : [];

  if (suggestions.length === 0) {
    return null;
  }

  return { items: suggestions, disabled, onSelect };
}
