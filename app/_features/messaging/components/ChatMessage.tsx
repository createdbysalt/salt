"use client";

import { format } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui";
import { cn } from "@repo/utils";
import { MarkdownRenderer } from "./MarkdownRenderer";

export interface ChatMessageData {
  id: string;
  content: string;
  senderName: string;
  senderAvatarUrl?: string;
  createdAt: Date;
  isFromMe: boolean;
}

interface ChatMessageProps {
  message: ChatMessageData;
  showSender?: boolean;
  showAvatar?: boolean;
  className?: string;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function ChatMessage({
  message,
  showSender = true,
  showAvatar = true,
  className,
}: ChatMessageProps) {
  const { content, senderName, senderAvatarUrl, createdAt, isFromMe } = message;

  return (
    <div
      className={cn(
        "flex gap-2",
        isFromMe ? "flex-row-reverse" : "flex-row",
        className
      )}
    >
      {/* Avatar (only for inbound, and only if showAvatar) */}
      {!isFromMe && showAvatar && (
        <Avatar className="size-8 shrink-0 mt-1">
          <AvatarImage src={senderAvatarUrl} alt={senderName} />
          <AvatarFallback className="text-xs">
            {getInitials(senderName)}
          </AvatarFallback>
        </Avatar>
      )}

      {/* Spacer when avatar is hidden (to maintain alignment) */}
      {!isFromMe && !showAvatar && <div className="size-8 shrink-0" />}

      {/* Message content */}
      <div
        className={cn(
          "flex flex-col max-w-[70%]",
          isFromMe ? "items-end" : "items-start"
        )}
      >
        {/* Sender name + time (only for inbound, first in group) */}
        {!isFromMe && showSender && (
          <div className="flex items-center gap-2 mb-1 px-1">
            <span className="text-sm font-medium">{senderName}</span>
            <span className="text-xs text-muted-foreground">
              {format(createdAt, "h:mm a")}
            </span>
          </div>
        )}

        {/* Time for outbound (shown above bubble on right side) */}
        {isFromMe && showSender && (
          <div className="mb-1 px-1">
            <span className="text-xs text-muted-foreground">
              {format(createdAt, "h:mm a")}
            </span>
          </div>
        )}

        {/* Message bubble */}
        <div
          className={cn(
            "rounded-2xl px-4 py-2 text-sm",
            isFromMe
              ? "bg-primary text-primary-foreground rounded-br-md"
              : "bg-muted text-foreground rounded-bl-md"
          )}
        >
          <MarkdownRenderer
            content={content}
            className={cn(
              "prose-sm max-w-none",
              isFromMe && "prose-invert"
            )}
          />
        </div>
      </div>
    </div>
  );
}
