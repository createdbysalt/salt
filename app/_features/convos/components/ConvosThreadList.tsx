"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronDown, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@repo/utils";
import {
  CONVO_THREADS,
  relativeShort,
  type ConvoThread,
} from "../data";
import { ChannelLogoStack } from "./ChannelLogo";
import { useMockContent } from "@/app/_features/shell/contexts/DashboardUserContext";
import { MockContentEmptyState } from "@/app/_features/shell/components/MockContentEmptyState";

type SortKey = "newest" | "priority";

export function ConvosThreadList({
  className,
  onSelectThread,
}: {
  className?: string;
  onSelectThread?: () => void;
} = {}) {
  const mockContent = useMockContent();
  const params = useParams<{ personId?: string }>();
  const activeId = params.personId;
  const [sort, setSort] = useState<SortKey>("newest");
  const [query, setQuery] = useState("");

  const threads = useMemo(() => {
    const list = mockContent ? [...CONVO_THREADS] : [];
    if (sort === "newest") {
      list.sort((a, b) => new Date(b.lastTouchAt).getTime() - new Date(a.lastTouchAt).getTime());
    } else {
      list.sort((a, b) => (a.priorityRank ?? 99) - (b.priorityRank ?? 99));
    }
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((t) => {
      const last = t.messages[t.messages.length - 1];
      return (
        t.person.name.toLowerCase().includes(q) ||
        (t.person.org?.toLowerCase().includes(q) ?? false) ||
        last.body.toLowerCase().includes(q)
      );
    });
  }, [mockContent, sort, query]);

  const openCount = mockContent
    ? CONVO_THREADS.filter((t) => t.status !== "sent").length
    : 0;

  if (!mockContent) {
    return (
      <aside
        className={cn(
          "flex h-full min-h-0 w-full shrink-0 flex-col border-r border-border/60 bg-muted/40 dark:bg-muted/20 lg:w-[300px]",
          className,
        )}
      >
        <MockContentEmptyState
          title="No conversations yet"
          description="Connect email or messaging and Salt will queue drafts and threads here."
          className="m-4 flex-1"
        />
      </aside>
    );
  }

  return (
    <aside
      className={cn(
        "flex h-full min-h-0 w-full shrink-0 flex-col border-r border-border/60 bg-muted/40 dark:bg-muted/20 lg:w-[300px]",
        className
      )}
    >
      <div className="flex shrink-0 flex-col gap-3 border-b border-border/60 px-4 pb-3 pt-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg leading-none tracking-tight text-foreground">
            Your inbox
          </h2>
          <button
            type="button"
            onClick={() => setSort(sort === "newest" ? "priority" : "newest")}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            {sort === "newest" ? "Newest" : "Priority"}
            <ChevronDown className="size-3" strokeWidth={2.5} />
          </button>
        </div>
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
            strokeWidth={2}
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search conversations"
            className="h-9 w-full rounded-full border border-border/60 bg-card pl-9 pr-3 text-sm transition placeholder:text-muted-foreground focus:border-foreground/40 focus:outline-none"
          />
        </div>
        <div className="flex items-center justify-between text-xs">
          <button
            type="button"
            className="inline-flex items-center gap-1 font-medium text-foreground/80 hover:text-foreground"
          >
            {openCount} Open <ChevronDown className="size-3" strokeWidth={2.5} />
          </button>
          {query && (
            <span className="text-muted-foreground">
              {threads.length} match{threads.length === 1 ? "" : "es"}
            </span>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <ul>
          {threads.map((t) => (
            <ThreadRow
              key={t.personId}
              thread={t}
              active={activeId === t.personId}
              onSelect={onSelectThread}
            />
          ))}
        </ul>
      </div>
    </aside>
  );
}

function ThreadRow({
  thread,
  active,
  onSelect,
}: {
  thread: ConvoThread;
  active: boolean;
  onSelect?: () => void;
}) {
  const lastMsg = thread.messages[thread.messages.length - 1];
  const isDraftReady = thread.status === "draft_ready";

  return (
    <li>
      <Link
        href={`/conversations/${thread.personId}`}
        onClick={onSelect}
        className={cn(
          "relative block border-b border-border/40 px-4 py-3 transition",
          active ? "bg-background" : "hover:bg-background/60"
        )}
      >
        {active && <span className="absolute bottom-0 left-0 top-0 w-0.5 bg-foreground" />}
        <div className="flex min-w-0 items-start gap-2.5">
          <div className="relative shrink-0">
            <div className="grid size-8 place-items-center rounded-full bg-foreground text-[10px] font-semibold text-background">
              {thread.person.initials}
            </div>
            {isDraftReady && (
              <span
                className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-sky-500 ring-2 ring-card"
                title="Draft ready"
              />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <p
                className={cn(
                  "truncate text-sm",
                  isDraftReady ? "font-semibold text-foreground" : "font-medium text-foreground/90"
                )}
              >
                {thread.person.name}
              </p>
              <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
                {relativeShort(thread.lastTouchAt)}
              </span>
            </div>
            <p className="mt-0.5 line-clamp-1 text-xs leading-snug text-muted-foreground">
              {lastMsg.direction === "out" ? "You: " : ""}
              {lastMsg.body}
            </p>
            <div className="mt-1.5">
              <ChannelLogoStack
                channels={thread.person.channels}
                activeChannel={lastMsg.channel}
                size="xs"
              />
            </div>
          </div>
        </div>
      </Link>
    </li>
  );
}
