"use client";

import * as React from "react";
import Link from "next/link";
import { Briefcase, Building2, ChevronRight, Loader2, Search, User } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@repo/utils";
import {
  searchFileLinkTargets,
  updateMemoryFileConnection,
  type FileLinkSearchResult,
} from "../actions/file-actions";
import { hasDisplayableFileConnection, memoryConnectionHref, type MemoryFile } from "../data";

type FileConnectionPickerProps = {
  fileId: string;
  linkedTo: MemoryFile["linkedTo"];
  onUpdated?: () => void;
  /** Hide outer section title when parent already labels the block */
  showHeading?: boolean;
};

const KIND_LABEL: Record<MemoryFile["linkedTo"]["kind"], string> = {
  person: "Person",
  org: "Organization",
  work: "Work",
};

const KIND_ICON: Record<MemoryFile["linkedTo"]["kind"], typeof User> = {
  person: User,
  org: Building2,
  work: Briefcase,
};

const SCROLL_INTO_VIEW_PADDING_PX = 12;

function scrollPanelIntoViewIfNeeded(panel: HTMLElement) {
  const scrollParent = panel.closest<HTMLElement>("[data-file-preview-sidebar-scroll]");
  if (!scrollParent) {
    panel.scrollIntoView({ block: "end", behavior: "smooth" });
    return;
  }

  const panelRect = panel.getBoundingClientRect();
  const parentRect = scrollParent.getBoundingClientRect();

  if (panelRect.bottom > parentRect.bottom - SCROLL_INTO_VIEW_PADDING_PX) {
    scrollParent.scrollTo({
      top:
        scrollParent.scrollTop +
        (panelRect.bottom - parentRect.bottom) +
        SCROLL_INTO_VIEW_PADDING_PX,
      behavior: "smooth",
    });
  }
}

export function FileConnectionPicker({
  fileId,
  linkedTo,
  onUpdated,
  showHeading = true,
}: FileConnectionPickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<FileLinkSearchResult[]>([]);
  const [isSearching, setIsSearching] = React.useState(false);
  const [isLinking, setIsLinking] = React.useState(false);
  const panelRef = React.useRef<HTMLDivElement>(null);

  const ensurePanelVisible = React.useCallback(() => {
    const panel = panelRef.current;
    if (!panel) return;
    scrollPanelIntoViewIfNeeded(panel);
  }, []);

  React.useLayoutEffect(() => {
    if (!isOpen) return;

    ensurePanelVisible();
    const frame = window.requestAnimationFrame(ensurePanelVisible);
    return () => window.cancelAnimationFrame(frame);
  }, [ensurePanelVisible, isOpen, isSearching, results.length]);

  React.useEffect(() => {
    if (!isOpen || !panelRef.current) return;

    const observer = new ResizeObserver(() => {
      ensurePanelVisible();
    });
    observer.observe(panelRef.current);

    return () => observer.disconnect();
  }, [ensurePanelVisible, isOpen]);

  React.useEffect(() => {
    if (!isOpen) return;

    let mounted = true;
    setIsSearching(true);
    const timer = window.setTimeout(() => {
      void searchFileLinkTargets(query)
        .then((result) => {
          if (!mounted) return;
          if (result.ok && result.data) {
            setResults(result.data.results);
          } else if (!result.ok) {
            toast.error(result.message);
          }
        })
        .finally(() => {
          if (mounted) setIsSearching(false);
        });
    }, 200);

    return () => {
      mounted = false;
      window.clearTimeout(timer);
    };
  }, [isOpen, query]);

  const handleSelect = async (target: FileLinkSearchResult) => {
    setIsLinking(true);
    const result = await updateMemoryFileConnection(fileId, {
      kind: target.kind,
      id: target.id,
    });
    setIsLinking(false);

    if (!result.ok) {
      toast.error(result.message);
      return;
    }

    toast.success(`Connected to ${target.name}`);
    setIsOpen(false);
    setQuery("");
    onUpdated?.();
  };

  const hasConnection = hasDisplayableFileConnection(linkedTo);
  const connectionHref = memoryConnectionHref(linkedTo);
  const KindIcon = KIND_ICON[linkedTo.kind];

  return (
    <div className="space-y-3">
      {showHeading ? (
        <div>
          <p className="text-sm font-semibold text-foreground">Connect to</p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            Link this file to a person, organization, or work record.
          </p>
        </div>
      ) : null}

      {hasConnection && connectionHref ? (
        <Link
          href={connectionHref}
          className="group flex items-center gap-3 rounded-xl border border-border/60 bg-background/80 p-3 transition hover:border-border hover:bg-muted/20"
        >
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-muted/40">
            <KindIcon className="size-4 text-muted-foreground" strokeWidth={2} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground group-hover:underline">
              {linkedTo.name}
            </p>
            <p className="text-xs text-muted-foreground">{KIND_LABEL[linkedTo.kind]}</p>
          </div>
          <ChevronRight className="size-4 shrink-0 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
        </Link>
      ) : null}

      {!isOpen ? (
        <button
          type="button"
          disabled={isLinking}
          onClick={() => setIsOpen(true)}
          className={cn(
            "inline-flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border/70 bg-background/40 px-3 py-2.5 text-sm font-medium text-muted-foreground transition hover:border-border hover:bg-muted/20 hover:text-foreground",
            hasConnection && "py-2 text-xs font-normal",
          )}
        >
          <Search className="size-3.5 shrink-0" strokeWidth={2} />
          {hasConnection ? "Connect to someone else" : "Connect to"}
        </button>
      ) : (
        <div
          ref={panelRef}
          className="rounded-xl border border-border/60 bg-background/80 p-2 shadow-sm"
        >
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search people, orgs, work"
              autoFocus
              className="h-9 w-full rounded-lg border border-border/60 bg-background pl-9 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
            />
          </div>

          <div className="mt-2 max-h-44 overflow-y-auto">
            {isSearching ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              </div>
            ) : results.length === 0 ? (
              <p className="px-2 py-4 text-center text-xs text-muted-foreground">
                No matches. Try another name.
              </p>
            ) : (
              <ul className="space-y-0.5">
                {results.map((result) => {
                  const ResultIcon = KIND_ICON[result.kind];
                  return (
                    <li key={`${result.kind}-${result.id}`}>
                      <button
                        type="button"
                        disabled={isLinking}
                        onClick={() => void handleSelect(result)}
                        className={cn(
                          "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition hover:bg-muted/50",
                          hasConnection &&
                            linkedTo.id === result.id &&
                            linkedTo.kind === result.kind &&
                            "bg-muted/40",
                        )}
                      >
                        <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted/50">
                          <ResultIcon className="size-3.5 text-muted-foreground" strokeWidth={2} />
                        </div>
                        <span className="min-w-0 flex-1 truncate font-medium">{result.name}</span>
                        <span className="shrink-0 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                          {KIND_LABEL[result.kind]}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              setQuery("");
            }}
            className="mt-2 w-full rounded-lg px-2 py-1.5 text-xs text-muted-foreground transition hover:bg-muted/50 hover:text-foreground"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
