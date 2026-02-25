"use client";

import { Avatar, AvatarFallback, AvatarImage, Badge } from "@repo/ui";
import { cn } from "@repo/utils";

// ============================================================================
// Types
// ============================================================================

export type ConversationType = "general" | "direct";

export interface Conversation {
  id: string;
  type: ConversationType;
  name: string;
  avatarUrl?: string;
  memberCount?: number;
  lastMessagePreview: string | null;
  lastMessageAt: Date | null;
  lastMessageIsFromMe?: boolean;
  unreadCount?: number;
}

interface ConversationListItemProps {
  conversation: Conversation;
  isSelected?: boolean;
  onClick?: () => void;
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

function formatTimestamp(date: Date | null): string {
  if (!date) return "";

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  // Short format like in the screenshot: <1m, 1h, 1d
  if (diffMins < 1) return "now";
  if (diffMins < 60) return `<${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays === 1) return "1d";
  if (diffDays < 7) return `${diffDays}d`;
  return `${Math.floor(diffDays / 7)}w`;
}

function truncatePreview(preview: string | null, maxLength = 60): string {
  if (!preview) return "No messages yet";
  if (preview.length <= maxLength) return preview;
  return preview.slice(0, maxLength).trim() + "...";
}

// ============================================================================
// Component
// ============================================================================

export function ConversationListItem({
  conversation,
  isSelected = false,
  onClick,
  className,
}: ConversationListItemProps) {
  const { name, avatarUrl, lastMessagePreview, lastMessageAt, lastMessageIsFromMe, unreadCount = 0 } = conversation;
  const hasUnread = unreadCount > 0;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        // Base styles
        "w-full text-left px-4 py-3 relative",
        "transition-colors duration-100",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset",

        // Selected indicator - left border (like screenshot)
        isSelected && "border-l-2 border-l-primary",

        // Background states
        isSelected
          ? "bg-accent"
          : "bg-transparent hover:bg-accent/50",
        className
      )}
    >
      <div className="flex gap-3">
        {/* Avatar */}
        <Avatar className="size-10 shrink-0">
          <AvatarImage src={avatarUrl} alt={name} />
          <AvatarFallback className="text-sm">{getInitials(name)}</AvatarFallback>
        </Avatar>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span
              className={cn(
                "text-sm truncate",
                hasUnread ? "font-semibold text-foreground" : "font-medium text-foreground"
              )}
            >
              {name}
            </span>
            {lastMessageAt && (
              <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
                {formatTimestamp(lastMessageAt)}
              </span>
            )}
          </div>
          <div className="flex items-center justify-between gap-2 mt-0.5">
            <p
              className={cn(
                "text-sm truncate",
                hasUnread ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {lastMessageIsFromMe && <span className="text-muted-foreground">Me: </span>}
              {truncatePreview(lastMessagePreview)}
            </p>
            {hasUnread && (
              <Badge
                variant="destructive"
                className="h-5 min-w-5 rounded-full px-1.5 text-xs shrink-0"
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}
