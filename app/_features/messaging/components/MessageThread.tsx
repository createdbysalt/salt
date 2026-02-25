"use client";

import * as React from "react";
import { format, isToday, isYesterday, isSameDay } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/app/_components/ui/avatar";
import { Button } from "@/app/_components/ui/button";
import { Skeleton } from "@/app/_components/ui/skeleton";
import { cn } from "@repo/utils";
import { Loader2 } from "lucide-react";
import type { Message } from "@/app/actions/messaging/message-actions";
import { MarkdownRenderer } from "./MarkdownRenderer";

// ============================================================================
// Types
// ============================================================================

interface MessageThreadProps {
  messages: Message[];
  currentUserId: string;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  isLoading?: boolean;
  className?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatDateSeparator(date: Date): string {
  if (isToday(date)) {
    return "Today";
  }
  if (isYesterday(date)) {
    return "Yesterday";
  }
  return format(date, "MMMM d, yyyy");
}

function formatMessageTime(date: Date): string {
  return format(date, "h:mm a");
}

// ============================================================================
// Sub-Components
// ============================================================================

function DateSeparator({ date }: { date: Date }) {
  return (
    <div className="flex items-center gap-4 py-4">
      <div className="flex-1 border-t border-border" />
      <span className="text-xs text-muted-foreground font-medium">
        {formatDateSeparator(date)}
      </span>
      <div className="flex-1 border-t border-border" />
    </div>
  );
}

function MessageBubble({
  message,
  isSent,
  showAvatar,
}: {
  message: Message;
  isSent: boolean;
  showAvatar: boolean;
}) {
  return (
    <div
      className={cn("flex items-end gap-2", isSent ? "flex-row-reverse" : "")}
    >
      {showAvatar ? (
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarImage src={message.senderAvatarUrl} alt={message.senderName} />
          <AvatarFallback className="text-xs">
            {getInitials(message.senderName)}
          </AvatarFallback>
        </Avatar>
      ) : (
        <div className="w-8 shrink-0" />
      )}
      <div
        className={cn(
          "max-w-[70%] rounded-2xl px-4 py-2",
          isSent
            ? "bg-primary text-primary-foreground rounded-br-md"
            : "bg-muted text-foreground rounded-bl-md"
        )}
      >
        <div className="text-sm break-words">
          <MarkdownRenderer
            content={message.content}
            className={cn(
              "prose-sm",
              isSent && "prose-invert"
            )}
          />
        </div>
        <p
          className={cn(
            "text-[10px] mt-1",
            isSent ? "text-primary-foreground/70" : "text-muted-foreground"
          )}
        >
          {formatMessageTime(message.createdAt)}
        </p>
      </div>
    </div>
  );
}

function MessageThreadSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Incoming message skeleton */}
      <div className="flex items-end gap-2">
        <Skeleton className="h-8 w-8 rounded-full" />
        <div className="flex flex-col gap-1">
          <Skeleton className="h-16 w-48 rounded-2xl rounded-bl-md" />
        </div>
      </div>
      {/* Outgoing message skeleton */}
      <div className="flex items-end gap-2 flex-row-reverse">
        <Skeleton className="h-8 w-8 rounded-full" />
        <div className="flex flex-col gap-1">
          <Skeleton className="h-12 w-64 rounded-2xl rounded-br-md" />
        </div>
      </div>
      {/* Another incoming */}
      <div className="flex items-end gap-2">
        <Skeleton className="h-8 w-8 rounded-full" />
        <div className="flex flex-col gap-1">
          <Skeleton className="h-20 w-56 rounded-2xl rounded-bl-md" />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function MessageThread({
  messages,
  currentUserId,
  onLoadMore,
  hasMore = false,
  isLoadingMore = false,
  isLoading = false,
  className,
}: MessageThreadProps) {
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

  // Messages come in descending order (newest first), reverse for display
  const chronologicalMessages = [...messages].reverse();

  // Group messages by date for separators
  const groupedMessages: { date: Date; messages: Message[] }[] = [];
  let currentGroup: { date: Date; messages: Message[] } | null = null;

  for (const message of chronologicalMessages) {
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
            Load more
          </Button>
        </div>
      )}

      {/* Empty State */}
      {chronologicalMessages.length === 0 && (
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
          No messages yet. Start the conversation!
        </div>
      )}

      {/* Messages grouped by date */}
      <div className="flex flex-col gap-2 p-4">
        {groupedMessages.map((group, groupIndex) => (
          <React.Fragment key={group.date.toISOString()}>
            <DateSeparator date={group.date} />
            {group.messages.map((message, messageIndex) => {
              const isSent = message.senderId === currentUserId;
              const previousMessage =
                messageIndex > 0 ? group.messages[messageIndex - 1] : null;
              // Show avatar if first message in group or different sender
              const showAvatar =
                !previousMessage || previousMessage.senderId !== message.senderId;

              return (
                <MessageBubble
                  key={message.id}
                  message={message}
                  isSent={isSent}
                  showAvatar={showAvatar}
                />
              );
            })}
          </React.Fragment>
        ))}
      </div>

      {/* Scroll anchor */}
      <div ref={bottomRef} />
    </div>
  );
}
