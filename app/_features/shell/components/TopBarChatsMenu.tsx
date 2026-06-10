"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { cn } from "@repo/utils";
import {
  CONVO_THREADS,
  relativeShort,
} from "@/app/_features/convos/data";
import { ChannelLogoStack } from "@/app/_features/convos/components/ChannelLogo";
import { memoryRoutes } from "../routes";
import { useMockContent } from "../contexts/DashboardUserContext";

const conversationsRoute = memoryRoutes.conversations;

export function TopBarChatsMenu() {
  const mockContent = useMockContent();
  const [open, setOpen] = useState(false);

  const recent = useMemo(
    () =>
      mockContent
        ? [...CONVO_THREADS]
            .sort(
              (a, b) =>
                new Date(b.lastTouchAt).getTime() - new Date(a.lastTouchAt).getTime(),
            )
            .slice(0, 6)
        : [],
    [mockContent],
  );

  const unreadCount = useMemo(
    () =>
      mockContent
        ? CONVO_THREADS.filter((thread) => thread.status === "draft_ready").length
        : 0,
    [mockContent],
  );

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <div className="relative hidden md:block">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-label="Open Conversations"
        aria-expanded={open}
        aria-haspopup="dialog"
        title="Open Conversations"
        className={cn(
          "relative grid size-10 place-items-center rounded-xl transition md:size-11 md:rounded-2xl",
          open ? "bg-muted text-foreground" : "hover:bg-muted"
        )}
      >
        <MessageCircle className="size-[18px]" strokeWidth={1.75} />
        {unreadCount > 0 && (
          <span className="absolute right-1.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-sky-500 px-1 text-[10px] font-semibold tabular-nums text-white ring-2 ring-background">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setOpen(false)}
            aria-hidden
            tabIndex={-1}
          />
          <div
            role="dialog"
            aria-label="Recent conversations"
            className="absolute right-0 z-50 mt-2 w-[340px] overflow-hidden rounded-2xl border border-border/60 bg-popover shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-border/60 px-3.5 pb-2 pt-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground">Inbox</span>
                {unreadCount > 0 && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-sky-600 dark:text-sky-400">
                    <span className="size-1.5 rounded-full bg-sky-500" />
                    {unreadCount} to review
                  </span>
                )}
              </div>
              <Link
                href={conversationsRoute}
                onClick={() => setOpen(false)}
                className="text-[11px] text-muted-foreground hover:text-foreground"
              >
                See all
              </Link>
            </div>
            <ul className="max-h-[420px] overflow-y-auto py-1">
              {recent.map((thread) => {
                const last = thread.messages[thread.messages.length - 1];
                const isDraftReady = thread.status === "draft_ready";

                return (
                  <li key={thread.personId}>
                    <Link
                      href={`${conversationsRoute}/${thread.personId}`}
                      onClick={() => setOpen(false)}
                      className="flex items-start gap-2.5 px-3.5 py-2.5 transition hover:bg-muted"
                    >
                      <div className="relative shrink-0">
                        <div className="grid size-9 place-items-center rounded-full bg-foreground text-[11px] font-semibold text-background">
                          {thread.person.initials}
                        </div>
                        {isDraftReady && (
                          <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-sky-500 ring-2 ring-popover" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <p
                            className={cn(
                              "truncate text-sm",
                              isDraftReady
                                ? "font-semibold text-foreground"
                                : "font-medium text-foreground/90"
                            )}
                          >
                            {thread.person.name}
                          </p>
                          <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
                            {relativeShort(thread.lastTouchAt)}
                          </span>
                        </div>
                        <p className="line-clamp-1 text-xs leading-snug text-muted-foreground">
                          {last.direction === "out" ? "You: " : ""}
                          {last.body}
                        </p>
                        <div className="mt-1">
                          <ChannelLogoStack
                            channels={thread.person.channels}
                            activeChannel={last.channel}
                            size="xs"
                          />
                        </div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
