"use client";

import { Button } from "@/app/_components/ui/button";
import { Badge } from "@/app/_components/ui/badge";
import { Separator } from "@/app/_components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/_components/ui/card";
import { safeHttpUrl } from "@/app/_lib/security/safe-url";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Copy,
  Video,
  Edit,
  Trash,
  CheckCircle2,
  FileText,
} from "lucide-react";
import type { Meeting } from "../types";
import { toast } from "sonner";
import { cn } from "@repo/utils";

interface MeetingDetailContentProps {
  meeting: Meeting;
  onClose?: () => void;
}

const typeDotColors: Record<Meeting["type"], string> = {
  discovery: "bg-blue-500",
  "check-in": "bg-green-500",
  review: "bg-purple-500",
  kickoff: "bg-orange-500",
  other: "bg-gray-500",
};

const locationLabels: Record<Meeting["location"], string> = {
  "google-meet": "Google Meet",
  zoom: "Zoom",
  phone: "Phone Call",
  "in-person": "In Person",
  custom: "Custom",
};

export function MeetingDetailContent({ meeting, onClose }: MeetingDetailContentProps) {
  const formatDateTime = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(date);
  };

  const formatDuration = () => {
    const diff = meeting.endTime.getTime() - meeting.startTime.getTime();
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const copyMeetingLink = () => {
    if (!meeting.meetingUrl) return;
    navigator.clipboard.writeText(meeting.meetingUrl);
    toast.success("Meeting link copied to clipboard");
  };

  const isLive = meeting.status === "live";
  const isUpcoming =
    meeting.status === "upcoming" || meeting.startTime > new Date();
  const isCompleted = meeting.status === "completed";

  return (
    <Card className="border-0 shadow-none bg-transparent">
      <CardHeader>
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "h-2 w-2 rounded-full mt-2",
              typeDotColors[meeting.type]
            )}
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-2 min-w-0 flex-wrap">
              <CardTitle className="text-2xl truncate">{meeting.title}</CardTitle>
              <Badge variant="outline" className="capitalize mt-0.5">
                {meeting.type}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1 truncate">
              {meeting.clientName}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Date & Time */}
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="flex-1">
              <div className="font-medium">
                {formatDateTime(meeting.startTime)}
              </div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="flex-1">
              <div className="font-medium">{formatDuration()}</div>
              <div className="text-sm text-muted-foreground">
                {new Intl.DateTimeFormat("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                }).format(meeting.startTime)}{" "}
                -{" "}
                {new Intl.DateTimeFormat("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                }).format(meeting.endTime)}
              </div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="flex-1">
              <div className="font-medium">
                {locationLabels[meeting.location]}
              </div>
            </div>
          </div>
        </div>

        {/* Meeting Link */}
        {meeting.meetingUrl && (
          <>
            <Separator />
            <div className="space-y-3">
              {isLive ? (
                <Button
                  className="w-full"
                  size="lg"
                  onClick={() => {
                    const safeUrl = safeHttpUrl(meeting.meetingUrl);
                    if (!safeUrl) {
                      toast.error("Invalid meeting link");
                      return;
                    }
                    const newWindow = window.open(safeUrl, "_blank", "noopener,noreferrer");
                    if (newWindow) newWindow.opener = null;
                  }}
                >
                  <Video className="h-5 w-5 mr-2" />
                  Join Meeting Now
                </Button>
              ) : isUpcoming ? (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    const safeUrl = safeHttpUrl(meeting.meetingUrl);
                    if (!safeUrl) {
                      toast.error("Invalid meeting link");
                      return;
                    }
                    const newWindow = window.open(safeUrl, "_blank", "noopener,noreferrer");
                    if (newWindow) newWindow.opener = null;
                  }}
                >
                  <Video className="h-4 w-4 mr-2" />
                  Open Meeting Link
                </Button>
              ) : null}
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={copyMeetingLink}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy Meeting Link
              </Button>
            </div>
          </>
        )}

        {/* Attendees */}
        <Separator />
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Users className="h-4 w-4" />
            Attendees
          </div>
          <div className="space-y-2">
            {meeting.attendees.map((attendee, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between text-sm"
              >
                <span>{attendee.name}</span>
                <Badge variant="secondary" className="text-xs">
                  {attendee.role}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Meeting Agenda */}
        {meeting.agenda && (
          <>
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <FileText className="h-4 w-4" />
                Meeting Agenda
              </div>
              <div className="text-sm text-muted-foreground whitespace-pre-line bg-muted p-3 rounded-lg">
                {meeting.agenda}
              </div>
            </div>
          </>
        )}

        {/* Meeting Notes */}
        {meeting.notes && (
          <>
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <FileText className="h-4 w-4" />
                Meeting Notes
              </div>
              <div className="text-sm text-muted-foreground whitespace-pre-line bg-muted p-3 rounded-lg">
                {meeting.notes}
              </div>
            </div>
          </>
        )}

        {/* AI Placeholders */}
        {!isCompleted && (
          <>
            <Separator />
            <div className="space-y-3 bg-muted/50 p-4 rounded-lg">
              <div className="text-sm font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4" />
                AI Features (Coming Soon)
              </div>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Auto-transcribe conversation with Gemini</li>
                <li>• Extract action items automatically</li>
                <li>• Save insights to project knowledge base</li>
              </ul>
            </div>
          </>
        )}

        {/* Linked To */}
        <Separator />
        <div className="space-y-2">
          <div className="text-sm font-semibold">Linked To</div>
          <div className="text-sm text-muted-foreground space-y-1">
            <div>• Client: {meeting.clientName}</div>
            {meeting.projectName && (
              <div>• Project: {meeting.projectName}</div>
            )}
          </div>
        </div>

        {/* Actions */}
        <Separator />
        <div className="space-y-2">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => toast.info("Edit meeting feature coming soon")}
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit Meeting
          </Button>
          {!isCompleted && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                toast.success("Meeting marked as complete");
                if (onClose) onClose();
              }}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Mark as Complete
            </Button>
          )}
          <Button
            variant="outline"
            className="w-full text-destructive hover:text-destructive"
            onClick={() => toast.error("Cancel meeting feature coming soon")}
          >
            <Trash className="h-4 w-4 mr-2" />
            Cancel Meeting
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

