"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { MeetingCard } from "./MeetingCard";
import type { Meeting } from "../types";
import { cn } from "@/lib/utils";

interface WeekViewProps {
  meetings: Meeting[];
  onMeetingClick: (meeting: Meeting) => void;
  onDayClick?: (date: string) => void;
}

export function WeekView({ meetings, onMeetingClick, onDayClick }: WeekViewProps) {
  const [weekOffset, setWeekOffset] = useState(0);

  const getWeekDates = (offset: number) => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - dayOfWeek + offset * 7);
    startOfWeek.setHours(0, 0, 0, 0);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      days.push(date);
    }
    return days;
  };

  const weekDates = getWeekDates(weekOffset);
  const isCurrentWeek = weekOffset === 0;

  const getMeetingsForDay = (date: Date) => {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return meetings
      .filter((m) => m.startTime >= startOfDay && m.startTime <= endOfDay)
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  };

  const formatDateHeader = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    }).format(date);
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
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
      {/* Week Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setWeekOffset((prev) => prev - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-center">
          <div className="text-sm font-semibold">
            {formatDateHeader(weekDates[0])} - {formatDateHeader(weekDates[6])}
          </div>
          {!isCurrentWeek && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground"
              onClick={() => setWeekOffset(0)}
            >
              This Week
            </Button>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setWeekOffset((prev) => prev + 1)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Week Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-4">
        {weekDates.map((date, idx) => {
          const dayMeetings = getMeetingsForDay(date);
          const today = isToday(date);

          return (
            <div
              key={idx}
              className={cn(
                "border rounded-lg p-3 min-h-[200px]",
                today && "border-primary bg-primary/5"
              )}
            >
              {/* Day Header */}
              <div className="mb-3 pb-2 border-b">
                <div
                  className={cn(
                    "text-sm font-semibold",
                    today && "text-primary"
                  )}
                >
                  {formatDateHeader(date)}
                </div>
                {dayMeetings.length > 0 && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {dayMeetings.length} {dayMeetings.length === 1 ? "meeting" : "meetings"}
                  </div>
                )}
              </div>

              {/* Meetings */}
              <div className="space-y-2">
                {dayMeetings.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    No meetings
                  </p>
                ) : (
                  <>
                    {dayMeetings.slice(0, 3).map((meeting) => (
                      <div
                        key={meeting.id}
                        className="text-xs p-2 bg-primary/10 hover:bg-primary/20 rounded cursor-pointer transition-colors"
                        onClick={() => onMeetingClick(meeting)}
                      >
                        <div className="font-medium text-primary text-[10px] mb-0.5">
                          {formatMeetingTime(meeting.startTime)}
                        </div>
                        <div className="font-medium truncate">{meeting.title}</div>
                        <div className="text-muted-foreground truncate mt-0.5">
                          {meeting.clientName}
                        </div>
                      </div>
                    ))}
                    {dayMeetings.length > 3 && onDayClick && (
                      <button
                        className="w-full text-xs text-center py-2 text-muted-foreground hover:text-foreground transition-colors"
                        onClick={() => onDayClick(formatDateKey(date))}
                      >
                        See all {dayMeetings.length} meetings →
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

