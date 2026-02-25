"use client";

import * as React from "react";
import { format, isToday, isYesterday, isSameDay } from "date-fns";
import { Button, Separator, Skeleton } from "@repo/ui";
import { cn } from "@repo/utils";
import { Loader2, MessageSquare } from "lucide-react";
import { ChatMessage, type ChatMessageData } from "./ChatMessage";

interface ChatThreadProps {
  messages: ChatMessageData[];
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

function ChatThreadSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col gap-4 p-6", className)}>
      {/* Date separator skeleton */}
      <div className="flex items-center gap-4">
        <Separator className="flex-1" />
        <Skeleton className="h-4 w-16" />
        <Separator className="flex-1" />
      </div>

      {/* Inbound message skeleton */}
      <div className="flex gap-2">
        <Skeleton className="size-8 rounded-full shrink-0" />
        <div className="space-y-1">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-16 w-48 rounded-2xl rounded-bl-md" />
        </div>
      </div>

      {/* Outbound message skeleton */}
      <div className="flex gap-2 flex-row-reverse">
        <div className="space-y-1 flex flex-col items-end">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-12 w-64 rounded-2xl rounded-br-md" />
        </div>
      </div>

      {/* Another inbound */}
      <div className="flex gap-2">
        <Skeleton className="size-8 rounded-full shrink-0" />
        <div className="space-y-1">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-20 w-56 rounded-2xl rounded-bl-md" />
        </div>
      </div>
    </div>
  );
}

function EmptyState({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center text-center", className)}>
      <div className="size-12 rounded-full bg-muted flex items-center justify-center mb-4">
        <MessageSquare className="size-6 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium">No messages yet</h3>
      <p className="mt-1 text-sm text-muted-foreground max-w-sm">
        Start a conversation by sending a message below.
      </p>
    </div>
  );
}

function DateSeparatorLine({ date }: { date: Date }) {
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

export function ChatThread({
  messages,
  onLoadMore,
  hasMore = false,
  isLoadingMore = false,
  isLoading = false,
  className,
}: ChatThreadProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const bottomRef = React.useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  React.useEffect(() => {
    if (bottomRef.current && !isLoadingMore) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length, isLoadingMore]);

  if (isLoading) {
    return <ChatThreadSkeleton className={className} />;
  }

  if (messages.length === 0) {
    return <EmptyState className={className} />;
  }

  // Sort messages chronologically (oldest first for display)
  const sortedMessages = [...messages].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
  );

  // Group messages by date and consecutive sender
  const renderMessages = () => {
    const elements: React.ReactNode[] = [];
    let lastDate: Date | null = null;
    let lastSenderId: string | null = null;

    sortedMessages.forEach((message) => {
      const messageDate = message.createdAt;

      // Add date separator if new day
      if (!lastDate || !isSameDay(lastDate, messageDate)) {
        elements.push(
          <DateSeparatorLine key={`date-${messageDate.toISOString()}`} date={messageDate} />
        );
        lastSenderId = null; // Reset sender grouping on new day
      }

      // Determine if we should show sender name (first message from this person in a group)
      const currentSenderId = message.isFromMe ? "me" : message.senderName;
      const showSender = lastSenderId !== currentSenderId;
      const showAvatar = showSender;

      elements.push(
        <ChatMessage
          key={message.id}
          message={message}
          showSender={showSender}
          showAvatar={showAvatar}
        />
      );

      lastDate = messageDate;
      lastSenderId = currentSenderId;
    });

    return elements;
  };

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

      {/* Messages */}
      <div className="flex flex-col gap-2 p-6">
        {renderMessages()}
      </div>

      {/* Scroll anchor */}
      <div ref={bottomRef} />
    </div>
  );
}
