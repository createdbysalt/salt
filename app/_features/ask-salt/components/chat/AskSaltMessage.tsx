"use client";

import * as React from "react";
import { Sparkles } from "lucide-react";
import type { UIMessage } from "ai";
import { uiMessageMetadata } from "../../message-adapters";
import { formatToolInput } from "../../tool-preview";
import { InlineConnectPrompt } from "../InlineConnectPrompt";
import { ArtifactCard, extractSavedArtifacts } from "./artifact-card";
import { MessageContent, MessageResponse } from "./message";
import { Shimmer } from "./shimmer";
import {
  Tool,
  ToolApprovalActions,
  ToolContent,
  ToolHeader,
  ToolPreview,
  type ToolPartState,
} from "./tool";

/**
 * Parts-based message renderer for Ask Salt, ported from vercel/chatbot
 * components/chat/message.tsx and trimmed to Salt tools:
 * - text parts stream as markdown
 * - Composio tool parts render as collapsibles with in-message approvals
 * - Salt extensions: inline connect prompt and Play review artifacts
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

function toolPartName(part: ToolLikePart): string {
  if (part.toolName) return part.toolName;
  if (part.type.startsWith("tool-")) return part.type.slice(5);
  return "tool";
}

export type ConnectorSlotProps = React.ComponentProps<typeof InlineConnectPrompt>;

export type MessageOptions = {
  items: string[];
  disabled?: boolean;
  onSelect: (text: string) => void;
};

export type AskSaltMessageProps = {
  message: UIMessage;
  /** True while this message is the streaming tail of the thread. */
  isStreaming?: boolean;
  /** Disables approval buttons while the chat transport is busy. */
  approvalsBusy?: boolean;
  onApproval?: (approvalId: string, approved: boolean) => void;
  /** Inline connect affordance — provided only for the active connector turn. */
  connectorSlot?: ConnectorSlotProps | null;
  /** Clickable next-step options — provided only for the active turn. */
  options?: MessageOptions | null;
};

export function AskSaltMessage({
  message,
  isStreaming = false,
  approvalsBusy = false,
  onApproval,
  connectorSlot = null,
  options = null,
}: AskSaltMessageProps) {
  const metadata = uiMessageMetadata(message);

  if (message.role === "user") {
    const text = message.parts
      .filter((part): part is { type: "text"; text: string } => part.type === "text")
      .map((part) => part.text)
      .join("\n")
      .trim();
    if (!text) return null;
    return (
      <div className="flex justify-end" data-role="user">
        <div className="max-w-[92%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-foreground px-3.5 py-2.5 text-[13px] leading-relaxed text-background">
          {text}
        </div>
      </div>
    );
  }

  const artifacts = extractSavedArtifacts(metadata);

  const parts = message.parts.map((part, index) => {
    const key = `${message.id}-part-${index}`;

    if (part.type === "text") {
      if (!part.text.trim()) return null;
      return (
        <MessageContent
          key={key}
          className="rounded-2xl rounded-bl-md border border-border/55 bg-muted/45 px-3.5 py-2.5 text-[13px] leading-relaxed"
        >
          <MessageResponse>{part.text}</MessageResponse>
        </MessageContent>
      );
    }

    if (isToolPart(part)) {
      return (
        <ToolPart
          key={part.toolCallId ?? key}
          part={part}
          approvalsBusy={approvalsBusy}
          onApproval={onApproval}
        />
      );
    }

    return null;
  });

  const hasOptions = Boolean(options && options.items.length > 0);
  const hasVisibleContent =
    parts.some(Boolean) || artifacts.length > 0 || connectorSlot !== null || hasOptions;

  if (!hasVisibleContent && !isStreaming) return null;

  return (
    <div className="flex items-start gap-2.5" data-role="assistant">
      <span className="surface-aurora grid size-7 shrink-0 place-items-center rounded-full">
        <Sparkles className="relative z-10 size-3.5 text-white" strokeWidth={2.5} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        {hasVisibleContent ? (
          <>
            {parts}
            {artifacts.length > 0 && (
              <div className="space-y-2">
                {artifacts.map((artifact, index) => (
                  <ArtifactCard key={`${artifact.type}-${index}`} artifact={artifact} />
                ))}
              </div>
            )}
            {connectorSlot && <InlineConnectPrompt {...connectorSlot} />}
            {hasOptions && options && <MessageOptionList options={options} />}
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

/**
 * Stacked clickable next-step options under the active assistant turn —
 * users tap a choice instead of typing it (e.g. "Connect Google").
 */
function MessageOptionList({ options }: { options: MessageOptions }) {
  return (
    <div className="space-y-1.5" data-testid="message-options">
      {options.items.map((item) => (
        <button
          key={item}
          type="button"
          disabled={options.disabled}
          onClick={() => options.onSelect(item)}
          className="flex w-full items-center rounded-xl border border-border/50 bg-muted/30 px-3 py-2.5 text-left text-[13px] leading-snug text-foreground transition hover:bg-muted/60 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {item}
        </button>
      ))}
    </div>
  );
}

function ToolPart({
  part,
  approvalsBusy,
  onApproval,
}: {
  part: ToolLikePart;
  approvalsBusy: boolean;
  onApproval?: (approvalId: string, approved: boolean) => void;
}) {
  const state = part.state ?? "input-streaming";
  const toolName = toolPartName(part);
  const approvalId = part.approval?.id;
  const isDenied =
    state === "output-denied" ||
    (state === "approval-responded" && part.approval?.approved === false);
  const effectiveState: ToolPartState = isDenied ? "output-denied" : state;
  const needsApproval = state === "approval-requested" && Boolean(approvalId);

  const inputPreview =
    part.input !== undefined ? formatToolInput(toolName, part.input) : null;
  const outputPreview =
    state === "output-available" && part.output !== undefined
      ? typeof part.output === "string"
        ? part.output
        : JSON.stringify(part.output, null, 2)
      : null;

  return (
    <Tool defaultOpen={needsApproval} className="w-[min(100%,450px)]">
      <ToolHeader toolName={toolName} state={effectiveState} />
      <ToolContent>
        {isDenied ? (
          <p className="text-xs text-muted-foreground">
            Salt didn&apos;t run this — you denied it.
          </p>
        ) : (
          <>
            {inputPreview && <ToolPreview preview={inputPreview} />}
            {outputPreview && <ToolPreview preview={outputPreview} />}
            {state === "output-error" && part.errorText && (
              <p className="text-xs text-destructive">{part.errorText}</p>
            )}
            {needsApproval && approvalId && onApproval && (
              <ToolApprovalActions
                busy={approvalsBusy}
                onApprove={() => onApproval(approvalId, true)}
                onDeny={() => onApproval(approvalId, false)}
              />
            )}
          </>
        )}
      </ToolContent>
    </Tool>
  );
}
