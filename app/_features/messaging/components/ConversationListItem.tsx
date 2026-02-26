"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui";
import { cn } from "@repo/utils";

// ============================================================================
// Types
// ============================================================================

export type ConversationType = "general" | "direct";

export interface ConversationMember {
  name: string;
  avatarUrl?: string;
}

export interface Conversation {
  id: string;
  type: ConversationType;
  name: string;
  avatarUrl?: string;
  memberCount?: number;
  members?: ConversationMember[]; // For stacked avatars in General channel
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

// Stacked avatars for group conversations
function StackedAvatars({ members, max = 3 }: { members: ConversationMember[]; max?: number }) {
  const displayMembers = members.slice(0, max);
  const remaining = members.length - max;

  if (displayMembers.length === 0) {
    return (
      <div className="size-10 rounded-full bg-muted flex items-center justify-center">
        <span className="text-xs text-muted-foreground">0</span>
      </div>
    );
  }

  return (
    <div className="relative size-10 shrink-0">
      {displayMembers.map((member, index) => (
        <Avatar
          key={index}
          className={cn(
            "absolute border-2 border-background",
            index === 0 && "size-7 top-0 left-0 z-30",
            index === 1 && "size-7 top-0 right-0 z-20",
            index === 2 && "size-6 bottom-0 left-1/2 -translate-x-1/2 z-10"
          )}
        >
          <AvatarImage src={member.avatarUrl} alt={member.name} />
          <AvatarFallback className="text-[10px]">{getInitials(member.name)}</AvatarFallback>
        </Avatar>
      ))}
      {remaining > 0 && (
        <div className="absolute bottom-0 right-0 size-5 rounded-full bg-muted border-2 border-background flex items-center justify-center z-40">
          <span className="text-[9px] font-medium text-muted-foreground">+{remaining}</span>
        </div>
      )}
    </div>
  );
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
  const { type, name, avatarUrl, members, lastMessagePreview, lastMessageAt, lastMessageIsFromMe, unreadCount = 0 } = conversation;
  const hasUnread = unreadCount > 0;
  const isGeneral = type === "general";

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
      {/* Unread indicator dot on the left edge */}
      {hasUnread && !isSelected && (
        <span className="absolute left-0.5 top-1/2 -translate-y-1/2 size-1.5 rounded-full bg-primary" />
      )}
      <div className="flex gap-3">
        {/* Avatar - stacked for General, single for DMs */}
        {isGeneral && members ? (
          <StackedAvatars members={members} max={3} />
        ) : (
          <Avatar className="size-10 shrink-0">
            <AvatarImage src={avatarUrl} alt={name} />
            <AvatarFallback className="text-sm">{getInitials(name)}</AvatarFallback>
          </Avatar>
        )}

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
          </div>
        </div>
      </div>
    </button>
  );
}
