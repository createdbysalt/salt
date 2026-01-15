"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Meeting } from "../types";
import { cn } from "@repo/utils";

interface MonthViewProps {
  meetings: Meeting[];
  onMeetingClick: (meeting: Meeting) => void;
  onDayClick?: (date: string) => void;
}

export function MonthView({ meetings, onMeetingClick, onDayClick }: MonthViewProps) {
  const [monthOffset, setMonthOffset] = useState(0);

  const getMonthData = (offset: number) => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + offset;
    const date = new Date(year, month, 1);

    return {
      year: date.getFullYear(),
      month: date.getMonth(),
      firstDay: date.getDay(),
      daysInMonth: new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate(),
    };
  };

  const monthData = getMonthData(monthOffset);
  const isCurrentMonth = monthOffset === 0;

  const getDaysArray = () => {
    const days = [];
    // Add empty cells for days before month starts
    for (let i = 0; i < monthData.firstDay; i++) {
      days.push(null);
    }
    // Add actual days
    for (let i = 1; i <= monthData.daysInMonth; i++) {
      days.push(new Date(monthData.year, monthData.month, i));
    }
    // Pad with empty cells to complete the grid (6 rows x 7 cols = 42 cells)
    while (days.length < 42) {
      days.push(null);
    }
    return days;
  };

  const getMeetingCountForDay = (date: Date | null) => {
    if (!date) return 0;
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return meetings.filter(
      (m) => m.startTime >= startOfDay && m.startTime <= endOfDay
    ).length;
  };

  const getMeetingsForDay = (date: Date | null) => {
    if (!date) return [];
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return meetings
      .filter((m) => m.startTime >= startOfDay && m.startTime <= endOfDay)
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  };

  const isToday = (date: Date | null) => {
    if (!date) return false;
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const days = getDaysArray();
  const monthName = new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(new Date(monthData.year, monthData.month, 1));

  const getDensityColor = (count: number) => {
    if (count === 0) return "";
    if (count <= 2) return "bg-green-50 dark:bg-green-950/30";
    if (count <= 4) return "bg-yellow-50 dark:bg-yellow-950/30";
    return "bg-red-50 dark:bg-red-950/30";
  };

  const formatDateKey = (date: Date) => {
    return date.toISOString().split("T")[0]; // YYYY-MM-DD
  };

  const formatMeetingTime = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  };

  return (
    <div className="space-y-4">
      {/* Month Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setMonthOffset((prev) => prev - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-center">
          <div className="text-lg font-semibold">{monthName}</div>
          {!isCurrentMonth && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground"
              onClick={() => setMonthOffset(0)}
            >
              Today
            </Button>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setMonthOffset((prev) => prev + 1)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Calendar Grid */}
      <div className="border rounded-lg overflow-hidden">
        {/* Day Headers */}
        <div className="grid grid-cols-7 bg-muted">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div
              key={day}
              className="text-center text-sm font-semibold py-2 border-r last:border-r-0"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7">
          {days.map((date, idx) => {
            const meetingCount = getMeetingCountForDay(date);
            const dayMeetings = getMeetingsForDay(date);
            const today = isToday(date);

            return (
              <div
                key={idx}
                className={cn(
                  "min-h-[100px] border-r border-b p-2 last:border-r-0 relative group",
                  !date && "bg-muted/30",
                  date && "hover:bg-muted/30 transition-colors",
                  today && "bg-primary/5 border-primary",
                  getDensityColor(meetingCount)
                )}
              >
                {date && (
                  <>
                    <div
                      className={cn(
                        "text-sm font-medium mb-1",
                        today && "text-primary font-bold"
                      )}
                    >
                      {date.getDate()}
                    </div>
                    
                    {/* Meeting chips */}
                    <div className="space-y-1">
                      {dayMeetings.slice(0, 2).map((meeting) => (
                        <div
                          key={meeting.id}
                          className="text-[10px] px-1.5 py-0.5 bg-primary/10 hover:bg-primary/20 rounded cursor-pointer truncate transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            onMeetingClick(meeting);
                          }}
                          title={`${formatMeetingTime(meeting.startTime)} - ${meeting.title}`}
                        >
                          {formatMeetingTime(meeting.startTime)} {meeting.title}
                        </div>
                      ))}
                      {meetingCount > 2 && (
                        <button
                          className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onDayClick) {
                              onDayClick(formatDateKey(date));
                            }
                          }}
                        >
                          +{meetingCount - 2} more
                        </button>
                      )}
                    </div>

                    {/* Day click overlay - only active when no meetings to click */}
                    {meetingCount === 0 && onDayClick && (
                      <button
                        className="absolute inset-0 w-full h-full opacity-0 hover:opacity-10 bg-primary transition-opacity cursor-pointer"
                        onClick={() => onDayClick(formatDateKey(date))}
                        aria-label={`View agenda for ${formatDateKey(date)}`}
                      />
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground justify-center">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded bg-green-50 dark:bg-green-950/30 border" />
          <span>1-2 meetings</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded bg-yellow-50 dark:bg-yellow-950/30 border" />
          <span>3-4 meetings</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded bg-red-50 dark:bg-red-950/30 border" />
          <span>5+ meetings</span>
        </div>
      </div>
    </div>
  );
}

