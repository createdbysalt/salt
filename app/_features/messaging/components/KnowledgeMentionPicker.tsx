"use client";

import * as React from "react";
import {
  FileText,
  Link as LinkIcon,
  Lightbulb,
  MessageSquare,
  CheckCircle,
  Image,
  Sparkles,
  ClipboardList,
  Loader2,
  X,
} from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/app/_components/ui/command";
import { Badge } from "@/app/_components/ui/badge";
import { cn } from "@repo/utils";
import type { KnowledgeItem, KnowledgeType } from "@/app/_features/knowledge/types";

// ============================================================================
// Types
// ============================================================================

export interface KnowledgeMention {
  id: string;
  title: string;
  type: KnowledgeType;
}

export interface KnowledgeMentionPickerProps {
  /** Callback when an item is selected */
  onSelect: (item: KnowledgeMention) => void;
  /** Callback when picker is closed */
  onClose: () => void;
  /** Function to search knowledge items */
  searchFn: (query: string) => Promise<KnowledgeItem[]>;
  /** Whether the picker is open */
  isOpen: boolean;
  /** Additional class names */
  className?: string;
}

export interface KnowledgeMentionChipProps {
  /** The mention to display */
  mention: KnowledgeMention;
  /** Callback when chip is removed */
  onRemove: () => void;
  /** Additional class names */
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

const KNOWLEDGE_TYPE_ICONS: Record<KnowledgeType, React.ElementType> = {
  intake_response: ClipboardList,
  discovery_note: Lightbulb,
  meeting_transcript: MessageSquare,
  document: FileText,
  link: LinkIcon,
  insight: Sparkles,
  decision: CheckCircle,
  feedback: MessageSquare,
  asset: Image,
};

const KNOWLEDGE_TYPE_LABELS: Record<KnowledgeType, string> = {
  intake_response: "Intake",
  discovery_note: "Note",
  meeting_transcript: "Transcript",
  document: "Document",
  link: "Link",
  insight: "Insight",
  decision: "Decision",
  feedback: "Feedback",
  asset: "Asset",
};

const DEBOUNCE_MS = 300;

// ============================================================================
// Components
// ============================================================================

/**
 * KnowledgeMentionPicker Component
 *
 * A dropdown picker for selecting knowledge items to mention in messages.
 * Triggered by '@' character in the composer.
 *
 * Features:
 * - Debounced search input (300ms)
 * - Keyboard navigation (arrow keys, Enter to select, Escape to close)
 * - Shows file type icons and type labels
 * - Slide-down animation on open
 * - Handles empty results gracefully
 */
export function KnowledgeMentionPicker({
  onSelect,
  onClose,
  searchFn,
  isOpen,
  className,
}: KnowledgeMentionPickerProps) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [results, setResults] = React.useState<KnowledgeItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const debounceRef = React.useRef<NodeJS.Timeout | null>(null);

  // Focus input when picker opens
  React.useEffect(() => {
    if (isOpen) {
      setSearchQuery("");
      setResults([]);
      // Small delay to allow animation to start
      const timeout = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timeout);
    }
  }, [isOpen]);

  // Debounced search
  React.useEffect(() => {
    if (!isOpen) return;

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (!searchQuery.trim()) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    debounceRef.current = setTimeout(async () => {
      try {
        const items = await searchFn(searchQuery.trim());
        setResults(items);
      } catch {
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchQuery, searchFn, isOpen]);

  // Handle keyboard events
  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    },
    [onClose]
  );

  // Handle item selection
  const handleSelect = React.useCallback(
    (item: KnowledgeItem) => {
      onSelect({
        id: item.id,
        title: item.title,
        type: item.type,
      });
      setSearchQuery("");
      setResults([]);
    },
    [onSelect]
  );

  if (!isOpen) return null;

  return (
    <div
      className={cn(
        "absolute bottom-full left-0 mb-2 w-80 z-50",
        // Slide-down animation
        "animate-in slide-in-from-top-2 fade-in-0 duration-150 ease-out",
        className
      )}
      onKeyDown={handleKeyDown}
    >
      <Command className="rounded-lg border bg-popover shadow-lg">
        <CommandInput
          ref={inputRef}
          placeholder="Search knowledge base..."
          value={searchQuery}
          onValueChange={setSearchQuery}
        />
        <CommandList>
          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : searchQuery.trim() === "" ? (
            <CommandEmpty>Type to search knowledge base</CommandEmpty>
          ) : results.length === 0 ? (
            <CommandEmpty>No items found</CommandEmpty>
          ) : (
            <CommandGroup heading="Knowledge Items">
              {results.map((item) => {
                const Icon = KNOWLEDGE_TYPE_ICONS[item.type] || FileText;
                const typeLabel = KNOWLEDGE_TYPE_LABELS[item.type] || item.type;

                return (
                  <CommandItem
                    key={item.id}
                    value={item.id}
                    onSelect={() => handleSelect(item)}
                    className="flex items-center gap-3 cursor-pointer"
                  >
                    <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <span className="truncate block text-sm">{item.title}</span>
                    </div>
                    <Badge variant="secondary" className="shrink-0 text-xs">
                      {typeLabel}
                    </Badge>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          )}
        </CommandList>
      </Command>
    </div>
  );
}

/**
 * KnowledgeMentionChip Component
 *
 * Displays a selected knowledge item as a removable chip.
 * Shows file type icon and title with remove button.
 */
export function KnowledgeMentionChip({
  mention,
  onRemove,
  className,
}: KnowledgeMentionChipProps) {
  const Icon = KNOWLEDGE_TYPE_ICONS[mention.type] || FileText;

  return (
    <Badge
      variant="secondary"
      className={cn(
        "gap-1.5 pr-1 pl-2 h-6",
        // Scale-in animation on mount
        "animate-in zoom-in-95 duration-150",
        className
      )}
    >
      <Icon className="h-3 w-3 shrink-0" />
      <span className="truncate max-w-[120px] text-xs">{mention.title}</span>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onRemove();
        }}
        className="ml-0.5 rounded-full p-0.5 hover:bg-muted-foreground/20 transition-colors"
        aria-label={`Remove ${mention.title}`}
      >
        <X className="h-3 w-3" />
      </button>
    </Badge>
  );
}
