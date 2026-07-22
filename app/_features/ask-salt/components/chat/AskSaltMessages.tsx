"use client";

import * as React from "react";
import { ArrowDown, Sparkles } from "lucide-react";
import type { UIMessage } from "ai";
import type { UseChatHelpers } from "@ai-sdk/react";
import { cn } from "@repo/utils";
import { extractConnectorTurnFromMetadata } from "../../inline-connect";
import { uiMessageMetadata } from "../../message-adapters";
import { useAskSaltScroll } from "../../hooks/useAskSaltScroll";
import {
  AskSaltMessage,
  type ConnectorSlotProps,
} from "./AskSaltMessage";
import { resolveAskSaltClientError } from "../../ask-salt-errors";
import { Shimmer } from "./shimmer";

/**
 * Thread region for Ask Salt, ported from vercel/chatbot
 * components/chat/messages.tsx: single UIMessage stream, stick-to-bottom
 * scrolling with a floating pill, and a Thinking shimmer while Salt works.
 */

export type AskSaltConnectorHandlers = {
  connectingId: string | null;
  disconnectingId: string | null;
  onConnect: (connectorId: string) => void;
  onDisconnect: (connectorId: string) => void;
};

export type AskSaltMessagesProps = {
  messages: UIMessage[];
  chatStatus: UseChatHelpers<UIMessage>["status"];
  /** Set when the chat transport fails (streaming errors do not throw from sendMessage). */
  chatError?: Error | null;
  /** Connector intents resolve via a server action, outside the chat transport. */
  processing?: boolean;
  approvalsBusy?: boolean;
  onApproval?: (approvalId: string, approved: boolean) => void;
  connector?: AskSaltConnectorHandlers;
  /** Rendered above the thread (context card, idle starter actions). */
  before?: React.ReactNode;
  /** Rendered below the thread (review confirmation, created state). */
  after?: React.ReactNode;
  /** Constrain width in fullscreen mode. */
  centered?: boolean;
  /** Changes (new conversation) reset stick-to-bottom state. */
  resetKey?: string | null;
  /** Staged entity-context greeting: show Thinking before the ack message. */
  stagedThinking?: boolean;
};

export function AskSaltMessages({
  messages,
  chatStatus,
  chatError = null,
  processing = false,
  approvalsBusy = false,
  onApproval,
  connector,
  before,
  after,
  centered = false,
  resetKey = null,
  stagedThinking = false,
}: AskSaltMessagesProps) {
  const { containerRef, isAtBottom, scrollToBottom, reset } = useAskSaltScroll();

  const prevResetKeyRef = React.useRef(resetKey);
  React.useEffect(() => {
    if (prevResetKeyRef.current !== resetKey) {
      prevResetKeyRef.current = resetKey;
      reset();
      scrollToBottom("instant");
    }
  }, [reset, resetKey, scrollToBottom]);

  const lastMessage = messages.at(-1);
  const lastConnectorTurn =
    connector && lastMessage?.role === "assistant"
      ? extractConnectorTurnFromMetadata(uiMessageMetadata(lastMessage))
      : null;

  const connectorSlot: ConnectorSlotProps | null =
    connector && lastConnectorTurn
      ? {
          action: lastConnectorTurn.inlineAction,
          showBrowseConnectors: lastConnectorTurn.showBrowseConnectors,
          connecting: lastConnectorTurn.inlineAction
            ? connector.connectingId === lastConnectorTurn.inlineAction.connectorId
            : false,
          disconnecting: lastConnectorTurn.inlineAction
            ? connector.disconnectingId === lastConnectorTurn.inlineAction.connectorId
            : false,
          onConnect: connector.onConnect,
          onDisconnect: connector.onDisconnect,
        }
      : null;

  const showThinking =
    stagedThinking ||
    processing ||
    (chatStatus === "submitted" && lastMessage?.role !== "assistant");

  const showChatError = chatStatus === "error" && chatError !== null;

  React.useEffect(() => {
    const summary = messages.map((m) => ({
      id: m.id.slice(0, 8),
      role: m.role,
      text: m.parts
        .filter((p): p is { type: "text"; text: string } => p.type === "text")
        .map((p) => p.text)
        .join(" ")
        .slice(0, 60),
    }));
    // #region agent log
    fetch('http://127.0.0.1:7443/ingest/a7cd7781-629e-483f-bcc8-d958046d0b66',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'9523cd'},body:JSON.stringify({sessionId:'9523cd',location:'AskSaltMessages.tsx:render',message:'messages state',data:{count:messages.length,summary,chatStatus,processing,showThinking},timestamp:Date.now(),hypothesisId:'H1,H3,H4'})}).catch(()=>{});
    // #endregion
  }, [messages, chatStatus, processing, showThinking]);

  return (
    <div className="relative min-h-0 flex-1">
      <div
        ref={containerRef}
        className="absolute inset-0 touch-pan-y overflow-y-auto overscroll-contain px-5 pb-4 pt-6"
      >
        <div className={cn("space-y-5", centered && "mx-auto w-full max-w-2xl")}>
          {before}

          {messages
            .filter((msg, idx, arr) => arr.findIndex((m) => m.id === msg.id) === idx)
            .map((message, index, deduped) => (
              <AskSaltMessage
                key={message.id}
                message={message}
                allMessages={messages}
                isStreaming={
                  chatStatus === "streaming" && index === deduped.length - 1
                }
                approvalsBusy={approvalsBusy}
                onApproval={onApproval}
                connectorSlot={index === deduped.length - 1 ? connectorSlot : null}
              />
            ))}

          {showThinking && <ThinkingMessage />}

          {showChatError && (
            <ChatErrorMessage message={resolveAskSaltClientError(chatError)} />
          )}

          {after}
        </div>
      </div>

      <button
        type="button"
        aria-label="Scroll to bottom"
        onClick={() => scrollToBottom("smooth")}
        className={cn(
          "absolute bottom-3 left-1/2 z-10 flex h-7 -translate-x-1/2 items-center rounded-full border border-border/50 bg-card/90 px-3.5 shadow-[var(--shadow-lift)] backdrop-blur-lg transition-all duration-200",
          isAtBottom
            ? "pointer-events-none scale-90 opacity-0"
            : "pointer-events-auto scale-100 opacity-100",
        )}
      >
        <ArrowDown className="size-3 text-muted-foreground" />
      </button>
    </div>
  );
}

export function ThinkingMessage({ label = "Thinking…" }: { label?: string }) {
  return (
    <div
      className="flex items-start gap-2.5 animate-in fade-in duration-200"
      data-role="assistant"
    >
      <span className="surface-aurora grid size-7 shrink-0 place-items-center rounded-full">
        <Sparkles className="relative z-10 size-3.5 text-white" strokeWidth={2.5} />
      </span>
      <div className="flex min-h-7 items-center text-[13px] leading-relaxed">
        <Shimmer className="font-medium" duration={1}>
          {label}
        </Shimmer>
      </div>
    </div>
  );
}

function ChatErrorMessage({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2.5" data-role="assistant" data-testid="ask-salt-chat-error">
      <span className="surface-aurora grid size-7 shrink-0 place-items-center rounded-full">
        <Sparkles className="relative z-10 size-3.5 text-white" strokeWidth={2.5} />
      </span>
      <div className="rounded-2xl rounded-bl-md border border-destructive/30 bg-destructive/5 px-3.5 py-2.5 text-[13px] leading-relaxed text-destructive">
        {message}
      </div>
    </div>
  );
}
