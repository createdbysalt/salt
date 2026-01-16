"use client";

import { MeetingCard } from "./MeetingCard";
import type { Meeting } from "../types";
import { CalendarDays, X } from "lucide-react";
import { Button } from "@/app/_components/ui/button";
import { Badge } from "@/app/_components/ui/badge";

interface AgendaViewProps {
  meetings: Meeting[];
  onMeetingClick: (meeting: Meeting) => void;
  selectedDate?: string | null;
  onClearDateFilter?: () => void;
}

export function AgendaView({ meetings, onMeetingClick, selectedDate, onClearDateFilter }: AgendaViewProps) {
  // Filter meetings by selected date if provided
  const filteredMeetings = selectedDate
    ? meetings.filter((meeting) => {
        const meetingDate = meeting.startTime.toISOString().split("T")[0];
        return meetingDate === selectedDate;
      })
    : meetings;

  // Group meetings by date
  const groupedMeetings = filteredMeetings
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
    .reduce((groups, meeting) => {
      const dateKey = new Intl.DateTimeFormat("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      }).format(meeting.startTime);

      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(meeting);
      return groups;
    }, {} as Record<string, Meeting[]>);

  const isToday = (dateString: string) => {
    const today = new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(new Date());
    return dateString === today;
  };

  if (Object.keys(groupedMeetings).length === 0) {
    return (
      <div className="space-y-4">
        {/* Date filter badge */}
        {selectedDate && onClearDateFilter && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-sm">
              Showing: {new Intl.DateTimeFormat("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              }).format(new Date(selectedDate + "T00:00:00"))}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearDateFilter}
            >
              <X className="h-4 w-4 mr-1" />
              Clear filter
            </Button>
          </div>
        )}

        <div className="flex flex-col items-center justify-center py-12 text-center border rounded-lg bg-card">
          <CalendarDays className="h-10 w-10 mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">
            {selectedDate ? "No meetings on this date" : "No upcoming meetings"}
          </h2>
          <p className="text-muted-foreground">
            {selectedDate 
              ? "Try selecting a different date or clearing the filter." 
              : "Your schedule is clear. Time to focus or book new meetings!"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Date filter badge */}
      {selectedDate && onClearDateFilter && (
        <div className="flex items-center gap-2 pb-4 border-b">
          <Badge variant="secondary" className="text-sm">
            Showing: {new Intl.DateTimeFormat("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            }).format(new Date(selectedDate + "T00:00:00"))}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearDateFilter}
          >
            <X className="h-4 w-4 mr-1" />
            Clear filter
          </Button>
        </div>
      )}

      {Object.entries(groupedMeetings).map(([dateString, dateMeetings]) => (
        <div key={dateString} className="space-y-4">
          {/* Date Header */}
          <div className="sticky top-0 bg-background z-10 pb-3 border-b">
            <h2 className="text-lg font-semibold">
              {isToday(dateString) ? (
                <>
                  <span className="text-primary">TODAY</span> • {dateString}
                </>
              ) : (
                dateString
              )}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {dateMeetings.length} {dateMeetings.length === 1 ? "meeting" : "meetings"}
            </p>
          </div>

          {/* Meetings for this date */}
          <div className="space-y-3">
            {dateMeetings.map((meeting) => (
              <MeetingCard
                key={meeting.id}
                meeting={meeting}
                onClick={() => onMeetingClick(meeting)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

