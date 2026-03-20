"use client";

import { useState, useCallback, useRef, type KeyboardEvent } from "react";
import { Button, Textarea } from "@repo/ui";
import { Send, Loader2 } from "lucide-react";

interface MessageComposerProps {
  onSend: (content: string) => void;
  isSending: boolean;
  placeholder?: string;
}

export function MessageComposer({
  onSend,
  isSending,
  placeholder = "Type a message...",
}: MessageComposerProps) {
  const [content, setContent] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = useCallback(() => {
    if (!content.trim() || isSending) return;

    onSend(content.trim());
    setContent("");

    // Focus back on textarea
    textareaRef.current?.focus();
  }, [content, isSending, onSend]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      // Enter to send, Shift+Enter for newline
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  return (
    <div className="border-t p-4 shrink-0">
      <div className="flex gap-2 items-end">
        <Textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="min-h-[44px] max-h-[120px] resize-none"
          rows={1}
          disabled={isSending}
        />
        <Button
          size="icon"
          onClick={handleSend}
          disabled={!content.trim() || isSending}
          aria-label="Send message"
        >
          {isSending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Send className="size-4" />
          )}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        Press Enter to send, Shift+Enter for new line
      </p>
    </div>
  );
}
