"use client";

import * as React from "react";
import { Clock, Sun, Calendar, ArrowRight } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  Button,
} from "@repo/ui";
import { snoozeItem } from "../actions";
import type { InboxItem } from "../types";

// =============================================================================
// SNOOZE OPTIONS
// =============================================================================

interface SnoozeOption {
  id: string;
  label: string;
  sublabel?: string;
  icon: React.ElementType;
  getDate: () => Date;
}

function getSnoozeOptions(): SnoozeOption[] {
  const now = new Date();

  return [
    {
      id: "1hour",
      label: "1 hour",
      icon: Clock,
      getDate: () => {
        const date = new Date();
        date.setHours(date.getHours() + 1);
        return date;
      },
    },
    {
      id: "later_today",
      label: "Later today",
      sublabel: formatTime(getLaterToday()),
      icon: Clock,
      getDate: getLaterToday,
    },
    {
      id: "tomorrow",
      label: "Tomorrow",
      sublabel: "9:00 AM",
      icon: Sun,
      getDate: getTomorrow,
    },
    {
      id: "this_weekend",
      label: "This weekend",
      sublabel: "Sat 10:00 AM",
      icon: Calendar,
      getDate: getThisWeekend,
    },
    {
      id: "next_week",
      label: "Next week",
      sublabel: "Mon 9:00 AM",
      icon: ArrowRight,
      getDate: getNextWeek,
    },
  ];
}

// =============================================================================
// DATE HELPERS
// =============================================================================

function getLaterToday(): Date {
  const date = new Date();
  // Set to 3 hours from now, or 5 PM if that's sooner
  const threeHoursLater = new Date(date.getTime() + 3 * 60 * 60 * 1000);
  const fivePM = new Date(date);
  fivePM.setHours(17, 0, 0, 0);

  // If it's already past 5 PM, set to 3 hours from now
  if (date.getHours() >= 17) {
    return threeHoursLater;
  }

  // Return whichever is sooner
  return threeHoursLater < fivePM ? threeHoursLater : fivePM;
}

function getTomorrow(): Date {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(9, 0, 0, 0);
  return date;
}

function getThisWeekend(): Date {
  const date = new Date();
  const dayOfWeek = date.getDay();
  // Days until Saturday (6)
  const daysUntilSaturday = (6 - dayOfWeek + 7) % 7 || 7;
  date.setDate(date.getDate() + daysUntilSaturday);
  date.setHours(10, 0, 0, 0);
  return date;
}

function getNextWeek(): Date {
  const date = new Date();
  const dayOfWeek = date.getDay();
  // Days until next Monday (1)
  const daysUntilMonday = (8 - dayOfWeek) % 7 || 7;
  date.setDate(date.getDate() + daysUntilMonday);
  date.setHours(9, 0, 0, 0);
  return date;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDayName(date: Date): string {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.toDateString() === today.toDateString()) {
    return "Today";
  }
  if (date.toDateString() === tomorrow.toDateString()) {
    return "Tomorrow";
  }
  return date.toLocaleDateString("en-US", { weekday: "long" });
}

// =============================================================================
// COMPONENT
// =============================================================================

interface SnoozeDropdownProps {
  item: InboxItem;
  onSnooze?: (item: InboxItem, until: Date) => void;
  children: React.ReactNode;
}

export function SnoozeDropdown({ item, onSnooze, children }: SnoozeDropdownProps) {
  const [isLoading, setIsLoading] = React.useState(false);
  const options = getSnoozeOptions();

  const handleSnooze = async (option: SnoozeOption) => {
    setIsLoading(true);
    const until = option.getDate();

    try {
      const result = await snoozeItem({
        sourceTable: item.source_table,
        sourceId: item.source_id,
        until,
      });

      if (result.success) {
        onSnooze?.(item, until);
      } else {
        console.error("Failed to snooze:", result.error);
      }
    } catch (error) {
      console.error("Error snoozing item:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={isLoading}>
        {children}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[200px]">
        <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
          Snooze until
        </DropdownMenuLabel>
        {options.map((option) => (
          <DropdownMenuItem
            key={option.id}
            onClick={() => handleSnooze(option)}
            className="flex items-center gap-3"
          >
            <option.icon className="size-4 text-muted-foreground shrink-0" />
            <span className="flex-1">{option.label}</span>
            {option.sublabel && (
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {option.sublabel}
              </span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
