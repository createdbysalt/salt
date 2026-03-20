"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import {
  MessageSquare,
  Calendar,
  Receipt,
  Flag,
  FileText,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@repo/utils";
import type { InboxItem, InboxItemType } from "../types";

const TYPE_ICONS: Record<InboxItemType, typeof MessageSquare> = {
  message: MessageSquare,
  meeting: Calendar,
  invoice: Receipt,
  milestone: Flag,
  proposal: FileText,
  alert: AlertTriangle,
};

const TYPE_COLORS: Record<InboxItemType, string> = {
  message: "text-primary",
  meeting: "text-info",
  invoice: "text-success",
  milestone: "text-warning",
  proposal: "text-secondary",
  alert: "text-destructive",
};

interface InboxItemRowProps {
  item: InboxItem;
}

/**
 * InboxItemRow - Single inbox item display
 *
 * Shows:
 * - Type icon with color
 * - Client/Project badge
 * - Title and subtitle
 * - Time ago
 */
export function InboxItemRow({ item }: InboxItemRowProps) {
  const Icon = TYPE_ICONS[item.type];
  const iconColor = TYPE_COLORS[item.type];

  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-lg",
        "hover:bg-accent/50 transition-colors",
        "group cursor-pointer"
      )}
    >
      {/* Type Icon */}
      <div className={cn("shrink-0", iconColor)}>
        <Icon className="h-4 w-4" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {/* Client/Project Badge */}
          {(item.clientName || item.projectName) && (
            <span className="text-xs font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">
              {item.clientName || item.projectName}
            </span>
          )}
          {/* Title */}
          <span className="font-medium truncate">{item.title}</span>
        </div>
        {/* Subtitle */}
        {item.subtitle && (
          <p className="text-sm text-muted-foreground truncate mt-0.5">
            {item.subtitle}
          </p>
        )}
      </div>

      {/* Time */}
      <span className="text-xs text-muted-foreground shrink-0">
        {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
      </span>
    </Link>
  );
}
