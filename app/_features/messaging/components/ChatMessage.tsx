"use client";

import * as React from "react";
import { format } from "date-fns";
import { Mail, MessageSquare, Check, CheckCheck, MoreHorizontal, Trash2 } from "lucide-react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Button,
} from "@repo/ui";
import { cn } from "@repo/utils";
import { MarkdownRenderer } from "./MarkdownRenderer";
import type { MessageChannel } from "./ChannelBadge";

export type MessageStatus = "sending" | "sent" | "delivered" | "read" | "failed";

export interface ChatMessageData {
  id: string;
  content: string;
  senderName?: string;
  senderAvatarUrl?: string;
  senderEmail?: string;
  createdAt: Date;
  isFromMe: boolean;
  channel?: MessageChannel | "system";
  emailSubject?: string;
  recipientName?: string;
  /** When the message was read by recipient */
  readAt?: Date | null;
  /** Message delivery status */
  status?: MessageStatus;
  /** Whether this is a system/activity message */
  isSystemMessage?: boolean;
  /** Gmail thread ID for email threading */
  gmailThreadId?: string;
  /** Gmail message ID for reply-to headers */
  gmailMessageId?: string;
}

interface ChatMessageProps {
  message: ChatMessageData;
  showSender?: boolean;
  showAvatar?: boolean;
  onDelete?: (messageId: string, deleteForEveryone: boolean) => void;
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
  onDelete,
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
    readAt,
    status,
    isSystemMessage,
  } = message;

  // Render system messages (activity events) differently
  if (isSystemMessage || channel === "system") {
    return (
      <div className={cn("flex justify-center py-2", className)}>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{content}</span>
          <span className="opacity-60">·</span>
          <span className="opacity-60">{format(createdAt, "MMM d, h:mm a")}</span>
        </div>
      </div>
    );
  }

  // Determine effective status (derive from readAt if status not provided)
  const effectiveStatus: MessageStatus = status ?? (readAt ? "read" : "delivered");

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
            {getInitials(senderName ?? "?")}
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

        {/* Message bubble with hover menu */}
        <div className="group/message relative flex items-center gap-1">
          {/* Actions menu (appears on hover, positioned based on message direction) */}
          {onDelete && (
            <div
              className={cn(
                "opacity-0 group-hover/message:opacity-100 transition-opacity",
                isFromMe ? "order-first" : "order-last"
              )}
            >
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-muted-foreground hover:text-foreground"
                  >
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align={isFromMe ? "end" : "start"}>
                  <DropdownMenuItem
                    onClick={() => onDelete(message.id, false)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="size-4 mr-2" />
                    Delete for me
                  </DropdownMenuItem>
                  {/* Delete for everyone - only for Bridge messages that I sent */}
                  {channel === "bridge" && isFromMe && (
                    <DropdownMenuItem
                      onClick={() => onDelete(message.id, true)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="size-4 mr-2" />
                      Delete for everyone
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          <div
            className={cn(
              "rounded-2xl px-4 py-2 text-sm overflow-hidden",
              isFromMe
                ? "bg-primary text-primary-foreground rounded-br-md"
                : "bg-muted text-foreground rounded-bl-md"
            )}
          >
            <MarkdownRenderer
              content={content}
              className={cn(
                "prose-sm max-w-none break-words [&_pre]:max-w-full [&_pre]:overflow-x-auto",
                isFromMe && "prose-invert"
              )}
            />
          </div>
        </div>

        {/* Channel indicator and read receipt (subtle, below message) */}
        <div className="flex items-center gap-2 mt-1 px-1">
          {/* Channel indicator */}
          {channelIndicator && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              {channel === "bridge" ? (
                <MessageSquare className="size-3" />
              ) : (
                <Mail className="size-3" />
              )}
              {channelIndicator}
            </div>
          )}

          {/* Read receipt (only for outbound messages) */}
          {isFromMe && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center text-xs text-muted-foreground">
                  {effectiveStatus === "sending" && (
                    <span className="text-muted-foreground/50">Sending...</span>
                  )}
                  {effectiveStatus === "sent" && (
                    <Check className="size-3.5 text-muted-foreground/70" />
                  )}
                  {effectiveStatus === "delivered" && (
                    <Check className="size-3.5 text-muted-foreground" />
                  )}
                  {effectiveStatus === "read" && (
                    <CheckCheck className="size-3.5 text-primary" />
                  )}
                  {effectiveStatus === "failed" && (
                    <span className="text-destructive">Failed</span>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                {effectiveStatus === "sending" && "Sending..."}
                {effectiveStatus === "sent" && "Sent"}
                {effectiveStatus === "delivered" && "Delivered"}
                {effectiveStatus === "read" && (
                  readAt ? `Seen ${format(readAt, "MMM d 'at' h:mm a")}` : "Seen"
                )}
                {effectiveStatus === "failed" && "Failed to send"}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </div>
  );
}
