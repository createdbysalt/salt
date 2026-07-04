"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { User2, Building2, Briefcase } from "lucide-react";
import { cn } from "@repo/utils";
import type { ResolvedEntity } from "@/app/_lib/notes";

type MentionInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  entities: ResolvedEntity[];
  autoFocus?: boolean;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  disabled?: boolean;
};

const ENTITY_ICONS: Record<string, typeof User2> = {
  person: User2,
  org: Building2,
  work: Briefcase,
};

export function MentionInput({
  value,
  onChange,
  placeholder,
  className,
  entities,
  autoFocus,
  onKeyDown,
  disabled,
}: MentionInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [autocompleteQuery, setAutocompleteQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [triggerStart, setTriggerStart] = useState(-1);

  const filteredEntities = useMemo(() => {
    if (!autocompleteQuery) return entities.slice(0, 6);
    const q = autocompleteQuery.toLowerCase();
    return entities
      .filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          (e.slug && e.slug.toLowerCase().includes(q))
      )
      .slice(0, 6);
  }, [entities, autocompleteQuery]);

  const handleInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      onChange(newValue);

      const cursorPos = e.target.selectionStart ?? 0;
      const textBeforeCursor = newValue.slice(0, cursorPos);

      const lastAt = textBeforeCursor.lastIndexOf("@");

      if (lastAt >= 0) {
        const textAfterAt = textBeforeCursor.slice(lastAt + 1);
        const isQuoted = textAfterAt.startsWith('"');
        const hasEnded = isQuoted
          ? textAfterAt.slice(1).includes('"')
          : textAfterAt.includes(" ");

        if (!hasEnded) {
          const query = isQuoted ? textAfterAt.slice(1) : textAfterAt;
          setShowAutocomplete(true);
          setAutocompleteQuery(query);
          setTriggerStart(lastAt);
          setSelectedIndex(0);
          return;
        }
      }

      setShowAutocomplete(false);
      setAutocompleteQuery("");
      setTriggerStart(-1);
    },
    [onChange]
  );

  const insertEntity = useCallback(
    (entity: ResolvedEntity) => {
      if (triggerStart < 0) return;

      const cursorPos = inputRef.current?.selectionStart ?? value.length;
      const before = value.slice(0, triggerStart);
      const after = value.slice(cursorPos);
      const hasSpace = entity.name.includes(" ");
      const mention = hasSpace ? `@"${entity.name}"` : `@${entity.name}`;
      const newValue = `${before}${mention} ${after}`;

      onChange(newValue);
      setShowAutocomplete(false);
      setAutocompleteQuery("");
      setTriggerStart(-1);

      requestAnimationFrame(() => {
        const input = inputRef.current;
        if (input) {
          const newPos = triggerStart + mention.length + 1;
          input.focus();
          input.setSelectionRange(newPos, newPos);
        }
      });
    },
    [value, onChange, triggerStart]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
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
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowAutocomplete(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoFocus={autoFocus}
        disabled={disabled}
        className={cn(
          "w-full bg-transparent border-0 border-b border-foreground/20 px-0 py-1.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-foreground/50 transition-colors",
          className
        )}
      />

      {showAutocomplete && filteredEntities.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute left-0 top-full z-50 mt-1 w-64 overflow-hidden rounded-xl border border-border/60 bg-popover shadow-lg"
        >
          <div className="max-h-[200px] overflow-y-auto p-1">
            {filteredEntities.map((entity, index) => {
              const Icon = ENTITY_ICONS[entity.type] ?? User2;
              return (
                <button
                  key={entity.id}
                  type="button"
                  onClick={() => insertEntity(entity)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
                    index === selectedIndex
                      ? "bg-accent text-accent-foreground"
                      : "text-foreground hover:bg-accent/50"
                  )}
                >
                  <Icon className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
                  <span className="truncate font-medium">{entity.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground capitalize">
                    {entity.type}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="border-t border-border/40 px-2.5 py-1.5 text-[10px] text-muted-foreground">
            Type @ to mention people or orgs
          </div>
        </div>
      )}
    </div>
  );
}
