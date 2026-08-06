"use client";

import * as React from "react";
import { Sparkles } from "lucide-react";
import type { UIMessage } from "ai";
import { cn } from "@repo/utils";
import { uiMessageMetadata } from "../../message-adapters";
import { EntityContextCard } from "../EntityContextCard";
import type { EntityContext } from "../../types/entity-context";
import { askSaltEmptyReplyFallback } from "../../ask-salt-errors";
import { InlineConnectPrompt } from "../InlineConnectPrompt";
import {
  findUserAttachmentsBeforeAssistantMessage,
} from "../../file-draft-utils";
import { buildRecordDeckItems } from "../../record-deck-utils";
import { ArtifactCard, extractSavedArtifacts } from "./artifact-card";
import { AskSaltRecordDeck } from "./AskSaltRecordDeck";
import { MessageContent, MessageResponse } from "./message";
import { MessageThoughtProcess } from "./MessageThoughtProcess";
import { TextWithMentions } from "./MentionPill";
import { Shimmer } from "./shimmer";
import type { ToolPartState } from "./tool";

/**
 * Parts-based message renderer for Ask Salt:
 * - User text bubbles
 * - Assistant reply text (primary)
 * - Tool steps tucked into a Cursor-style "Thought" collapsible
 */

type ToolLikePart = {
  type: string;
  state?: ToolPartState;
  toolCallId?: string;
  toolName?: string;
  input?: unknown;
  output?: unknown;
  errorText?: string;
  approval?: { id?: string; approved?: boolean };
};

function isToolPart(part: unknown): part is ToolLikePart {
  if (typeof part !== "object" || part === null) return false;
  const type = (part as { type?: unknown }).type;
  return (
    typeof type === "string" && (type.startsWith("tool-") || type === "dynamic-tool")
  );
}

function toToolLikePart(part: unknown): ToolLikePart | null {
  return isToolPart(part) ? part : null;
}

export type ConnectorSlotProps = React.ComponentProps<typeof InlineConnectPrompt>;

export type MessageOptions = {
  items: string[];
  disabled?: boolean;
  onSelect: (text: string) => void;
};

export type AskSaltMessageProps = {
  message: UIMessage;
  allMessages?: UIMessage[];
  /** True while this message is the streaming tail of the thread. */
  isStreaming?: boolean;
  /** Disables approval buttons while the chat transport is busy. */
  approvalsBusy?: boolean;
  onApproval?: (approvalId: string, approved: boolean) => void;
  /** Inline connect affordance — provided only for the active connector turn. */
  connectorSlot?: ConnectorSlotProps | null;
};

