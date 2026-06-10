"use client";

import { useMemo, useState } from "react";
import { Briefcase, Building2, Search, User } from "lucide-react";
import type { Connection } from "@/app/_lib/demo/people-demo-data";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
} from "@repo/ui";
import { cn } from "@repo/utils";
import { candidateToConnection, getLinkCandidates, type LinkCandidate } from "./linkableMemory";

type LinkFilter = "all" | Connection["type"];

const FILTER_OPTIONS: { value: LinkFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "person", label: "People" },
  { value: "org", label: "Orgs" },
  { value: "work", label: "Work" },
];

const TYPE_META: Record<
  Connection["type"],
  { label: string; icon: typeof User; tone: string }
> = {
  person: { label: "Person", icon: User, tone: "bg-sky/15 text-sky" },
  org: { label: "Organization", icon: Building2, tone: "bg-violet/15 text-violet" },
  work: { label: "Work", icon: Briefcase, tone: "bg-flame/12 text-flame" },
};

type CreateLinkDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recordKind: "person" | "org" | "work";
  recordId: string;
  recordName: string;
  existingConnections: Connection[];
  onLink: (connection: Connection) => void;
};

export function CreateLinkDialog({
  open,
  onOpenChange,
  recordKind,
  recordId,
  recordName,
  existingConnections,
  onLink,
}: CreateLinkDialogProps) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<LinkFilter>("all");

  const candidates = useMemo(
    () => getLinkCandidates(recordKind, recordId, existingConnections),
    [recordKind, recordId, existingConnections]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return candidates.filter((candidate) => {
      if (filter !== "all" && candidate.type !== filter) return false;
      if (!q) return true;
      const hay = `${candidate.name} ${candidate.subtitle ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [candidates, filter, query]);

  const handleLink = (candidate: LinkCandidate) => {
    onLink(candidateToConnection(candidate));
    setQuery("");
    setFilter("all");
  };

  const noun = recordKind === "org" ? "organization" : "person";

  return (
    <Dialog
      open={open}
      onOpenChange={(next: boolean) => {
        if (!next) {
          setQuery("");
          setFilter("all");
        }
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-lg rounded-3xl p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/60 text-left">
          <DialogTitle className="font-display text-2xl tracking-tight">Create connection</DialogTitle>
          <DialogDescription>
            Connect another memory item to {recordName}. Connections show up on the Connections tab.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-4 space-y-3 border-b border-border/60">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground"
              strokeWidth={2}
            />
            <Input
              value={query}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
              placeholder="Search people, orgs, work…"
              className="pl-9 h-10 rounded-full bg-muted/40 border-border/60"
              autoFocus
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {FILTER_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setFilter(option.value)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium transition",
                  filter === option.value
                    ? "bg-foreground text-background"
                    : "bg-muted/50 text-muted-foreground hover:text-foreground"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="max-h-[min(52vh,420px)] overflow-y-auto px-3 py-3">
          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/60 px-4 py-10 text-center">
              <p className="text-sm text-muted-foreground">
                {candidates.length === 0
                  ? `Everything in memory is already connected to this ${noun}.`
                  : "No matches. Try a different search or filter."}
              </p>
            </div>
          ) : (
            <ul className="space-y-1">
              {filtered.map((candidate) => {
                const meta = TYPE_META[candidate.type];
                const Icon = meta.icon;
                return (
                  <li key={`${candidate.type}-${candidate.id}`}>
                    <button
                      type="button"
                      onClick={() => handleLink(candidate)}
                      className="w-full flex items-center gap-3 rounded-2xl border border-transparent px-3 py-2.5 text-left hover:border-border/60 hover:bg-muted/40 transition"
                    >
                      <span
                        className={cn(
                          "size-9 rounded-xl grid place-items-center shrink-0",
                          meta.tone
                        )}
                      >
                        <Icon className="size-4" strokeWidth={1.75} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-foreground truncate">
                          {candidate.name}
                        </span>
                        {candidate.subtitle && (
                          <span className="block text-xs text-muted-foreground truncate mt-0.5">
                            {candidate.subtitle}
                          </span>
                        )}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground shrink-0">
                        {meta.label}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
