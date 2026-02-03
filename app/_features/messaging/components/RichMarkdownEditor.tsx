"use client";

import { useCallback, useRef, forwardRef } from "react";
import { Textarea } from "@/app/_components/ui/textarea";
import { cn } from "@repo/utils";

interface RichMarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  maxLength?: number;
  rows?: number;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
}

/**
 * RichMarkdownEditor - Textarea with markdown keyboard shortcuts
 *
 * Supported shortcuts:
 * - Ctrl+B: Bold (**text**)
 * - Ctrl+I: Italic (*text*)
 * - Ctrl+K: Link ([text](url))
 * - Ctrl+`: Code (`text`)
 *
 * Supported syntax:
 * - **bold**, *italic*, `code`, ```code blocks```, - lists, [links](url)
 */
export const RichMarkdownEditor = forwardRef<HTMLTextAreaElement, RichMarkdownEditorProps>(
  function RichMarkdownEditor(
    {
      value,
      onChange,
      placeholder = "Type a message...",
      className,
      disabled = false,
      maxLength,
      rows = 3,
      onKeyDown,
    },
    ref
  ) {
    const internalRef = useRef<HTMLTextAreaElement>(null);
    const textareaRef = (ref as React.RefObject<HTMLTextAreaElement>) || internalRef;

    /**
     * Wrap selected text with markdown syntax
     */
    const wrapSelection = useCallback(
      (prefix: string, suffix: string = prefix) => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = value.slice(start, end);

        // If no selection, just insert the markers and position cursor between
        if (start === end) {
          const newValue = value.slice(0, start) + prefix + suffix + value.slice(end);
          onChange(newValue);

          // Position cursor between markers
          requestAnimationFrame(() => {
            textarea.focus();
            textarea.setSelectionRange(start + prefix.length, start + prefix.length);
          });
          return;
        }

        // Wrap selected text
        const newValue =
          value.slice(0, start) + prefix + selectedText + suffix + value.slice(end);
        onChange(newValue);

        // Keep selection on the wrapped text
        requestAnimationFrame(() => {
          textarea.focus();
          textarea.setSelectionRange(
            start + prefix.length,
            end + prefix.length
          );
        });
      },
      [value, onChange, textareaRef]
    );

    /**
     * Insert link with placeholder URL
     */
    const insertLink = useCallback(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = value.slice(start, end) || "link text";

      const newValue =
        value.slice(0, start) + `[${selectedText}](url)` + value.slice(end);
      onChange(newValue);

      // Select the URL placeholder
      const urlStart = start + selectedText.length + 3;
      const urlEnd = urlStart + 3;
      requestAnimationFrame(() => {
        textarea.focus();
        textarea.setSelectionRange(urlStart, urlEnd);
      });
    }, [value, onChange, textareaRef]);

    /**
     * Handle keyboard shortcuts
     */
    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        const isMod = e.ctrlKey || e.metaKey;

        if (isMod && !e.shiftKey) {
          switch (e.key.toLowerCase()) {
            case "b":
              e.preventDefault();
              wrapSelection("**");
              return;
            case "i":
              e.preventDefault();
              wrapSelection("*");
              return;
            case "k":
              e.preventDefault();
              insertLink();
              return;
            case "`":
              e.preventDefault();
              wrapSelection("`");
              return;
          }
        }

        // Pass through to parent handler
        onKeyDown?.(e);
      },
      [wrapSelection, insertLink, onKeyDown]
    );

    return (
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={cn("resize-none", className)}
        disabled={disabled}
        maxLength={maxLength}
        rows={rows}
      />
    );
  }
);

RichMarkdownEditor.displayName = "RichMarkdownEditor";
