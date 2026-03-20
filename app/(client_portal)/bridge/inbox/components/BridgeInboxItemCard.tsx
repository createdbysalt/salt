"use client";

import * as React from "react";
import {
  MessageSquare,
  Mail,
  Receipt,
  Flag,
  Calendar,
} from "lucide-react";
import { cn } from "@repo/utils";
import type { InboxItem } from "@/app/_features/inbox/types";

// =============================================================================
// HELPERS
// =============================================================================

function formatTimestamp(date: Date, item: InboxItem): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  // For meetings, show "In X hours" if upcoming
  if (item.type === "meeting" && item.metadata?.start_time) {
    const startTime = new Date(item.metadata.start_time as string | Date);
    const untilMs = startTime.getTime() - now.getTime();
    if (untilMs > 0) {
      const untilHours = Math.floor(untilMs / (1000 * 60 * 60));
      const untilMins = Math.floor(untilMs / (1000 * 60));
      if (untilHours >= 1) return `In ${untilHours}h`;
      return `In ${untilMins}m`;
    }
  }

  // Standard relative time
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date);
}

function isItemUnread(item: InboxItem): boolean {
  if (item.metadata?.is_read === true) return false;
  if (item.metadata?.is_read === false) return true;
  return item.urgency === "unread";
}

function getUrgencyLevel(item: InboxItem): "overdue" | "urgent" | "normal" {
  if (item.urgency === "overdue") return "overdue";
  if (item.urgency === "today" || item.urgency === "alert") return "urgent";
  return "normal";
}

function getTypeIcon(type: InboxItem["type"]) {
  switch (type) {
    case "message":
      return MessageSquare;
    case "email":
      return Mail;
    case "invoice":
      return Receipt;
    case "milestone":
      return Flag;
    case "meeting":
      return Calendar;
    default:
      return MessageSquare;
  }
}

function getTypeLabel(type: InboxItem["type"]): string {
  switch (type) {
    case "message":
      return "Message";
    case "email":
      return "Email";
    case "invoice":
      return "Invoice";
    case "milestone":
      return "Milestone";
    case "meeting":
      return "Meeting";
    default:
      return "Update";
  }
}

// =============================================================================
// COMPONENT
// =============================================================================

interface BridgeInboxItemCardProps {
  item: InboxItem;
  isSelected?: boolean;
  onClick?: () => void;
}

export function BridgeInboxItemCard({
  item,
  isSelected,
  onClick,
}: BridgeInboxItemCardProps) {
  const isUnread = isItemUnread(item);
  const urgencyLevel = getUrgencyLevel(item);
  const TypeIcon = getTypeIcon(item.type);
  const typeLabel = getTypeLabel(item.type);

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        // Base - Bridge styling
        "w-full text-left px-5 py-4 relative",
        "transition-all duration-[var(--bridge-transition-normal)]",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bridge-accent)] focus-visible:ring-inset",
        "border-b border-[var(--bridge-border-subtle)]",

        // Background states
        isSelected
          ? "bg-[var(--bridge-accent-wash)]"
          : "bg-[var(--bridge-bg-elevated)] hover:bg-[var(--bridge-bg-hover)]"
      )}
    >
      <div className="flex gap-4">
        {/* Left: Type icon with unread indicator */}
        <div className="relative shrink-0 mt-0.5">
          <div
            className={cn(
              "flex items-center justify-center size-10 rounded-[var(--bridge-radius-md)]",
              isUnread
                ? "bg-[var(--bridge-accent-muted)]"
                : "bg-[var(--bridge-bg-surface)]"
            )}
          >
            <TypeIcon
              className={cn(
                "size-5",
                isUnread
                  ? "text-[var(--bridge-accent)]"
                  : "text-[var(--bridge-text-muted)]"
              )}
            />
          </div>
          {/* Unread dot */}
          {isUnread && (
            <span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-[var(--bridge-accent)] ring-2 ring-[var(--bridge-bg-elevated)]" />
          )}
        </div>

        {/* Right: Content */}
        <div className="flex-1 min-w-0 space-y-1">
          {/* Row 1: Type label + Time */}
          <div className="flex items-center justify-between gap-2">
            <span
              className={cn(
                "text-[var(--bridge-font-size-xs)] font-medium uppercase tracking-wide",
                isUnread
                  ? "text-[var(--bridge-accent)]"
                  : "text-[var(--bridge-text-subtle)]"
              )}
            >
              {typeLabel}
            </span>
            <span
              className={cn(
                "text-[var(--bridge-font-size-xs)] shrink-0 tabular-nums",
                urgencyLevel === "overdue"
                  ? "text-[var(--bridge-error)] font-medium"
                  : urgencyLevel === "urgent"
                    ? "text-[var(--bridge-warning)] font-medium"
                    : "text-[var(--bridge-text-subtle)]"
              )}
            >
              {formatTimestamp(item.created_at, item)}
            </span>
          </div>

          {/* Row 2: Title */}
          <div
            className={cn(
              "text-[var(--bridge-font-size-base)] truncate leading-snug",
              isUnread
                ? "font-semibold text-[var(--bridge-text-primary)]"
                : "font-medium text-[var(--bridge-text-secondary)]"
            )}
          >
            {item.title}
          </div>

          {/* Row 3: Preview */}
          {item.preview && (
            <div
              className={cn(
                "text-[var(--bridge-font-size-sm)] text-[var(--bridge-text-muted)] truncate"
              )}
            >
              {item.preview}
            </div>
          )}

          {/* Row 4: Project context (if applicable) */}
          {item.project_name && (
            <div className="text-[var(--bridge-font-size-xs)] text-[var(--bridge-text-subtle)] truncate">
              {item.project_name}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}
