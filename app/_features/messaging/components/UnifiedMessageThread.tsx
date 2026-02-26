"use client";

import * as React from "react";
import { format, isToday, isYesterday, isSameDay } from "date-fns";
import { Button, Skeleton, Separator } from "@repo/ui";
import { cn } from "@repo/utils";
import { Loader2, MessageSquare } from "lucide-react";
import { UnifiedMessageCard, type UnifiedMessage } from "./UnifiedMessageCard";

interface UnifiedMessageThreadProps {
  messages: UnifiedMessage[];
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  isLoading?: boolean;
  className?: string;
}

function formatDateSeparator(date: Date): string {
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "EEEE, MMMM d, yyyy");
}

function MessageThreadSkeleton() {
  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Date separator skeleton */}
      <div className="flex items-center gap-4">
        <Separator className="flex-1" />
        <Skeleton className="h-4 w-16" />
        <Separator className="flex-1" />
      </div>

      {/* Message skeletons */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-24 w-full rounded-lg" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-16 w-3/4 rounded-lg" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-32 w-full rounded-lg" />
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="size-12 rounded-full bg-muted flex items-center justify-center mb-4">
        <MessageSquare className="size-6 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium">No messages yet</h3>
      <p className="mt-1 text-sm text-muted-foreground max-w-sm">
        Start a conversation with this client. Messages sent here will appear in their Bridge portal or email inbox.
      </p>
    </div>
  );
}

function DateSeparator({ date }: { date: Date }) {
  return (
    <div className="flex items-center gap-4 py-2">
      <Separator className="flex-1" />
      <span className="text-xs text-muted-foreground font-medium px-2">
        {formatDateSeparator(date)}
      </span>
      <Separator className="flex-1" />
    </div>
  );
}

export function UnifiedMessageThread({
  messages,
  onLoadMore,
  hasMore = false,
  isLoadingMore = false,
  isLoading = false,
  className,
}: UnifiedMessageThreadProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const bottomRef = React.useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  React.useEffect(() => {
    if (bottomRef.current && !isLoadingMore) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length, isLoadingMore]);

  if (isLoading) {
    return <MessageThreadSkeleton />;
  }

  if (messages.length === 0) {
    return <EmptyState />;
  }

  // Sort messages chronologically (oldest first for display)
  const sortedMessages = [...messages].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
  );

  // Group messages by date
  const groupedMessages: { date: Date; messages: UnifiedMessage[] }[] = [];
  let currentGroup: { date: Date; messages: UnifiedMessage[] } | null = null;

  for (const message of sortedMessages) {
    if (!currentGroup || !isSameDay(currentGroup.date, message.createdAt)) {
      currentGroup = { date: message.createdAt, messages: [] };
      groupedMessages.push(currentGroup);
    }
    currentGroup.messages.push(message);
  }

  return (
    <div
      ref={containerRef}
      className={cn("flex flex-col overflow-y-auto", className)}
    >
      {/* Load More Button */}
      {hasMore && (
        <div className="flex justify-center py-4">
          <Button
            variant="outline"
            size="sm"
            onClick={onLoadMore}
            disabled={isLoadingMore}
          >
            {isLoadingMore && <Loader2 className="size-4 animate-spin" />}
            Load older messages
          </Button>
        </div>
      )}

      {/* Messages grouped by date */}
      <div className="flex flex-col gap-4 p-6">
        {groupedMessages.map((group) => (
          <React.Fragment key={group.date.toISOString()}>
            <DateSeparator date={group.date} />
            <div className="flex flex-col gap-4">
              {group.messages.map((message) => (
                <UnifiedMessageCard key={message.id} message={message} />
              ))}
            </div>
          </React.Fragment>
        ))}
      </div>

      {/* Scroll anchor */}
      <div ref={bottomRef} />
    </div>
  );
}
