"use client";

import { Search, X } from "lucide-react";
import { TYPE_META, type NodeType } from "../types";
import { cn } from "@repo/utils";

const TYPES: NodeType[] = ["person", "org", "work", "billing", "file", "note"];

export function GraphFilterBar({
  counts,
  active,
  onToggle,
  query,
  onQuery,
  suggestions,
  onPick,
}: {
  counts: Record<NodeType, number>;
  active: Set<NodeType>;
  onToggle: (t: NodeType) => void;
  query: string;
  onQuery: (v: string) => void;
  suggestions: { id: string; label: string; type: NodeType; sublabel?: string }[];
  onPick: (id: string) => void;
}) {
  return (
    <div className="absolute top-4 left-4 right-4 z-10 flex items-start gap-3 pointer-events-none">
      {/* Search */}
      <div className="pointer-events-auto relative flex-1 max-w-sm">
        <div className="flex items-center gap-2 h-10 px-3.5 rounded-full bg-background/80 backdrop-blur-xl border border-border/60 shadow-[var(--shadow-card)]">
          <Search className="size-3.5 text-muted-foreground shrink-0" strokeWidth={2.25} />
          <input
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="Find a record…"
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground/70"
          />
          {query && (
            <button
              onClick={() => onQuery("")}
              className="size-5 grid place-items-center rounded-full hover:bg-foreground/5 text-muted-foreground"
              aria-label="Clear"
            >
              <X className="size-3" strokeWidth={2.5} />
            </button>
          )}
        </div>
        {query && suggestions.length > 0 && (
          <div className="absolute top-12 left-0 right-0 rounded-2xl bg-background/95 backdrop-blur-xl border border-border/60 shadow-[var(--shadow-lift)] overflow-hidden max-h-[280px] overflow-y-auto">
            {suggestions.slice(0, 8).map((s) => (
              <button
                key={s.id}
                onClick={() => onPick(s.id)}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 hover:bg-foreground/5 text-left border-b border-border/40 last:border-0"
              >
                <span
                  className="size-2 rounded-full shrink-0"
                  style={{ background: TYPE_META[s.type].color }}
                />
                <span className="text-sm text-foreground truncate">{s.label}</span>
                {s.sublabel && (
                  <span className="text-xs text-muted-foreground truncate ml-auto">
                    {s.sublabel}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Category pills */}
      <div className="pointer-events-auto flex items-center gap-1.5 p-1 rounded-full bg-background/80 backdrop-blur-xl border border-border/60 shadow-[var(--shadow-card)]">
        {TYPES.map((t) => {
          const isActive = active.has(t);
          return (
            <button
              key={t}
              onClick={() => onToggle(t)}
              className={cn(
                "h-8 px-3 inline-flex items-center gap-1.5 rounded-full text-xs font-medium transition",
                isActive
                  ? "bg-foreground/8 text-foreground"
                  : "text-muted-foreground/60 hover:text-foreground"
              )}
            >
              <span
                className={cn("size-2 rounded-full transition", !isActive && "opacity-40")}
                style={{ background: TYPE_META[t].color }}
              />
              {TYPE_META[t].label}
              <span className="tabular-nums text-[10px] text-muted-foreground">
                {counts[t]}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
