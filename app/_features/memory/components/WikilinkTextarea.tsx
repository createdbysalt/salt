"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { User2, Building2, Briefcase, FileText, Hash } from "lucide-react";
import { cn } from "@repo/utils";
import type { ResolvedEntity } from "@/app/_lib/notes";

type WikilinkTextareaProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  entities: ResolvedEntity[];
  autoFocus?: boolean;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
};

const ENTITY_ICONS: Record<ResolvedEntity["type"], typeof User2> = {
  person: User2,
  org: Building2,
  work: Briefcase,
  space: Hash,
  note: FileText,
};

export function WikilinkTextarea({
  value,
  onChange,
  placeholder,
  className,
  entities,
  autoFocus,
  onKeyDown,
}: WikilinkTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [autocompleteQuery, setAutocompleteQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [autocompletePosition, setAutocompletePosition] = useState({ top: 0, left: 0 });
  const [triggerStart, setTriggerStart] = useState(-1);

  const filteredEntities = useMemo(() => {
    if (!autocompleteQuery) return entities.slice(0, 8);
    const q = autocompleteQuery.toLowerCase();
    return entities
      .filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          (e.slug && e.slug.toLowerCase().includes(q))
      )
      .slice(0, 8);
  }, [entities, autocompleteQuery]);

  const updateAutocompletePosition = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const cursorPos = textarea.selectionStart;
    const textBeforeCursor = value.slice(0, cursorPos);
    const lines = textBeforeCursor.split("\n");
    const currentLine = lines[lines.length - 1];

    const lineHeight = 24;
    const charWidth = 8.4;

    const top = lines.length * lineHeight + 4;
    const left = Math.min(currentLine.length * charWidth, textarea.clientWidth - 250);

    setAutocompletePosition({ top, left: Math.max(0, left) });
  }, [value]);

  const handleInput = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      onChange(newValue);

      const cursorPos = e.target.selectionStart;
      const textBeforeCursor = newValue.slice(0, cursorPos);

      // Find the last @ that could start a mention
      const lastAt = textBeforeCursor.lastIndexOf("@");

      if (lastAt >= 0) {
        const textAfterAt = textBeforeCursor.slice(lastAt + 1);
        // Check if we're still in a mention (no spaces unless quoted, no newlines)
        const isQuoted = textAfterAt.startsWith('"');
        const endChar = isQuoted ? '"' : ' ';
        const hasEnded = isQuoted
          ? textAfterAt.slice(1).includes('"')
          : textAfterAt.includes(' ') || textAfterAt.includes('\n');

        if (!hasEnded && !textAfterAt.includes('\n')) {
          const query = isQuoted ? textAfterAt.slice(1) : textAfterAt;
          setShowAutocomplete(true);
          setAutocompleteQuery(query);
          setTriggerStart(lastAt);
          setSelectedIndex(0);
          requestAnimationFrame(updateAutocompletePosition);
          return;
        }
      }

      setShowAutocomplete(false);
      setAutocompleteQuery("");
      setTriggerStart(-1);
    },
    [onChange, updateAutocompletePosition]
  );

  const insertEntity = useCallback(
    (entity: ResolvedEntity) => {
      if (triggerStart < 0) return;

      const cursorPos = textareaRef.current?.selectionStart ?? value.length;
      const before = value.slice(0, triggerStart);
      const after = value.slice(cursorPos);
      // Use @"Name" for names with spaces, @Name for single words
      const hasSpace = entity.name.includes(" ");
      const mention = hasSpace ? `@"${entity.name}"` : `@${entity.name}`;
      const newValue = `${before}${mention} ${after}`;

      onChange(newValue);
      setShowAutocomplete(false);
      setAutocompleteQuery("");
      setTriggerStart(-1);

      requestAnimationFrame(() => {
        const textarea = textareaRef.current;
        if (textarea) {
          const newPos = triggerStart + mention.length + 1;
          textarea.focus();
          textarea.setSelectionRange(newPos, newPos);
        }
      });
    },
    [value, onChange, triggerStart]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (showAutocomplete && filteredEntities.length > 0) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setSelectedIndex((i) => (i + 1) % filteredEntities.length);
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          setSelectedIndex((i) => (i - 1 + filteredEntities.length) % filteredEntities.length);
          return;
        }
        if (e.key === "Enter" || e.key === "Tab") {
          e.preventDefault();
          insertEntity(filteredEntities[selectedIndex]);
          return;
        }
        if (e.key === "Escape") {
          e.preventDefault();
          setShowAutocomplete(false);
          return;
        }
      }

      onKeyDown?.(e);
    },
    [showAutocomplete, filteredEntities, selectedIndex, insertEntity, onKeyDown]
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        textareaRef.current &&
        !textareaRef.current.contains(e.target as Node)
      ) {
        setShowAutocomplete(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className={cn(
          "w-full min-h-[140px] resize-none bg-transparent text-[15px] leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none border border-border/60 rounded-lg p-3",
          className
        )}
      />

      {showAutocomplete && filteredEntities.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-64 max-h-80 overflow-y-auto bg-popover border border-border rounded-lg shadow-lg"
          style={{ top: autocompletePosition.top, left: autocompletePosition.left }}
        >
          <div className="p-1">
            <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Connect to
            </div>
            {filteredEntities.map((entity, index) => {
              const Icon = ENTITY_ICONS[entity.type];
              return (
                <button
                  key={`${entity.type}-${entity.id}`}
                  onClick={() => insertEntity(entity)}
                  onMouseEnter={() => setSelectedIndex(index)}
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
                    <div className="font-medium truncate">{entity.name}</div>
                    <div className="text-[11px] text-muted-foreground capitalize">
                      {entity.type}
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
      )}
    </div>
  );
}
