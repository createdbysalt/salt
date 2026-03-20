"use client";

import {
  AlertCircle,
  MessageSquare,
  AlertTriangle,
  Calendar,
  Clock,
} from "lucide-react";
import { InboxItemRow } from "./InboxItemRow";
import type { InboxItem, InboxItemUrgency } from "../types";

const URGENCY_CONFIG: Record<
  InboxItemUrgency,
  { label: string; icon: typeof AlertCircle; className: string }
> = {
  overdue: {
    label: "Overdue",
    icon: AlertCircle,
    className: "text-destructive",
  },
  unread: {
    label: "Unread",
    icon: MessageSquare,
    className: "text-primary",
  },
  alert: {
    label: "Alerts",
    icon: AlertTriangle,
    className: "text-warning",
  },
  today: {
    label: "Today",
    icon: Calendar,
    className: "text-info",
  },
  pending: {
    label: "Pending",
    icon: Clock,
    className: "text-muted-foreground",
  },
};

// Order of urgency groups (most urgent first)
const URGENCY_ORDER: InboxItemUrgency[] = [
  "overdue",
  "unread",
  "alert",
  "today",
  "pending",
];

interface InboxContentProps {
  items: InboxItem[];
}

/**
 * InboxContent - Grouped inbox items by urgency
 *
 * Groups:
 * - 🔴 Overdue (invoices, milestones past due)
 * - 💬 Unread (new messages)
 * - ⚠️ Alerts (client health, SEO)
 * - 📅 Today (calendar events)
 * - 📄 Pending (proposals awaiting response)
 */
export function InboxContent({ items }: InboxContentProps) {
  // Group items by urgency
  const groupedItems = URGENCY_ORDER.reduce(
    (acc, urgency) => {
      acc[urgency] = items.filter((item) => item.urgency === urgency);
      return acc;
    },
    {} as Record<InboxItemUrgency, InboxItem[]>
  );

  // Filter out empty groups
  const nonEmptyGroups = URGENCY_ORDER.filter(
    (urgency) => groupedItems[urgency].length > 0
  );

  if (nonEmptyGroups.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      {nonEmptyGroups.map((urgency) => {
        const config = URGENCY_CONFIG[urgency];
        const Icon = config.icon;
        const groupItems = groupedItems[urgency];

        return (
          <div key={urgency}>
            {/* Group Header */}
            <div className="flex items-center gap-2 px-4 py-2">
              <Icon className={`h-4 w-4 ${config.className}`} />
              <span className={`text-sm font-semibold uppercase tracking-wide ${config.className}`}>
                {config.label}
              </span>
              <span className="text-xs text-muted-foreground">
                ({groupItems.length})
              </span>
            </div>

            {/* Group Items */}
            <div className="space-y-1">
              {groupItems.map((item) => (
                <InboxItemRow key={item.id} item={item} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
