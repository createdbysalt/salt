"use client";

import { Badge } from "@/app/_components/ui/badge";
import { Button } from "@/app/_components/ui/button";
import { Card } from "@/app/_components/ui/card";
import { safeHttpUrl } from "@/app/_lib/security/safe-url";
import { toast } from "sonner";
import { Video, Clock } from "lucide-react";
import type { Meeting } from "../types";
import { cn } from "@repo/utils";

interface MeetingCardProps {
  meeting: Meeting;
  onClick?: () => void;
  compact?: boolean;
}

const typeColors = {
  discovery: "border-l-blue-500",
  "check-in": "border-l-green-500",
  review: "border-l-purple-500",
  kickoff: "border-l-orange-500",
  other: "border-l-gray-500",
};

const statusLabels = {
  live: "Live",
  upcoming: "Upcoming",
  scheduled: "Scheduled",
  completed: "Completed",
  cancelled: "Cancelled",
  "no-show": "No-show",
};

const statusColors = {
  live: "bg-green-500 animate-pulse",
  upcoming: "bg-orange-500",
  scheduled: "bg-blue-500",
  completed: "bg-gray-400",
  cancelled: "bg-red-500",
  "no-show": "bg-orange-600",
};

function getTimeUntil(date: Date): string {
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);

  if (minutes < 0) return "Started";
  if (minutes < 60) return `Starting in ${minutes}m`;
  if (hours < 24) return `Starting in ${hours}h ${minutes % 60}m`;
  return `Starting in ${Math.floor(hours / 24)}d`;
}

export function MeetingCard({ meeting, onClick, compact = false }: MeetingCardProps) {
  const isLive = meeting.status === "live";
  const isUpcoming = meeting.status === "upcoming";
  const isCompleted = meeting.status === "completed";

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(date);
  };

  return (
    <Card
      className={cn(
        "p-4 cursor-pointer border-l-4 rounded-3xl shadow-sm hover:shadow-md transition-shadow bg-card/80 hover:bg-card",
        typeColors[meeting.type],
        isCompleted && "opacity-60"
      )}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (!onClick) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-2">
          {/* Status Badge */}
          {(isLive || isUpcoming) && (
            <div className="flex items-center gap-2">
              <div className={cn("h-2 w-2 rounded-full", statusColors[meeting.status])} />
              <span className="text-xs font-semibold uppercase text-muted-foreground">
                {isLive ? "Happening Now" : getTimeUntil(meeting.startTime)}
              </span>
            </div>
          )}

          {/* Title */}
          <h3 className="font-semibold text-base leading-snug">{meeting.title}</h3>

          {/* Client & Project */}
          <div className="text-sm text-muted-foreground">
            <span className="font-medium">{meeting.clientName}</span>
            {meeting.projectName && <span> • {meeting.projectName}</span>}
          </div>

          {/* Time */}
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-3 w-3 text-muted-foreground" />
            <span>
              {formatTime(meeting.startTime)} - {formatTime(meeting.endTime)}
            </span>
          </div>

          {/* Meeting Link (if live or upcoming) */}
          {(isLive || isUpcoming) && meeting.meetingUrl && (
            <Button
              size="sm"
              className="mt-2"
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
              <Video className="h-3 w-3 mr-2" />
              {isLive ? "Join Meeting" : "View Link"}
            </Button>
          )}
        </div>

        {/* Type Badge */}
        <Badge variant="outline" className="capitalize shrink-0">
          {meeting.type}
        </Badge>
      </div>
    </Card>
  );
}

