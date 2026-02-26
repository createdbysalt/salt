"use client";

import { format } from "date-fns";
import { Mail, MessageSquare } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui";
import { cn } from "@repo/utils";
import { MarkdownRenderer } from "./MarkdownRenderer";
import type { MessageChannel } from "./ChannelBadge";

export interface ChatMessageData {
  id: string;
  content: string;
  senderName: string;
  senderAvatarUrl?: string;
  senderEmail?: string;
  createdAt: Date;
  isFromMe: boolean;
  channel?: MessageChannel;
  emailSubject?: string;
  recipientName?: string;
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
  const {
    content,
    senderName,
    senderAvatarUrl,
    createdAt,
    isFromMe,
    channel,
    emailSubject,
    recipientName,
  } = message;

  // Build channel indicator text
  const getChannelIndicator = () => {
    if (!channel) return null;
    if (channel === "bridge") return "via Bridge";
    if (channel === "email") {
      if (isFromMe && recipientName) return `via Email`;
      return "via Email reply";
    }
    return null;
  };

  const channelIndicator = getChannelIndicator();

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

        {/* Email subject (for first email in thread) */}
        {emailSubject && channel === "email" && (
          <div className="text-xs text-muted-foreground mb-1 px-1 flex items-center gap-1">
            <Mail className="size-3" />
            {emailSubject}
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

        {/* Channel indicator (subtle, below message) */}
        {channelIndicator && (
          <div className="flex items-center gap-1 mt-1 px-1 text-xs text-muted-foreground">
            {channel === "bridge" ? (
              <MessageSquare className="size-3" />
            ) : (
              <Mail className="size-3" />
            )}
            {channelIndicator}
          </div>
        )}
      </div>
    </div>
  );
}