export function AskSaltMessage({
  message,
  allMessages = [],
  isStreaming = false,
  approvalsBusy = false,
  onApproval,
  connectorSlot = null,
}: AskSaltMessageProps) {
  const metadata = uiMessageMetadata(message);

  if (message.role === "user") {
    const entityContext = metadata?.entityContext as EntityContext | undefined;
    const text = message.parts
      .filter((part): part is { type: "text"; text: string } => part.type === "text")
      .map((part) => part.text)
      .join("\n")
      .trim();
    const fileParts = message.parts.filter((part) => part.type === "file");
    if (!text && fileParts.length === 0 && !entityContext) {
      return null;
    }

    // Render EntityContextCard for context messages
    if (entityContext) {
      return (
        <div
          className="flex justify-end animate-in fade-in slide-in-from-bottom-2 duration-300"
          data-role="user"
        >
          <div className="max-w-[92%]">
            <EntityContextCard context={entityContext} />
          </div>
        </div>
      );
    }

    return (
      <div className="flex justify-end" data-role="user">
        <div className="max-w-[92%] space-y-2">
          {fileParts.length > 0 && (
            <div className="flex flex-wrap justify-end gap-2">
              {fileParts.map((part, index) => {
                const filePart = part as {
                  type: "file";
                  filename?: string;
                  mediaType?: string;
                  url?: string;
                };
                return filePart.mediaType?.startsWith("image/") && filePart.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={`${filePart.filename ?? "file"}-${index}`}
                    src={filePart.url}
                    alt={filePart.filename ?? "Attachment"}
                    className="max-h-40 rounded-xl border border-border/60 object-cover"
                  />
                ) : (
                  <div
                    key={`${filePart.filename ?? "file"}-${index}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/50 px-2.5 py-1 text-xs text-foreground"
                  >
                    {filePart.filename ?? "Attachment"}
                  </div>
                );
              })}
            </div>
          )}
          {text ? (
            <div className="whitespace-pre-wrap rounded-2xl rounded-br-md bg-foreground px-3.5 py-2.5 text-[13px] leading-relaxed text-background">
              <TextWithMentions text={text} />
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  const artifacts = extractSavedArtifacts(metadata);
  const toolParts = message.parts.flatMap((part) => {
    const toolPart = toToolLikePart(part);
    return toolPart ? [toolPart] : [];
  });
  const textParts = message.parts.filter(
    (part): part is { type: "text"; text: string } =>
      part.type === "text" && Boolean(part.text.trim()),
  );
  const recordDeckItems = buildRecordDeckItems(toolParts);
  const suppressAssistantText = recordDeckItems.length > 0;
  const emptyReplyFallback =
    !isStreaming && textParts.length === 0
      ? askSaltEmptyReplyFallback(toolParts)
      : null;
  const userAttachments = findUserAttachmentsBeforeAssistantMessage(allMessages, message.id);

  const hasVisibleContent =
    textParts.length > 0 ||
    toolParts.length > 0 ||
    artifacts.length > 0 ||
    recordDeckItems.length > 0 ||
    connectorSlot !== null ||
    emptyReplyFallback !== null;

  if (!hasVisibleContent && !isStreaming) return null;

  return (
    <div
      className={cn(
        "flex items-start gap-2.5",
        !isStreaming && "animate-in fade-in slide-in-from-bottom-2 duration-300",
      )}
      data-role="assistant"
    >
      <span className="surface-aurora grid size-7 shrink-0 place-items-center rounded-full">
        <Sparkles className="relative z-10 size-3.5 text-white" strokeWidth={2.5} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        {hasVisibleContent ? (
          <>
            {toolParts.length > 0 && (
              <MessageThoughtProcess
                parts={toolParts}
                isStreaming={isStreaming}
                approvalsBusy={approvalsBusy}
                onApproval={onApproval}
              />
            )}

            {textParts.length > 0 && !suppressAssistantText && (
              textParts.map((part, index) => (
                <MessageContent
                  key={`${message.id}-text-${index}`}
                  className="rounded-2xl rounded-bl-md border border-border/55 bg-muted/45 px-3.5 py-2.5 text-[13px] leading-relaxed"
                >
                  <MessageResponse>{part.text}</MessageResponse>
                </MessageContent>
              ))
            )}

            {emptyReplyFallback && !suppressAssistantText && (
              <MessageContent className="rounded-2xl rounded-bl-md border border-border/55 bg-muted/45 px-3.5 py-2.5 text-[13px] leading-relaxed">
                <MessageResponse>{emptyReplyFallback}</MessageResponse>
              </MessageContent>
            )}

            {artifacts.length > 0 && (
              <div className="space-y-2">
                {artifacts.map((artifact, index) => (
                  <ArtifactCard key={`${artifact.type}-${index}`} artifact={artifact} />
                ))}
              </div>
            )}
            {recordDeckItems.length > 0 && (
              <AskSaltRecordDeck items={recordDeckItems} attachments={userAttachments} />
            )}
            {connectorSlot && <InlineConnectPrompt {...connectorSlot} />}
          </>
        ) : (
          <div className="flex min-h-[22px] items-center text-[13px] leading-relaxed">
            <Shimmer className="font-medium" duration={1}>
              Thinking…
            </Shimmer>
          </div>
        )}
      </div>
    </div>
  );
}

export function MessageOptionList({ options }: { options: MessageOptions }) {
  return (
    <div
      className="flex flex-wrap gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300"
      data-testid="message-options"
    >
      {options.items.map((item, index) => (
        <button
          key={item}
          type="button"
          disabled={options.disabled}
          onClick={() => options.onSelect(item)}
          className={cn(
            "animate-in fade-in slide-in-from-bottom-1 rounded-full border border-border/55 bg-muted/35 px-3 py-1.5 text-left text-xs leading-snug text-foreground transition hover:border-border hover:bg-muted/60 disabled:cursor-not-allowed disabled:opacity-50 duration-200",
            index === 1 && "delay-75",
            index === 2 && "delay-150",
            index >= 3 && "delay-200",
          )}
        >
          {item}
        </button>
      ))}
    </div>
  );
}
