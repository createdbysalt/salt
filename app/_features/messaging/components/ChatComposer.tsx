"use client";

import * as React from "react";
import { Send, Loader2, Paperclip, Smile, Trash2, Zap } from "lucide-react";
import { Button, Textarea } from "@repo/ui";
import { cn } from "@repo/utils";
import { toast } from "sonner";

interface ChatComposerProps {
  onSend: (content: string) => Promise<{ error?: string } | void>;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

const MAX_CHARS = 5000;

export function ChatComposer({
  onSend,
  placeholder = "Group message",
  disabled = false,
  className,
}: ChatComposerProps) {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const [content, setContent] = React.useState("");
  const [isSending, setIsSending] = React.useState(false);

  const isEmpty = content.trim().length === 0;
  const isOverLimit = content.length > MAX_CHARS;
  const canSend = !isEmpty && !isOverLimit && !isSending && !disabled;

  const handleSend = React.useCallback(async () => {
    if (!canSend) return;

    const messageContent = content.trim();
    setIsSending(true);

    try {
      const result = await onSend(messageContent);

      if (result && "error" in result && result.error) {
        toast.error(result.error);
      } else {
        setContent("");
        textareaRef.current?.focus();
      }
    } catch {
      toast.error("Failed to send message. Please try again.");
    } finally {
      setIsSending(false);
    }
  }, [content, canSend, onSend]);

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Enter without Shift sends the message
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const handleClear = () => {
    setContent("");
    textareaRef.current?.focus();
  };

  return (
    <div className={cn("p-4", className)}>
      {/* Composer Card - floating style like screenshot */}
      <div className="rounded-lg border bg-card shadow-sm">
        {/* Textarea */}
        <div className="p-4 pb-2">
          <Textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled || isSending}
            className={cn(
              "min-h-[60px] max-h-[200px] resize-none border-0 bg-transparent p-0 shadow-none focus-visible:ring-0",
              isOverLimit && "text-destructive"
            )}
          />
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 pb-3">
          {/* Left actions */}
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="size-8" disabled>
              <Zap className="size-4" />
            </Button>
            <Button variant="ghost" size="icon" className="size-8" disabled>
              <Paperclip className="size-4" />
            </Button>
            <Button variant="ghost" size="icon" className="size-8" disabled>
              <Smile className="size-4" />
            </Button>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            {!isEmpty && (
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={handleClear}
              >
                <Trash2 className="size-4" />
              </Button>
            )}
            <Button
              onClick={handleSend}
              disabled={!canSend}
              size="icon"
              className="size-8 rounded-full"
            >
              {isSending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
