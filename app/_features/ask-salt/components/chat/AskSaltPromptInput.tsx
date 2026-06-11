"use client";

import * as React from "react";
import { ArrowUp, Loader2, Mic, Paperclip, Play, Square } from "lucide-react";
import type { UseChatHelpers } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@repo/ui";

/**
 * Ask Salt composer, ported from vercel/chatbot multimodal-input.tsx minus
 * model selector, attachments, and slash commands. Adds Salt's review mode
 * (submit becomes "Create Play") and keeps disabled paperclip/mic stubs.
 */

export type AskSaltPromptInputProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onStop?: () => void;
  chatStatus: UseChatHelpers<UIMessage>["status"];
  /** Connector intents resolve via a server action, outside the chat transport. */
  processing?: boolean;
  /** Review mode: submit swaps to a Play icon and creates the draft. */
  reviewMode?: boolean;
  onCreate?: () => void;
  placeholder: string;
};

export function AskSaltPromptInput({
  value,
  onChange,
  onSubmit,
  onStop,
  chatStatus,
  processing = false,
  reviewMode = false,
  onCreate,
  placeholder,
}: AskSaltPromptInputProps) {
  const isGenerating = chatStatus === "submitted" || chatStatus === "streaming";
  const isBusy = isGenerating || processing;
  const canStop = isGenerating && Boolean(onStop);

  const handlePrimaryAction = () => {
    if (canStop) {
      onStop?.();
      return;
    }
    if (reviewMode) {
      onCreate?.();
      return;
    }
    onSubmit();
  };

  const primaryDisabled = canStop
    ? false
    : reviewMode
      ? processing
      : !value.trim() || isBusy;

  let primaryIcon = <ArrowUp className="size-4" strokeWidth={2.5} />;
  let primaryLabel = "Ask Salt";
  if (canStop) {
    primaryIcon = <Square className="size-3.5 fill-current" />;
    primaryLabel = "Stop";
  } else if (isBusy) {
    primaryIcon = <Loader2 className="size-4 animate-spin" />;
  } else if (reviewMode) {
    primaryIcon = <Play className="size-4" strokeWidth={2.5} />;
    primaryLabel = "Create Play";
  }

  return (
    <InputGroup className="rounded-2xl border-border/60 bg-card shadow-[var(--shadow-lift)] transition focus-within:border-border has-[[data-slot=input-group-control]:focus-visible]:ring-4 has-[[data-slot=input-group-control]:focus-visible]:ring-foreground/5">
      <InputGroupTextarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={processing}
        placeholder={placeholder}
        rows={3}
        className="min-h-16 resize-none px-4 pb-1 pt-3 text-sm"
        onKeyDown={(event) => {
          if (
            event.key !== "Enter" ||
            event.shiftKey ||
            event.nativeEvent.isComposing
          ) {
            return;
          }
          event.preventDefault();
          if (!value.trim() || isBusy) return;
          onSubmit();
        }}
      />
      <InputGroupAddon align="block-end" className="justify-between px-2 pb-2">
        <div className="flex items-center gap-0.5">
          <InputGroupButton
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled
            aria-label="Attach file"
            title="Attach file"
          >
            <Paperclip className="size-4 text-muted-foreground" />
          </InputGroupButton>
          <InputGroupButton
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled
            aria-label="Voice input"
            title="Voice input coming soon"
          >
            <Mic className="size-4 text-muted-foreground" />
          </InputGroupButton>
        </div>
        <InputGroupButton
          type="button"
          size="icon-sm"
          onClick={handlePrimaryAction}
          disabled={primaryDisabled}
          aria-label={primaryLabel}
          title={primaryLabel}
          className="rounded-lg bg-foreground text-background hover:bg-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {primaryIcon}
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  );
}
