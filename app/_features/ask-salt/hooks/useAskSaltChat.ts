"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useMemo, useRef } from "react";
import { stripIncompleteToolParts } from "../message-adapters";

/**
 * Ask Salt chat transport. Uses a ref-backed conversation id so the first
 * send after createAskSaltConversation hits the API with the real id.
 *
 * The useChat `id` stays stable for the panel lifetime so assigning a DB
 * conversation id does not recreate the chat and drop an in-flight send.
 */
export function useAskSaltChat(getConversationId: () => string | null) {
  const conversationIdRef = useRef(getConversationId);
  conversationIdRef.current = getConversationId;

  const chatSessionIdRef = useRef<string | null>(null);
  if (!chatSessionIdRef.current) {
    chatSessionIdRef.current = `ask-salt-session-${crypto.randomUUID()}`;
  }

  const transport = useMemo(
    () =>
      new DefaultChatTransport<UIMessage>({
        api: "/api/ask-salt/chat",
        prepareSendMessagesRequest: ({ id, messages, trigger, messageId }) => {
          const conversationId = conversationIdRef.current();
          if (!conversationId) {
            throw new Error("Ask Salt conversation id is not ready");
          }
          const isApprovalFlow = messages.some((message) =>
            message.parts.some((part) => {
              if (typeof part !== "object" || part === null || !("state" in part)) {
                return false;
              }
              const state = (part as { state?: string }).state;
              return state === "approval-responded" || state === "output-denied";
            }),
          );
          const safeMessages = isApprovalFlow
            ? messages
            : stripIncompleteToolParts(messages);
          return {
            body: {
              id: conversationId,
              messages: safeMessages,
              trigger,
              messageId,
            },
          };
        },
      }),
    [],
  );

  return useChat<UIMessage>({
    id: chatSessionIdRef.current,
    transport,
    messages: [],
  });
}
