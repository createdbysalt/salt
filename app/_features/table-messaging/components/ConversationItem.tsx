"use client";

import { Avatar, AvatarFallback, AvatarImage, Badge } from "@repo/ui";
import { cn } from "@repo/utils";
import type { ClientConversation } from "@/app/actions/messaging/conversation-actions";
import { formatDistanceToNow } from "date-fns";

interface ConversationItemProps {
  conversation: ClientConversation;
  isSelected: boolean;
  unreadCount: number;
  onClick: () => void;
}

export function ConversationItem({
  conversation,
  isSelected,
  unreadCount,
  onClick,
}: ConversationItemProps) {
  // Get initials from studio name
  const initials = conversation.studioName
    .split(" ")
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  // Format time ago
  const timeAgo = conversation.lastMessageAt
    ? formatDistanceToNow(new Date(conversation.lastMessageAt), {
        addSuffix: false,
      })
    : null;

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors",
        "hover:bg-muted/50",
        isSelected && "bg-muted"
      )}
    >
      <Avatar className="size-10 shrink-0">
        {conversation.studioLogoUrl && (
          <AvatarImage src={conversation.studioLogoUrl} alt={conversation.studioName} />
        )}
        <AvatarFallback className="text-sm">{initials}</AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium truncate">{conversation.studioName}</span>
          {timeAgo && (
            <span className="text-xs text-muted-foreground shrink-0">{timeAgo}</span>
          )}
        </div>
        {conversation.lastMessagePreview && (
          <p className="text-sm text-muted-foreground truncate mt-0.5">
            {conversation.lastMessagePreview}
          </p>
        )}
      </div>

      {unreadCount > 0 && (
        <Badge
          variant="default"
          className="size-5 p-0 justify-center text-xs shrink-0"
        >
          {unreadCount > 9 ? "9+" : unreadCount}
        </Badge>
      )}
    </button>
  );
}
