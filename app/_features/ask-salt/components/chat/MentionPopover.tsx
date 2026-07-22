"use client";

import * as React from "react";
import {
  Building2,
  Briefcase,
  Calendar,
  CircleUser,
  FileText,
  Hash,
  Loader2,
  Receipt,
  User2,
} from "lucide-react";
import { cn } from "@repo/utils";
import {
  searchMentions,
  type MentionResult,
  type MentionType,
} from "../../actions/search-mentions";

const TYPE_ICONS: Record<MentionType, typeof User2> = {
  me: CircleUser,
  person: User2,
  org: Building2,
  work: Briefcase,
  billing: Receipt,
  resource: FileText,
  meeting: Calendar,
};

export interface MentionPopoverProps {
  query: string;
  position: { top: number; left: number };
  onSelect: (mention: MentionResult) => void;
  onClose: () => void;
  selectedIndex: number;
  onSelectedIndexChange: (index: number) => void;
  onResultsChange?: (results: MentionResult[]) => void;
}

export function MentionPopover({
  query,
  position,
  onSelect,
  onClose,
  selectedIndex,
  onSelectedIndexChange,
  onResultsChange,
}: MentionPopoverProps) {
  const [results, setResults] = React.useState<MentionResult[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const search = async () => {
      setLoading(true);
      setError(null);
      const result = await searchMentions(query);
      if (result.ok) {
        setResults(result.data);
        onResultsChange?.(result.data);
        onSelectedIndexChange(0);
      } else {
        setResults([]);
        onResultsChange?.([]);
        setError(result.error);
      }
      setLoading(false);
    };

    const timeout = setTimeout(search, 150);
    return () => clearTimeout(timeout);
  }, [query, onSelectedIndexChange, onResultsChange]);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  if (loading && results.length === 0) {
    return (
      <div
        ref={containerRef}
        className="absolute bottom-full left-0 z-50 mb-2 w-64 rounded-lg border border-border bg-popover p-3 shadow-lg"
      >
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Searching…
        </div>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div
        ref={containerRef}
        className="absolute bottom-full left-0 z-50 mb-2 w-64 rounded-lg border border-border bg-popover p-3 shadow-lg"
      >
        <p className="text-center text-sm text-muted-foreground">
          {error ?? (query ? "No results found" : "Type to search")}
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="absolute bottom-full left-0 z-50 mb-2 w-64 max-h-80 overflow-y-auto rounded-lg border border-border bg-popover shadow-lg"
    >
      <div className="p-1">
        <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Mention
        </div>
        {results.map((result, index) => {
          const Icon = TYPE_ICONS[result.type];
          return (
            <button
              key={`${result.type}-${result.id}`}
              type="button"
              onClick={() => onSelect(result)}
              onMouseEnter={() => onSelectedIndexChange(index)}
              className={cn(
                "w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm transition-colors text-left",
                index === selectedIndex
                  ? "bg-accent text-accent-foreground"
                  : "text-foreground/80 hover:bg-muted/60"
              )}
            >
              <span className="size-6 rounded-full bg-muted grid place-items-center shrink-0">
                <Icon className="size-3.5 text-muted-foreground" strokeWidth={2} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="font-medium truncate">{result.name}</div>
                <div className="text-[11px] text-muted-foreground capitalize">
                  {result.type}
                </div>
              </div>
            </button>
          );
        })}
      </div>
      <div className="px-2 py-1.5 border-t border-border/60 text-[10px] text-muted-foreground">
        <kbd className="px-1 py-0.5 bg-muted rounded text-[9px]">↵</kbd> to select ·{" "}
        <kbd className="px-1 py-0.5 bg-muted rounded text-[9px]">esc</kbd> to dismiss
      </div>
    </div>
  );
}

export function useMentionState() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [position, setPosition] = React.useState({ top: 0, left: 0 });
  const [triggerIndex, setTriggerIndex] = React.useState(-1);
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const [results, setResults] = React.useState<MentionResult[]>([]);

  const open = (cursorPosition: { top: number; left: number }, startIndex: number) => {
    setIsOpen(true);
    setPosition(cursorPosition);
    setTriggerIndex(startIndex);
    setQuery("");
    setSelectedIndex(0);
    setResults([]);
  };

  const close = () => {
    setIsOpen(false);
    setQuery("");
    setTriggerIndex(-1);
    setSelectedIndex(0);
  };

  const updateQuery = (q: string) => {
    setQuery(q);
    setSelectedIndex(0);
  };

  const getSelectedResult = (): MentionResult | null => {
    if (results.length === 0) return null;
    const clampedIndex = Math.min(selectedIndex, results.length - 1);
    return results[clampedIndex] ?? null;
  };

  return {
    isOpen,
    query,
    position,
    triggerIndex,
    selectedIndex,
    setSelectedIndex,
    results,
    setResults,
    getSelectedResult,
    open,
    close,
    updateQuery,
  };
}

const NOISE_VALUES = new Set(["unknown", "other", "none", "n/a", "na", "null", "undefined"]);
const NOISE_LIFECYCLE = new Set(["active", "current"]);

function isUseful(value: string | null | undefined): value is string {
  if (!value) return false;
  return !NOISE_VALUES.has(value.toLowerCase().trim());
}

function buildMentionContextString(mention: MentionResult): string {
  const ctx = mention.context;

  if (ctx.type === "me") {
    return "";
  }

  if (ctx.type === "person") {
    if (ctx.orgName) return `at ${ctx.orgName}`;
    if (isUseful(ctx.relationship)) return ctx.relationship;
    return "person";
  }

  if (ctx.type === "org") {
    if (isUseful(ctx.industry)) return ctx.industry;
    if (isUseful(ctx.relationship)) return ctx.relationship;
    return "organization";
  }

  if (ctx.type === "work") {
    if (ctx.orgName) return `for ${ctx.orgName}`;
    if (ctx.stage && !NOISE_LIFECYCLE.has(ctx.stage.toLowerCase())) return ctx.stage;
    return "project";
  }

  if (ctx.type === "billing") {
    const dirLabel = ctx.direction === "receivable" ? "invoice" : ctx.direction === "payable" ? "bill" : null;
    if (ctx.amount && dirLabel) return `${dirLabel}, $${ctx.amount.toLocaleString()}`;
    if (ctx.amount) return `$${ctx.amount.toLocaleString()}`;
    if (dirLabel) return dirLabel;
    return "billing";
  }

  if (ctx.type === "resource") {
    if (ctx.linkedTo) return `linked to ${ctx.linkedTo}`;
    if (ctx.resourceType) return ctx.resourceType;
    return "file";
  }

  if (ctx.type === "meeting") {
    if (ctx.clientName && ctx.date) return `${ctx.date} with ${ctx.clientName}`;
    if (ctx.clientName) return `with ${ctx.clientName}`;
    if (ctx.date) return ctx.date;
    return "meeting";
  }

  return "";
}

export function formatMentionForInput(mention: MentionResult): string {
  const hasSpace = mention.name.includes(" ");
  const nameFormatted = hasSpace ? `"${mention.name}"` : mention.name;
  // Include ID and type for AI context - format: @"Name" [type:id]
  return `@${nameFormatted} [${mention.type}:${mention.id}]`;
}

export function formatMentionForDisplay(mention: MentionResult): string {
  return `@${mention.name}`;
}
