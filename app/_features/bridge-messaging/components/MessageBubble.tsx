"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui";
import { cn } from "@repo/utils";
import type { Message } from "@/app/actions/messaging/message-actions";
import { format } from "date-fns";

interface MessageBubbleProps {
  message: Message;
  isOwnMessage: boolean;
}

export function MessageBubble({ message, isOwnMessage }: MessageBubbleProps) {
  // Get initials from sender name
  const initials = message.senderName
    .split(" ")
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  // Format time
  const time = format(new Date(message.createdAt), "h:mm a");

  return (
    <div
      className={cn(
        "flex items-end gap-2 max-w-[80%]",
        isOwnMessage && "ml-auto flex-row-reverse"
      )}
    >
      <Avatar className="size-8 shrink-0">
        {message.senderAvatarUrl && (
          <AvatarImage src={message.senderAvatarUrl} alt={message.senderName} />
        )}
        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
      </Avatar>

      <div
        className={cn(
          "rounded-2xl px-4 py-2",
          isOwnMessage
            ? "rounded-br-sm bg-primary text-primary-foreground"
            : "rounded-bl-sm bg-muted"
        )}
      >
        <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
      </div>

      <span className="text-xs text-muted-foreground shrink-0">{time}</span>
    </div>
  );
}
