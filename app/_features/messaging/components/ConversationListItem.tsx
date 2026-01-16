"use client";

import * as React from "react";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/app/_components/ui/avatar";
import { Badge } from "@/app/_components/ui/badge";
import { cn } from "@repo/utils";

// ============================================================================
// Types
// ============================================================================

interface ConversationListItemProps {
  id: string;
  name: string;
  avatarUrl?: string;
  lastMessagePreview: string | null;
  lastMessageAt: Date | null;
  unreadCount?: number;
  isActive?: boolean;
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
  return formatDistanceToNow(date, { addSuffix: true });
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
  id,
  name,
  avatarUrl,
  lastMessagePreview,
  lastMessageAt,
  unreadCount = 0,
  isActive = false,
  onClick,
  className,
}: ConversationListItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full flex items-start gap-3 p-3 rounded-lg text-left transition-colors",
        "hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        isActive && "bg-muted",
        className
      )}
    >
      {/* Avatar */}
      <Avatar className="h-10 w-10 shrink-0">
        <AvatarImage src={avatarUrl} alt={name} />
        <AvatarFallback>{getInitials(name)}</AvatarFallback>
      </Avatar>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span
            className={cn(
              "font-medium text-sm truncate",
              unreadCount > 0 && "font-semibold"
            )}
          >
            {name}
          </span>
          {lastMessageAt && (
            <span className="text-xs text-muted-foreground shrink-0">
              {formatTimestamp(lastMessageAt)}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <p
            className={cn(
              "text-sm text-muted-foreground truncate",
              unreadCount > 0 && "text-foreground font-medium"
            )}
          >
            {truncatePreview(lastMessagePreview)}
          </p>
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="h-5 min-w-5 rounded-full px-1.5 text-xs shrink-0"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </div>
      </div>
    </button>
  );
}
