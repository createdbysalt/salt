"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { format } from "date-fns";
import { Clock, Sun, CalendarDays, ArrowRight, Sparkles } from "lucide-react";
import { cn } from "@repo/utils";
import { SNOOZE_OPTIONS } from "../types";
import { parseSnoozeDate } from "../actions";

interface InboxSnoozePopoverProps {
  isOpen: boolean;
  position: { x: number; y: number };
  onSnooze: (date: Date) => void;
  onClose: () => void;
}

/**
 * InboxSnoozePopover - Snooze picker with preset options and natural language input
 *
 * Options:
 * - Later today (L)
 * - Tomorrow morning (T)
 * - This weekend (W)
 * - Next week (N)
 * - Custom input with chrono-node parsing
 */
export function InboxSnoozePopover({
  isOpen,
  position,
  onSnooze,
  onClose,
}: InboxSnoozePopoverProps) {
  const [customInput, setCustomInput] = useState("");
  const [parsedDate, setParsedDate] = useState<Date | null>(null);
  const [parsedFormatted, setParsedFormatted] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Focus input when popover opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Handle click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen, onClose]);

  // Handle keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!isOpen) return;

      // Escape to close
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      // If not focused on input, handle shortcuts
      if (document.activeElement !== inputRef.current) {
        const option = SNOOZE_OPTIONS.find(
          (opt) => opt.shortcut.toLowerCase() === e.key.toLowerCase()
        );
        if (option) {
          e.preventDefault();
          onSnooze(option.getDate());
          onClose();
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onSnooze, onClose]);

  // Parse custom input using Server Action with chrono-node
  function handleCustomInputChange(value: string) {
    setCustomInput(value);

    if (!value.trim()) {
      setParsedDate(null);
      setParsedFormatted(null);
      return;
    }

    // Debounce parsing (300ms)
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      startTransition(async () => {
        const result = await parseSnoozeDate({ input: value });
        setParsedDate(result.date);
        setParsedFormatted(result.formatted);
      });
    }, 300);
  }

  if (!isOpen) return null;

  // Calculate position (ensure popover stays in viewport)
  const style: React.CSSProperties = {
    position: "fixed",
    top: Math.min(position.y, window.innerHeight - 350),
    left: Math.min(position.x, window.innerWidth - 280),
    zIndex: 100,
  };

  return (
    <div
      ref={popoverRef}
      style={style}
      className={cn(
        "w-72 rounded-xl bg-popover text-popover-foreground",
        "shadow-2xl ring-1 ring-foreground/5",
        "animate-in fade-in-0 zoom-in-95 duration-150"
      )}
    >
      {/* Header */}
      <div className="px-3 py-2.5 border-b border-border/50">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Clock className="size-4 text-muted-foreground" />
          <span>Snooze until...</span>
        </div>
      </div>

      {/* Preset Options */}
      <div className="p-1">
        {SNOOZE_OPTIONS.map((option) => {
          const previewDate = option.getDate();
          return (
            <button
              key={option.label}
              onClick={() => {
                onSnooze(option.getDate());
                onClose();
              }}
              className={cn(
                "w-full flex items-center justify-between px-3 py-2 rounded-lg",
                "text-sm transition-colors duration-[100ms]",
                "hover:bg-accent"
              )}
            >
              <div className="flex items-center gap-3">
                {option.shortcut === "L" && <Sun className="size-4 text-amber-500" />}
                {option.shortcut === "T" && <Sun className="size-4 text-orange-500" />}
                {option.shortcut === "W" && <CalendarDays className="size-4 text-primary" />}
                {option.shortcut === "N" && <ArrowRight className="size-4 text-muted-foreground" />}
                <span>{option.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {format(previewDate, "EEE, h:mm a")}
                </span>
                <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono">
                  {option.shortcut}
                </kbd>
              </div>
            </button>
          );
        })}
      </div>

      {/* Divider */}
      <div className="h-px bg-border/50 mx-3" />

      {/* Custom Input */}
      <div className="p-3">
        <div className="relative">
          <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            value={customInput}
            onChange={(e) => handleCustomInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && parsedDate) {
                e.preventDefault();
                onSnooze(parsedDate);
                onClose();
              }
            }}
            placeholder="tomorrow 9am, in 2 hours..."
            className={cn(
              "w-full h-9 pl-9 pr-3 rounded-lg",
              "bg-muted/50 border-0 text-sm placeholder:text-muted-foreground",
              "focus:outline-none focus:ring-2 focus:ring-ring/20",
              "transition-all duration-[160ms]"
            )}
          />
        </div>

        {/* Parsed date preview */}
        {customInput && (
          <div className="mt-2 flex items-center justify-between text-xs">
            {isPending ? (
              <span className="text-muted-foreground">Parsing...</span>
            ) : parsedDate ? (
              <>
                <span className="text-muted-foreground">
                  {parsedFormatted || format(parsedDate, "EEEE, MMMM d 'at' h:mm a")}
                </span>
                <button
                  onClick={() => {
                    onSnooze(parsedDate);
                    onClose();
                  }}
                  className="text-primary hover:underline"
                >
                  Snooze
                </button>
              </>
            ) : (
              <span className="text-destructive">Couldn&apos;t parse date</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
