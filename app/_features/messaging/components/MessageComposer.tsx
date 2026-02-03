"use client";

import * as React from "react";
import { Send, Loader2, Eye, Edit3 } from "lucide-react";
import { Button } from "@/app/_components/ui/button";
import { toast } from "sonner";
import { cn } from "@repo/utils";
import { RichMarkdownEditor } from "./RichMarkdownEditor";
import { MarkdownRenderer } from "./MarkdownRenderer";

// ============================================================================
// Types
// ============================================================================

interface MessageComposerProps {
  onSend: (content: string) => Promise<{ error?: string } | void>;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

const MAX_CHARS = 5000;
const CHAR_WARNING_THRESHOLD = 4500;

// ============================================================================
// Component
// ============================================================================

export function MessageComposer({
  onSend,
  placeholder = "Type a message...",
  disabled = false,
  className,
}: MessageComposerProps) {
  const [content, setContent] = React.useState("");
  const [isSending, setIsSending] = React.useState(false);
  const [isPreview, setIsPreview] = React.useState(false);
  const editorRef = React.useRef<HTMLTextAreaElement>(null);

  const charCount = content.length;
  const isOverLimit = charCount > MAX_CHARS;
  const showCharCount = charCount > CHAR_WARNING_THRESHOLD;
  const isEmpty = content.trim().length === 0;
  const canSend = !isEmpty && !isOverLimit && !isSending && !disabled;

  const handleSend = React.useCallback(async () => {
    if (!canSend) return;

    const messageContent = content.trim();
    setIsSending(true);
    setIsPreview(false);

    try {
      const result = await onSend(messageContent);
      if (result && 'error' in result && result.error) {
        toast.error(result.error);
      } else {
        setContent("");
        // Focus back on editor after sending
        editorRef.current?.focus();
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
      // Shift+Enter creates a newline (default behavior, no prevention needed)
    },
    [handleSend]
  );

  const togglePreview = React.useCallback(() => {
    setIsPreview((prev) => !prev);
  }, []);

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-end gap-2">
        <div className="relative flex-1">
          {isPreview ? (
            <div
              className={cn(
                "min-h-[44px] max-h-[200px] overflow-y-auto rounded-md border border-input bg-card p-3 text-sm",
                "transition-all duration-150 ease-out"
              )}
            >
              {isEmpty ? (
                <span className="text-muted-foreground">{placeholder}</span>
              ) : (
                <MarkdownRenderer content={content} />
              )}
            </div>
          ) : (
            <RichMarkdownEditor
              ref={editorRef}
              value={content}
              onChange={setContent}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={disabled || isSending}
              maxLength={MAX_CHARS + 500} // Allow some overflow so user can see they're over
              className={cn(
                "min-h-[44px] max-h-[200px] pr-4",
                "transition-all duration-150 ease-out",
                isOverLimit && "border-destructive focus-visible:border-destructive"
              )}
            />
          )}
        </div>

        {/* Preview toggle button */}
        <Button
          onClick={togglePreview}
          variant="ghost"
          size="icon"
          className="shrink-0"
          aria-label={isPreview ? "Edit message" : "Preview message"}
          disabled={isEmpty}
        >
          {isPreview ? (
            <Edit3 className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </Button>

        {/* Send button */}
        <Button
          onClick={handleSend}
          disabled={!canSend}
          size="icon"
          className="shrink-0"
          aria-label="Send message"
        >
          {isSending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Character count */}
      {showCharCount && (
        <div
          className={cn(
            "text-xs text-right",
            isOverLimit ? "text-destructive" : "text-muted-foreground"
          )}
        >
          {charCount.toLocaleString()} / {MAX_CHARS.toLocaleString()}
        </div>
      )}
    </div>
  );
}
