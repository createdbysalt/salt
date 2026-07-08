"use client";

import * as React from "react";
import { ArrowUp, FileText, Loader2, Mic, Paperclip, Play, Square, X } from "lucide-react";
import type { UseChatHelpers } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import { toast } from "sonner";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@repo/ui";
import {
  ALLOWED_EXTENSIONS,
  MAX_FILE_SIZE,
  MAX_FILE_SIZE_DISPLAY,
  validateFile,
} from "@/app/_features/relationships/lib/file-validation";

const MAX_ATTACHMENTS = 5;

export type AskSaltPromptInputProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onStop?: () => void;
  chatStatus: UseChatHelpers<UIMessage>["status"];
  processing?: boolean;
  reviewMode?: boolean;
  onCreate?: () => void;
  placeholder: string;
  attachments?: File[];
  onAttachmentsChange?: (files: File[]) => void;
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
  attachments = [],
  onAttachmentsChange,
}: AskSaltPromptInputProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
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
      : (!value.trim() && attachments.length === 0) || isBusy;

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

  const addFiles = (incoming: FileList | null) => {
    if (!incoming?.length || !onAttachmentsChange) return;

    const next = [...attachments];
    for (const file of Array.from(incoming)) {
      if (next.length >= MAX_ATTACHMENTS) {
        toast.error(`Maximum ${MAX_ATTACHMENTS} attachments allowed.`);
        break;
      }

      const validation = validateFile(file);
      if (!validation.valid) {
        toast.error(validation.error ?? "Unsupported file type.");
        continue;
      }

      if (file.size > MAX_FILE_SIZE) {
        toast.error(`File is too large. Maximum size is ${MAX_FILE_SIZE_DISPLAY}.`);
        continue;
      }

      next.push(file);
    }

    onAttachmentsChange(next);
  };

  const removeAttachment = (index: number) => {
    if (!onAttachmentsChange) return;
    onAttachmentsChange(attachments.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 px-1">
          {attachments.map((file, index) => (
            <span
              key={`${file.name}-${index}`}
              className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-border/60 bg-muted/50 px-2.5 py-1 text-xs text-foreground"
            >
              <FileText className="size-3 shrink-0 text-muted-foreground" />
              <span className="truncate">{file.name}</span>
              <button
                type="button"
                onClick={() => removeAttachment(index)}
                className="grid size-4 shrink-0 place-items-center rounded-full hover:bg-muted"
                aria-label={`Remove ${file.name}`}
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <InputGroup className="rounded-2xl border-border/60 bg-card shadow-[var(--shadow-lift)] transition focus-within:border-border has-[[data-slot=input-group-control]:focus-visible]:ring-4 has-[[data-slot=input-group-control]:focus-visible]:ring-foreground/5">
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          multiple
          accept={ALLOWED_EXTENSIONS.join(",")}
          onChange={(event) => {
            addFiles(event.target.files);
            event.target.value = "";
          }}
        />
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
            if ((!value.trim() && attachments.length === 0) || isBusy) return;
            onSubmit();
          }}
        />
        <InputGroupAddon align="block-end" className="justify-between px-2 pb-2">
          <div className="flex items-center gap-0.5">
            <InputGroupButton
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled={processing || attachments.length >= MAX_ATTACHMENTS}
              aria-label="Attach file"
              title="Attach file"
              onClick={() => fileInputRef.current?.click()}
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
            className="rounded-lg bg-foreground text-background hover:bg-foreground/90 hover:text-background disabled:cursor-not-allowed disabled:opacity-40"
          >
            {primaryIcon}
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    </div>
  );
}
