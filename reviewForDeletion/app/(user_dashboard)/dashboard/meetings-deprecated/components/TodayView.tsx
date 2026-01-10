"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { safeHttpUrl } from "@/libs/safe-url";
import type { Meeting } from "../types";
import { Sun, Search, CheckCircle2, Eye, Rocket, MoreHorizontal, Video, MapPin, Users as UsersIcon, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface TodayViewProps {
  meetings: Meeting[];
  onMeetingClick: (meeting: Meeting) => void;
}

const meetingTypeIcons = {
  discovery: Search,
  "check-in": CheckCircle2,
  review: Eye,
  kickoff: Rocket,
  other: MoreHorizontal,
};

// Use design system colors
const meetingTypeBadges = {
  discovery: "bg-primary/10 text-primary border-primary/20",
  "check-in": "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  review: "bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/20",
  kickoff: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  other: "bg-muted text-muted-foreground border-border",
};

export function TodayView({ meetings, onMeetingClick }: TodayViewProps) {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

  const [currentTime, setCurrentTime] = useState(now);

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  const todayMeetings = meetings
    .filter((m) => m.startTime >= startOfDay && m.startTime < endOfDay)
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

  const dateString = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(now);

  const formatTimeSimple = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(date).replace(" ", " ");
  };

  const formatTimeRange = (start: Date, end: Date) => {
    return `${formatTimeSimple(start)} → ${formatTimeSimple(end)}`;
  };

  const formatDuration = (start: Date, end: Date) => {
    const diff = end.getTime() - start.getTime();
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const isLive = (meeting: Meeting) => meeting.status === "live";
  const isUpcoming = (meeting: Meeting) => 
    meeting.status === "upcoming" || (meeting.status === "scheduled" && meeting.startTime > now);
  const isCompleted = (meeting: Meeting) => meeting.status === "completed";

  // Calculate dynamic time range based on actual meetings
  const getTimeRange = () => {
    if (todayMeetings.length === 0) {
      return { startHour: 8, endHour: 22 }; // Default fallback
    }

    // Find earliest and latest meeting hours (rounded to whole hours)
    const meetingHours = todayMeetings.map(m => m.startTime.getHours());
    const firstMeetingHour = Math.min(...meetingHours);
    const lastMeetingHour = Math.max(...todayMeetings.map(m => m.endTime.getHours()));

    return {
      startHour: firstMeetingHour,
      endHour: lastMeetingHour + 1, // Include the hour after last meeting ends
    };
  };

  const { startHour, endHour } = getTimeRange();
  const hourCount = endHour - startHour;

  // Generate hour markers for the dynamic range
  const hourMarkers = Array.from({ length: hourCount }, (_, i) => {
    const hour = startHour + i;
    const date = new Date(now);
    date.setHours(hour, 0, 0, 0);
    return date;
  });

  const formatHourLabel = (date: Date) => {
    const hours = date.getHours();
    const isPM = hours >= 12;
    const displayHour = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
    return `${displayHour} ${isPM ? 'PM' : 'AM'}`;
  };

  // Simpler approach: use direct pixel positioning
  // Opening fade dots section = 76px (calculated from: 5 dots × 4px + 4 gaps × 12px + pb-2 8px = 20+48+8)
  const OPENING_DOTS_HEIGHT = 76;
  // Each hour = 160px total
  const PIXELS_PER_HOUR = 160;
  const MINUTES_PER_PIXEL = PIXELS_PER_HOUR / 60; // ~2.67px per minute

  // Calculate position based on time
  const calculatePosition = (time: Date) => {
    const timeHours = time.getHours() + time.getMinutes() / 60;
    const relativeHours = timeHours - startHour;
    const relativeMinutes = relativeHours * 60;
    
    // Position = opening fade dots + (minutes from start × pixels per minute)
    return OPENING_DOTS_HEIGHT + Math.round(relativeMinutes * MINUTES_PER_PIXEL);
  };

  const currentTimePosition = calculatePosition(currentTime);
  // Show current time indicator if it's within the timeline (including partial hours)
  const currentTimeInMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
  const startTimeInMinutes = startHour * 60;
  const endTimeInMinutes = endHour * 60;
  const showCurrentTimeIndicator = currentTimeInMinutes >= startTimeInMinutes && currentTimeInMinutes < endTimeInMinutes;

  // Calculate overlapping meeting layout
  const calculateMeetingLayout = () => {
    const sortedMeetings = [...todayMeetings].sort((a, b) => 
      a.startTime.getTime() - b.startTime.getTime()
    );

    const layout: Array<{
      meeting: Meeting;
      column: number;
      totalColumns: number;
    }> = [];

    sortedMeetings.forEach((meeting) => {
      // Find meetings that overlap with this one
      const overlapping = layout.filter((item) => {
        const itemEnd = item.meeting.endTime.getTime();
        const meetingStart = meeting.startTime.getTime();
        return itemEnd > meetingStart;
      });

      // Find which columns are already taken
      const takenColumns = overlapping.map((item) => item.column);
      
      // Find the first available column
      let column = 0;
      while (takenColumns.includes(column)) {
        column++;
      }

      // Calculate total columns needed for this time slot
      const totalColumns = Math.max(column + 1, ...overlapping.map(item => item.totalColumns));

      // Update total columns for all overlapping meetings
      overlapping.forEach((item) => {
        item.totalColumns = totalColumns;
      });

      layout.push({ meeting, column, totalColumns });
    });

    return layout;
  };

  const meetingLayout = calculateMeetingLayout();

  if (todayMeetings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center border rounded-lg bg-card">
        <Sun className="h-10 w-10 mb-4 text-muted-foreground" />
        <h2 className="text-xl font-semibold mb-2">No meetings scheduled today</h2>
        <p className="text-muted-foreground">Enjoy your focus time!</p>
      </div>
    );
  }

  if (todayMeetings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center border rounded-lg bg-card">
        <Sun className="h-10 w-10 mb-4 text-muted-foreground" />
        <h2 className="text-xl font-semibold mb-2">No meetings scheduled today</h2>
        <p className="text-muted-foreground">Enjoy your focus time!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Date Header */}
      <div className="border-b pb-3">
        <h2 className="text-2xl font-semibold">{dateString}</h2>
        <p className="text-muted-foreground mt-1">
          {todayMeetings.length} {todayMeetings.length === 1 ? "meeting" : "meetings"}
        </p>
      </div>

      {/* Timeline */}
      <div className="relative flex gap-6">
        {/* Time labels and spacer dots column */}
        <div className="w-16 flex-shrink-0 flex flex-col items-center">
          {/* Fade dots at top */}
          <div className="flex flex-col items-center gap-3 pb-2">
            <div className="h-1 w-1 rounded-full bg-border opacity-10" />
            <div className="h-1 w-1 rounded-full bg-border opacity-20" />
            <div className="h-1 w-1 rounded-full bg-border opacity-40" />
            <div className="h-1 w-1 rounded-full bg-border opacity-60" />
            <div className="h-1 w-1 rounded-full bg-border opacity-80" />
          </div>
          
          {/* Hour labels with spacer dots below each */}
          {hourMarkers.map((hourTime, index) => (
            <div key={index} className="flex flex-col items-center">
              {/* Time label */}
              <div className="text-sm font-medium text-muted-foreground py-2 px-3 whitespace-nowrap">
                {formatHourLabel(hourTime)}
              </div>

              {/* Spacer dots after the time */}
              <div className="flex flex-col items-center gap-3 pb-2">
                <div className="h-1 w-1 rounded-full bg-border" />
                <div className="h-1 w-1 rounded-full bg-border" />
                <div className="h-1 w-1 rounded-full bg-border" />
                <div className="h-1 w-1 rounded-full bg-border" />
                <div className="h-1 w-1 rounded-full bg-border" />
                <div className="h-1 w-1 rounded-full bg-border" />
                <div className="h-1 w-1 rounded-full bg-border" />
                <div className="h-1 w-1 rounded-full bg-border" />
              </div>

              {/* Fade dots at bottom (only after last hour) */}
              {index === hourMarkers.length - 1 && (
                <div className="flex flex-col items-center gap-3 pb-2">
                  <div className="h-1 w-1 rounded-full bg-border opacity-80" />
                  <div className="h-1 w-1 rounded-full bg-border opacity-60" />
                  <div className="h-1 w-1 rounded-full bg-border opacity-40" />
                  <div className="h-1 w-1 rounded-full bg-border opacity-20" />
                  <div className="h-1 w-1 rounded-full bg-border opacity-10" />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Meetings positioned on timeline */}
        <div className="relative flex-1">
          {meetingLayout.map(({ meeting, column, totalColumns }) => {
            const Icon = meetingTypeIcons[meeting.type];
            const live = isLive(meeting);
            const upcoming = isUpcoming(meeting);
            const completed = isCompleted(meeting);

            // Calculate exact position based on meeting start time
            const topPosition = calculatePosition(meeting.startTime);
            
            // Calculate height based on meeting duration
            const durationMinutes = (meeting.endTime.getTime() - meeting.startTime.getTime()) / 60000;
            const cardHeight = Math.round(durationMinutes * MINUTES_PER_PIXEL);

            // Calculate width and position based on column layout
            const widthPercent = 100 / totalColumns;
            const leftPercent = (column * 100) / totalColumns;
            
            // Smart sizing based on card dimensions
            const isNarrow = widthPercent < 50;
            const isShort = cardHeight < 80; // < 30 min
            const isMedium = cardHeight >= 80 && cardHeight < 160; // 30-60 min
            const isTall = cardHeight >= 160; // 60+ min

            return (
              <div
                key={meeting.id}
                onClick={() => onMeetingClick(meeting)}
                className={cn(
                  "absolute rounded-lg text-left cursor-pointer border border-border bg-card transition-colors hover:bg-muted/40",
                  completed && "opacity-60",
                  isNarrow ? "p-3" : isTall ? "p-6" : "p-4",
                )}
                style={{ 
                  top: `${topPosition}px`,
                  minHeight: `${cardHeight}px`,
                  left: `${leftPercent}%`,
                  width: `calc(${widthPercent}% - ${totalColumns > 1 ? '4px' : '0px'})`,
                }}
              >
                <div className="flex flex-col h-full gap-3">
                  {/* Client Name + Badges */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className={cn(
                      "font-semibold leading-tight",
                      isShort ? "text-sm line-clamp-1" : "text-lg line-clamp-2"
                    )}>
                      {meeting.title}
                    </h3>
                    
                    {/* Type badge inline with title */}
                    {!isShort && (
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "uppercase text-xs font-semibold tracking-wide",
                          meetingTypeBadges[meeting.type]
                        )}
                      >
                        {meeting.type === "check-in" ? "Check-in" : meeting.type}
                      </Badge>
                    )}

                    {/* Project name badge */}
                    {!isShort && meeting.projectName && (
                      <Badge 
                        variant="outline"
                        className="text-xs font-medium bg-muted/50"
                      >
                        {meeting.projectName}
                      </Badge>
                    )}
                    
                    {/* Live indicator */}
                    {live && (
                      <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse ml-auto" />
                    )}
                  </div>

                  {/* Time */}
                  <div className="text-sm text-muted-foreground">
                    {formatTimeSimple(meeting.startTime)} – {formatTimeSimple(meeting.endTime)}
                  </div>

                  {/* Bottom row: Action buttons only */}
                  <div className="flex items-center justify-end gap-2 mt-auto">

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                      {/* Get Ready button for upcoming meetings */}
                      {!completed && !live && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            onMeetingClick(meeting);
                          }}
                        >
                          Get Ready
                        </Button>
                      )}

                      {/* Join Meeting Button */}
                      {meeting.meetingUrl && !completed && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="shrink-0 gap-1.5"
                          onClick={(e) => {
                            e.stopPropagation();
                            const safeUrl = safeHttpUrl(meeting.meetingUrl);
                            if (!safeUrl) {
                              toast.error("Invalid meeting link");
                              return;
                            }
                            const newWindow = window.open(safeUrl, "_blank", "noopener,noreferrer");
                            if (newWindow) newWindow.opener = null;
                          }}
                        >
                          {live ? "Join Now" : "Join Meeting"}
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                      )}

                      {/* For completed meetings: View Notes only */}
                      {completed && meeting.notes && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="shrink-0 gap-1.5"
                          onClick={(e) => {
                            e.stopPropagation();
                            onMeetingClick(meeting);
                          }}
                        >
                          View Notes
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Current time indicator */}
          {showCurrentTimeIndicator && (
            <div
              className="absolute -left-[88px] right-0 flex items-center pointer-events-none z-30"
              style={{ top: `${currentTimePosition}px` }}
            >
              <div className="text-xs font-semibold text-red-500 w-16 text-center">
                {formatTimeSimple(currentTime)}
              </div>
              <div className="flex-1 h-[1px] bg-red-500 ml-6" />
            </div>
          )}

          {/* Spacer to ensure full timeline height */}
          <div style={{ height: `${hourCount * 160}px` }} />
        </div>
      </div>
    </div>
  );
}

