"use client";

import * as React from "react";
import { cn } from "@repo/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui";
import type { InboxItem } from "../types";

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
      if (untilHours >= 1) return `${untilHours}h`;
      return `${untilMins}m`;
    }
  }

  // Standard relative time - shorter format
  if (diffMins < 1) return "now";
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays === 1) return "1d";
  if (diffDays < 7) return `${diffDays}d`;
  return `${Math.floor(diffDays / 7)}w`;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function isItemUnread(item: InboxItem): boolean {
  if (item.metadata?.is_read === true) return false;
  if (item.metadata?.is_read === false) return true;
  return item.urgency === "unread";
}

// Get urgency level for visual indicator
function getUrgencyLevel(item: InboxItem): "overdue" | "urgent" | "normal" {
  if (item.urgency === "overdue") return "overdue";
  if (item.urgency === "today" || item.urgency === "alert") return "urgent";

  // Check metadata for additional urgency signals
  const meta = item.metadata as { status?: string; days_overdue?: number; days_until_due?: number };
  if (meta?.status === "overdue" || meta?.days_overdue) return "overdue";
  if (meta?.days_until_due !== undefined && meta.days_until_due <= 1) return "urgent";

  return "normal";
}

// Get WHO - the primary person/entity name
function getWhoName(item: InboxItem): string {
  if (item.type === "message") return item.title; // Sender name
  return item.person_name || item.title;
}

// Get WHAT - the subject/title of the notification
function getWhatTitle(item: InboxItem): string {
  if (item.type === "message") {
    return item.subtitle || "New message";
  }
  return item.title;
}

// Get preview/snippet text
function getPreviewText(item: InboxItem): string | null {
  // For messages, show the preview
  if (item.type === "message" && item.preview) {
    return item.preview;
  }

  // For invoices/proposals, show amount
  const meta = item.metadata as { amount?: number; currency?: string; status?: string };
  if (meta?.amount) {
    const formatted = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: meta.currency || "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(meta.amount);
    return formatted;
  }

  // For milestones, show preview or status
  if (item.type === "milestone") {
    return item.preview || null;
  }

  // For meetings, show preview
  if (item.type === "meeting") {
    return item.preview || null;
  }

  return item.preview || null;
}

// =============================================================================
// COMPONENT
// =============================================================================

interface InboxItemCardProps {
  item: InboxItem;
  isSelected?: boolean;
  onClick?: () => void;
}

export function InboxItemCard({ item, isSelected, onClick }: InboxItemCardProps) {
  const isUnread = isItemUnread(item);
  const urgencyLevel = getUrgencyLevel(item);
  const whoName = getWhoName(item);
  const whatTitle = getWhatTitle(item);
  const previewText = getPreviewText(item);

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        // Base styles
        "w-full text-left px-4 py-3 relative",
        "transition-colors duration-100",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset",

        // Background states
        isSelected
          ? "bg-accent"
          : "bg-transparent hover:bg-accent/50"
      )}
    >
      <div className="flex gap-3">
        {/* Left: Unread indicator + Avatar */}
        <div className="flex items-start gap-2 pt-0.5">
          {/* Unread dot */}
          <div className="w-1.5 pt-1.5 shrink-0">
            {isUnread && (
              <span className="block size-1.5 rounded-full bg-primary" />
            )}
          </div>

          {/* Avatar */}
          <Avatar className="size-8 shrink-0">
            <AvatarImage src={undefined} alt={whoName} />
            <AvatarFallback className="text-xs font-medium">
              {getInitials(whoName)}
            </AvatarFallback>
          </Avatar>
        </div>

        {/* Right: Content */}
        <div className="flex-1 min-w-0 space-y-0.5">
          {/* Row 1: WHO + Time */}
          <div className="flex items-center justify-between gap-2">
            <span
              className={cn(
                "text-sm truncate",
                isUnread ? "font-semibold text-foreground" : "font-medium text-foreground"
              )}
            >
              {whoName}
            </span>
            <span
              className={cn(
                "text-xs shrink-0 tabular-nums",
                urgencyLevel === "overdue"
                  ? "text-destructive font-medium"
                  : urgencyLevel === "urgent"
                    ? "text-warning font-medium"
                    : "text-muted-foreground"
              )}
            >
              {formatTimestamp(item.created_at, item)}
            </span>
          </div>

          {/* Row 2: WHAT (subject/title) */}
          <div
            className={cn(
              "text-sm truncate",
              isUnread ? "text-foreground" : "text-muted-foreground"
            )}
          >
            {whatTitle}
          </div>

          {/* Row 3: Preview snippet (optional) */}
          {previewText && (
            <div className="text-xs text-muted-foreground truncate">
              {previewText}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}
